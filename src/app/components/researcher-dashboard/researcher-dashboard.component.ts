import { Component, OnInit, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataSyncService, RawDataPoint } from '../../services/data-sync.service';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-researcher-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-brand-card backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-6 w-full mt-4">
      <div class="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <h2 class="text-2xl font-bold text-white"><i class="fa-solid fa-user-doctor text-indigo-400 mr-2"></i> Clinical Records Hub</h2>
        <button (click)="loadSessions()" class="text-sm bg-slate-700/50 hover:bg-indigo-600 border border-white/10 text-slate-200 hover:text-white py-2 px-4 rounded-xl font-medium transition-all duration-300 shadow-md flex items-center">
          <i class="fa-solid fa-rotate-right mr-2" [class.fa-spin]="isLoading()"></i> Refresh Data
        </button>
      </div>

      <!-- Warning if empty -->
      <div *ngIf="sessions().length === 0 && !isLoading()" class="text-center py-12 text-slate-400 bg-slate-800/30 rounded-xl border border-dashed border-white/10 backdrop-blur-sm">
        <i class="fa-solid fa-folder-open text-5xl mb-4 text-slate-500/50 drop-shadow-sm"></i>
        <p class="text-lg font-medium">No recording sessions found in PostgreSQL.</p>
        <p class="text-sm mt-1">Make sure patients have synced their data.</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="text-center py-12 text-slate-300">
        <div class="relative w-16 h-16 mx-auto mb-4">
          <div class="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-spin"></div>
          <div class="absolute inset-2 rounded-full border-r-2 border-brand-accent animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
        </div>
        <p class="font-medium tracking-wide">Downloading Clinical Metadata...</p>
      </div>

      <div class="overflow-x-auto rounded-xl border border-white/10 shadow-inner" *ngIf="sessions().length > 0">
        <table class="w-full text-left text-sm text-slate-300 bg-slate-900/50 backdrop-blur-md">
          <thead class="bg-slate-800/80 text-slate-200 uppercase text-xs tracking-wider border-b border-white/10">
            <tr>
              <th class="px-5 py-4 font-semibold">Patient</th>
              <th class="px-5 py-4 font-semibold">Date</th>
              <th class="px-5 py-4 font-semibold">Max Force</th>
              <th class="px-5 py-4 font-semibold">Reps</th>
              <th class="px-5 py-4 font-semibold">Duration</th>
              <th class="px-5 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr *ngFor="let s of sessions()" class="hover:bg-white/5 transition-colors duration-200 group">
              <td class="px-5 py-4 font-medium text-white flex items-center">
                <div class="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-3 text-xs border border-indigo-500/30">
                  <i class="fa-solid fa-user"></i>
                </div>
                {{ s.patients ? s.patients.first_name + ' ' + s.patients.last_name : 'Local Test User' }}
              </td>
              <td class="px-5 py-4 text-slate-400">{{ s.session_date | date:'MMM d, y, h:mm a' }}</td>
              <td class="px-5 py-4 text-emerald-400 font-bold bg-emerald-500/5 rounded-md">{{ s.max_force }} N</td>
              <td class="px-5 py-4 text-amber-400 font-bold">{{ s.reps }}</td>
              <td class="px-5 py-4 text-slate-400"><i class="fa-regular fa-clock mr-1 opacity-50"></i>{{ s.duration_seconds }}s</td>
              <td class="px-5 py-4 flex gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                <button (click)="viewStaticChart(s)" class="text-indigo-300 hover:text-white px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/30 hover:border-indigo-500 rounded-lg shadow-sm transition-all duration-300 text-xs font-bold flex items-center gap-1">
                  <i class="fa-solid fa-chart-line"></i> View
                </button>
                <button (click)="downloadCSV(s)" class="text-slate-300 hover:text-white px-3 py-1.5 bg-slate-700/50 hover:bg-emerald-600 border border-slate-600 hover:border-emerald-500 rounded-lg shadow-sm transition-all duration-300 text-xs font-bold flex items-center gap-1">
                  <i class="fa-solid fa-download"></i> CSV
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Historical Chart Inspector Widget -->
      <div *ngIf="inspectedSession() !== null" class="mt-8 border-t border-white/10 pt-6 relative animate-fade-in">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-white text-lg flex items-center">
              <i class="fa-solid fa-magnifying-glass-chart text-brand-accent mr-2"></i> Historical Curve Analysis 
            </h3>
            <p class="text-xs font-mono text-slate-500 mt-1 flex items-center">
              <i class="fa-solid fa-database mr-1"></i> {{ inspectedSession()?.file_url }}
            </p>
          </div>
          <button (click)="closeInspector()" class="text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-500/20 p-2 rounded-lg transition-colors border border-white/5 hover:border-rose-500/30">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- Loader -->
        <div *ngIf="isBlobLoading()" class="flex flex-col items-center justify-center py-16 bg-slate-900/50 rounded-xl border border-white/5">
          <i class="fa-solid fa-cloud-arrow-down fa-bounce text-3xl text-brand-accent mb-4"></i>
          <p class="text-slate-400 text-sm animate-pulse">Fetching raw telemetry from storage...</p>
        </div>

        <div [class.hidden]="isBlobLoading()" class="w-full relative h-72 bg-slate-900/80 border border-white/10 shadow-inner rounded-xl p-4">
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

    // Create a beautiful gradient for the chart
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); // brand-accent
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    this.staticChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rawSeries.map(d => d.timeLabel),
        datasets: [{
          label: 'Historical Force (N)',
          data: rawSeries.map(d => d.force),
          borderColor: '#3b82f6', // brand-accent
          backgroundColor: gradient,
          borderWidth: 2,
          pointRadius: 0, 
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#3b82f6',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#cbd5e1',
            bodyColor: '#fff',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context: any) => `${context.parsed.y} N`
            }
          }
        },
        scales: {
          x: { display: false }, // Too many datapoints to display X labels cleanly at 20Hz
          y: { 
            display: true,
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
            },
            ticks: {
              color: '#64748b'
            }
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
