import { Component, OnInit, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataSyncService, RawDataPoint } from '../../services/data-sync.service';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-researcher-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow-lg p-6 w-full mt-4">
      <div class="flex justify-between items-center mb-6 border-b pb-4">
        <h2 class="text-2xl font-bold text-slate-800"><i class="fa-solid fa-user-doctor text-blue-500 mr-2"></i> Clinical Records Hub</h2>
        <button (click)="loadSessions()" class="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded font-medium transition-colors">
          <i class="fa-solid fa-rotate-right mr-1"></i> Refresh Data
        </button>
      </div>

      <!-- Warning if empty -->
      <div *ngIf="sessions().length === 0 && !isLoading()" class="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
        <i class="fa-solid fa-folder-open text-4xl mb-3 text-slate-300"></i>
        <p>No recording sessions found in PostgreSQL.</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="text-center py-10 text-slate-500">
        <i class="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-blue-500"></i>
        <p>Downloading Clinical Metadata...</p>
      </div>

      <div class="overflow-x-auto" *ngIf="sessions().length > 0">
        <table class="w-full text-left text-sm text-slate-600 rounded-lg overflow-hidden border">
          <thead class="bg-slate-100 text-slate-700 uppercase">
            <tr>
              <th class="px-4 py-3">Patient</th>
              <th class="px-4 py-3">Date</th>
              <th class="px-4 py-3">Max Force</th>
              <th class="px-4 py-3">Reps</th>
              <th class="px-4 py-3">Duration</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of sessions()" class="border-b hover:bg-slate-50 transition-colors">
              <td class="px-4 py-4 font-semibold text-slate-800">
                <!-- If null, generic display (Wait, patients table might be missing local testing) -->
                {{ s.patients ? s.patients.first_name + ' ' + s.patients.last_name : 'Local Test User' }}
              </td>
              <td class="px-4 py-4">{{ s.session_date | date:'short' }}</td>
              <td class="px-4 py-4 text-emerald-600 font-bold">{{ s.max_force }} N</td>
              <td class="px-4 py-4 text-amber-500 font-bold">{{ s.reps }}</td>
              <td class="px-4 py-4">{{ s.duration_seconds }}s</td>
              <td class="px-4 py-4 flex gap-2">
                <button (click)="viewStaticChart(s)" class="text-blue-500 hover:text-blue-700 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-md shadow-sm transition-colors text-xs font-bold">
                  <i class="fa-solid fa-chart-line"></i> View
                </button>
                <button (click)="downloadCSV(s)" class="text-slate-600 hover:text-slate-800 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md shadow-sm transition-colors text-xs font-bold">
                  <i class="fa-solid fa-file-csv"></i> CSV
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Historical Chart Inspector Widget -->
      <div *ngIf="inspectedSession() !== null" class="mt-8 border-t pt-6 relative">
        <h3 class="font-bold text-slate-800 test-lg mb-2">
          Historical Curve Analysis 
          <span class="text-sm font-normal text-slate-500 bg-slate-100 px-2 rounded ml-2">{{ inspectedSession()?.file_url }}</span>
        </h3>
        <button (click)="closeInspector()" class="absolute top-6 right-0 text-slate-400 hover:text-rose-500 text-lg"><i class="fa-solid fa-xmark"></i></button>

        <!-- Loader -->
        <div *ngIf="isBlobLoading()" class="flex justify-center py-10">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl text-slate-400"></i>
        </div>

        <div [class.hidden]="isBlobLoading()" class="w-full relative h-64 bg-slate-50 border rounded-lg p-2 mt-4">
           <!-- ChartJS container requires static canvas mount point -->
           <canvas #staticChartCanvas></canvas>
        </div>
      </div>

    </div>
  `
})
export class ResearcherDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('staticChartCanvas') staticChartCanvas!: ElementRef<HTMLCanvasElement>;

  public sessions = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public inspectedSession = signal<any | null>(null);
  public isBlobLoading = signal<boolean>(false);
  private staticChart: Chart | null = null;

  constructor(private dataSync: DataSyncService) {}

  ngOnInit() {
    this.loadSessions();
  }

  ngAfterViewInit() {
    // Chart is lazily initialized when data gets clicked
  }

  async loadSessions() {
    this.isLoading.set(true);
    const data = await this.dataSync.fetchAllSessions();
    this.sessions.set(data);
    this.isLoading.set(false);
  }

  closeInspector() {
    this.inspectedSession.set(null);
    if (this.staticChart) {
      this.staticChart.destroy();
      this.staticChart = null;
    }
  }

  async viewStaticChart(session: any) {
    this.inspectedSession.set(session);
    this.isBlobLoading.set(true);

    if (this.staticChart) {
      this.staticChart.destroy(); // Clear old chart wrapper buffer
      this.staticChart = null;
    }

    const rawSeries = await this.dataSync.fetchRawSessionData(session.file_url);
    this.isBlobLoading.set(false);

    if (!rawSeries || rawSeries.length === 0) {
      alert("No blob data found in bucket for this session.");
      return;
    }

    // Await render cycle so ngIf evaluates before charting
    setTimeout(() => {
      this.renderHistoricalChart(rawSeries);
    }, 50);
  }

  private renderHistoricalChart(rawSeries: RawDataPoint[]) {
    if (!this.staticChartCanvas) return;
    const ctx = this.staticChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.staticChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rawSeries.map(d => d.timeLabel),
        datasets: [{
          label: 'Historical Force (N)',
          data: rawSeries.map(d => d.force),
          borderColor: '#3b82f6', // blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointRadius: 0, 
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { display: false }, // Too many datapoints to display X labels cleanly at 20Hz
          y: { 
            display: true,
            beginAtZero: true 
          }
        }
      }
    });
  }

  async downloadCSV(session: any) {
    // Alerting cleanly
    const proceed = confirm("Download large 20Hz dataset directly from bucket?");
    if(!proceed) return;

    const rawSeries = await this.dataSync.fetchRawSessionData(session.file_url);
    if (!rawSeries || rawSeries.length === 0) {
      alert("Failed to locate target file blob in Supabase Storage");
      return;
    }

    let csvContent = 'Timestamp,Time(s),Force\n';
    rawSeries.forEach(dp => {
      csvContent += `${dp.timestamp},${dp.timeLabel},${dp.force}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CTAR_Historical_${session.session_date}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
