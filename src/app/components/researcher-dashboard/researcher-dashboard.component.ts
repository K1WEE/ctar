import { Component, OnInit, signal, ElementRef, ViewChild, AfterViewInit, effect, Injector, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataSyncService, RawDataPoint } from '../../services/data-sync.service';
import { Chart } from 'chart.js/auto';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-researcher-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 w-full mt-4 relative overflow-hidden transition-colors duration-300">
      <!-- Decorative background -->
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

      <div class="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-white/10 pb-4 transition-colors duration-300">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-300"><i class="fa-solid fa-user-doctor text-indigo-500 dark:text-indigo-400 mr-2"></i> Clinical Records Hub</h2>
        <button (click)="loadSessions()" class="text-sm bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-600 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-white py-2 px-4 rounded-xl font-medium transition-all duration-300 shadow-md flex items-center">
          <i class="fa-solid fa-rotate-right mr-2" [class.fa-spin]="isLoading()"></i> Refresh Data
        </button>
      </div>

      <!-- Warning if empty -->
      <div *ngIf="sessions().length === 0 && !isLoading()" class="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-white/10 backdrop-blur-sm transition-colors duration-300">
        <i class="fa-solid fa-folder-open text-5xl mb-4 text-slate-400 dark:text-slate-500/50 drop-shadow-sm"></i>
        <p class="text-lg font-medium">No recording sessions found in PostgreSQL.</p>
        <p class="text-sm mt-1">Make sure patients have synced their data.</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="text-center py-12 text-slate-500 dark:text-slate-300 transition-colors duration-300">
        <div class="relative w-16 h-16 mx-auto mb-4">
          <div class="absolute inset-0 rounded-full border-t-2 border-indigo-500 dark:border-indigo-400 animate-spin"></div>
          <div class="absolute inset-2 rounded-full border-r-2 border-brand-accent animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
        </div>
        <p class="font-medium tracking-wide">Downloading Clinical Metadata...</p>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 shadow-inner transition-colors duration-300" *ngIf="sessions().length > 0">
        <table class="w-full text-left text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/50 backdrop-blur-md transition-colors duration-300">
          <thead class="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-200 uppercase text-xs tracking-wider border-b border-slate-200 dark:border-white/10 transition-colors duration-300">
            <tr>
              <th class="px-5 py-4 font-semibold">Patient</th>
              <th class="px-5 py-4 font-semibold">Date</th>
              <th class="px-5 py-4 font-semibold">Max Force</th>
              <th class="px-5 py-4 font-semibold">Reps</th>
              <th class="px-5 py-4 font-semibold">Duration</th>
              <th class="px-5 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5 transition-colors duration-300">
            <tr *ngFor="let s of sessions()" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-200 group">
              <td class="px-5 py-4 font-medium text-slate-900 dark:text-white flex items-center transition-colors duration-300">
                <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mr-3 text-xs border border-indigo-100 dark:border-indigo-500/30 transition-colors duration-300">
                  <i class="fa-solid fa-user"></i>
                </div>
                {{ s.patients ? s.patients.first_name + ' ' + s.patients.last_name : 'Local Test User' }}
              </td>
              <td class="px-5 py-4 text-slate-500 dark:text-slate-400 transition-colors duration-300">{{ s.session_date | date:'MMM d, y, h:mm a' }}</td>
              <td class="px-5 py-4 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/5 rounded-md transition-colors duration-300">{{ s.max_force }} N</td>
              <td class="px-5 py-4 text-amber-600 dark:text-amber-400 font-bold transition-colors duration-300">{{ s.reps }}</td>
              <td class="px-5 py-4 text-slate-500 dark:text-slate-400 transition-colors duration-300"><i class="fa-regular fa-clock mr-1 opacity-50"></i>{{ s.duration_seconds }}s</td>
              <td class="px-5 py-4 flex gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                <button (click)="viewStaticChart(s)" class="text-indigo-600 dark:text-indigo-300 hover:text-white px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-500 rounded-lg shadow-sm transition-all duration-300 text-xs font-bold flex items-center gap-1">
                  <i class="fa-solid fa-chart-line"></i> View
                </button>
                <button (click)="openDownloadModal(s)" class="text-slate-600 dark:text-slate-300 hover:text-white px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-emerald-500 border border-slate-200 dark:border-slate-600 hover:border-emerald-500 rounded-lg shadow-sm transition-all duration-300 text-xs font-bold flex items-center gap-1">
                  <i class="fa-solid fa-download"></i> CSV
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Historical Chart Inspector Widget -->
      <div *ngIf="inspectedSession() !== null" class="mt-8 border-t border-slate-200 dark:border-white/10 pt-6 relative animate-fade-in transition-colors duration-300">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-slate-900 dark:text-white text-lg flex items-center transition-colors duration-300">
              <i class="fa-solid fa-magnifying-glass-chart text-brand-accent mr-2"></i> Historical Curve Analysis 
            </h3>
            <p class="text-xs font-mono text-slate-500 mt-1 flex items-center">
              <i class="fa-solid fa-database mr-1"></i> {{ inspectedSession()?.file_url }}
            </p>
          </div>
          <button (click)="closeInspector()" class="text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/20 p-2 rounded-lg transition-colors border border-slate-200 dark:border-white/5 hover:border-rose-200 dark:hover:border-rose-500/30">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- Loader -->
        <div *ngIf="isBlobLoading()" class="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
          <i class="fa-solid fa-cloud-arrow-down fa-bounce text-3xl text-brand-accent mb-4"></i>
          <p class="text-slate-500 dark:text-slate-400 text-sm animate-pulse transition-colors duration-300">Fetching raw telemetry from storage...</p>
        </div>

        <div [class.hidden]="isBlobLoading()" class="w-full relative h-72 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-inner rounded-xl p-4 transition-colors duration-300">
           <!-- ChartJS container requires static canvas mount point -->
           <canvas #staticChartCanvas></canvas>
        </div>
      </div>

      <!-- Glassmorphism Download Format Selector Modal -->
      <div *ngIf="showDownloadModal() !== null" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
        <div class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden transition-all duration-300 text-left">
          
          <!-- Gradient glow effect -->
          <div class="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div class="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h3 class="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <i class="fa-solid fa-cloud-arrow-down text-emerald-500"></i>
                <span>Select Download Format</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Please select how you want to export the CSV data
              </p>
            </div>
            <button (click)="showDownloadModal.set(null)" class="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-1.5 rounded-lg transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Options -->
          <div class="space-y-3 my-5 relative z-10">
            <!-- Option 1: Single Session -->
            <button (click)="triggerDownload('single')" class="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/40 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-500/5 transition-all group flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <i class="fa-solid fa-file-csv text-base"></i>
              </div>
              <div class="flex-grow">
                <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  Single Session (This round only)
                </h4>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                  Export only the raw 20Hz telemetry for this single session
                </p>
              </div>
            </button>

            <!-- Option 2: Daily Aggregated -->
            <button (click)="triggerDownload('daily')" class="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/40 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-all group flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <i class="fa-solid fa-calendar-day text-base"></i>
              </div>
              <div class="flex-grow">
                <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Daily Aggregated (All of this day)
                </h4>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                  Merge all exercises performed on this day into a single organized sheet
                </p>
              </div>
            </button>

            <!-- Option 3: Monthly Aggregated -->
            <button (click)="triggerDownload('monthly')" class="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/40 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/20 dark:hover:bg-purple-500/5 transition-all group flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <i class="fa-solid fa-calendar-days text-base"></i>
              </div>
              <div class="flex-grow">
                <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200 transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  Monthly Aggregated (All of this month)
                </h4>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                  Merge all exercises performed in this month into a single organized sheet
                </p>
              </div>
            </button>
          </div>

          <!-- Close button -->
          <div class="flex justify-end pt-2 border-t border-slate-100 dark:border-white/5 relative z-10">
            <button (click)="showDownloadModal.set(null)" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
              Cancel
            </button>
          <!-- Absolute Glassmorphism Loader for Downloading -->
          <div *ngIf="isDownloadingFile()" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md animate-fade-in">
            <div class="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-sm text-center">
              <i class="fa-solid fa-cloud-arrow-down fa-bounce text-4xl text-emerald-500 mb-4"></i>
              <h4 class="font-extrabold text-slate-800 dark:text-white text-base">
                Compiling and Downloading CSV...
              </h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Fetching high-resolution historical data and building your customized sheet. Please wait a moment.
              </p>
            </div>
          </div>

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
  public showDownloadModal = signal<any | null>(null);
  public isDownloadingFile = signal<boolean>(false);
  private staticChart: Chart | null = null;
  public themeService = inject(ThemeService);

  constructor(private dataSync: DataSyncService, private injector: Injector) {}

  ngOnInit() {
    this.loadSessions();
    
    // Listen for theme changes to update chart colors dynamically
    effect(() => {
      const isDark = this.themeService.isDarkMode();
      this.updateChartTheme(isDark);
    }, { injector: this.injector });
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

    const isDark = this.themeService.isDarkMode();
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const tickColor = isDark ? '#64748b' : '#94a3b8';
    const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const tooltipTitleColor = isDark ? '#cbd5e1' : '#475569';
    const tooltipBodyColor = isDark ? '#fff' : '#0f172a';
    const tooltipBorderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

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
            backgroundColor: tooltipBg,
            titleColor: tooltipTitleColor,
            bodyColor: tooltipBodyColor,
            borderColor: tooltipBorderColor,
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
              color: gridColor,
            },
            ticks: {
              color: tickColor
            }
          }
        }
      }
    });
  }

  private updateChartTheme(isDark: boolean) {
    if (!this.staticChart) return;
    
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const tickColor = isDark ? '#64748b' : '#94a3b8';
    const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const tooltipTitleColor = isDark ? '#cbd5e1' : '#475569';
    const tooltipBodyColor = isDark ? '#fff' : '#0f172a';
    const tooltipBorderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    if (this.staticChart.options.scales?.['y']) {
      if (this.staticChart.options.scales['y'].grid) this.staticChart.options.scales['y'].grid.color = gridColor;
      if (this.staticChart.options.scales['y'].ticks) this.staticChart.options.scales['y'].ticks.color = tickColor;
    }

    if (this.staticChart.options.plugins?.tooltip) {
      const tooltip = this.staticChart.options.plugins.tooltip as any;
      tooltip.backgroundColor = tooltipBg;
      tooltip.titleColor = tooltipTitleColor;
      tooltip.bodyColor = tooltipBodyColor;
      tooltip.borderColor = tooltipBorderColor;
    }

    this.staticChart.update('none');
  }

  openDownloadModal(session: any) {
    this.showDownloadModal.set(session);
  }

  async triggerDownload(mode: 'single' | 'daily' | 'monthly') {
    const session = this.showDownloadModal();
    if (!session) return;
    this.showDownloadModal.set(null);

    if (mode === 'single') {
      await this.downloadCSV(session);
      return;
    }

    this.isDownloadingFile.set(true);
    try {
      const getYYYYMMDD = (dStr: string) => {
        const d = new Date(dStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const getYYYYMM = (dStr: string) => {
        const d = new Date(dStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };

      const targetRefStr = session.session_date;
      let matchedSessions = [];
      let filenameLabel = '';

      if (mode === 'daily') {
        const targetDay = getYYYYMMDD(targetRefStr);
        matchedSessions = this.sessions().filter(s => getYYYYMMDD(s.session_date) === targetDay);
        filenameLabel = `Daily_${targetDay}`;
      } else {
        const targetMonth = getYYYYMM(targetRefStr);
        matchedSessions = this.sessions().filter(s => getYYYYMM(s.session_date) === targetMonth);
        filenameLabel = `Monthly_${targetMonth}`;
      }

      // Sort chronologically ascending
      matchedSessions.sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

      if (matchedSessions.length === 0) {
        this.isDownloadingFile.set(false);
        return;
      }

      let csvContent = 'Timestamp (Readable),Time(s),Force\n';

      for (let index = 0; index < matchedSessions.length; index++) {
        const s = matchedSessions[index];
        const rawSeries = await this.dataSync.fetchRawSessionData(s.file_url);
        if (!rawSeries || rawSeries.length === 0) continue;

        const timeString = new Date(s.session_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const dateString = new Date(s.session_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });

        csvContent += `"================ เริ่มการฝึกครั้งที่ ${index + 1} ของวัน (${dateString} เวลา ${timeString}) ================","--","--"\n`;

        const sessionMax = Number(s.max_force) || 40;
        
        let currentRepVal = 0;
        let requiredHoldTimeMs = 1500;
        let currentHoldMs = 0;

        rawSeries.forEach(dp => {
          const force = Number(dp.force);
          let isRepEndThisStep = false;

          // 1. Calculate Target Zone limits for the current rep
          const repNum = currentRepVal + 1;
          const isOdd = repNum % 2 !== 0;
          let targetMin = 0;
          let targetMax = 0;

          if (isOdd) {
            targetMin = sessionMax * 0.65;
            targetMax = sessionMax * 0.85;
          } else {
            targetMin = sessionMax * 0.20;
            targetMax = sessionMax * 0.40;
          }

          if (targetMin < 5) {
            targetMin = 5;
            targetMax = Math.max(10, targetMax);
          }

          // 2. Check target zone state
          const inTargetZone = force >= targetMin && force <= targetMax;

          // 3. Accumulate hold progress (50ms per telemetry sample at 20Hz)
          if (inTargetZone) {
            currentHoldMs += 50;
            if (currentHoldMs >= requiredHoldTimeMs) {
              currentRepVal++;
              isRepEndThisStep = true;
              currentHoldMs = 0;
              requiredHoldTimeMs = Math.min(1500 + (currentRepVal * 500), 5000);
            }
          } else {
            currentHoldMs -= 50;
            if (currentHoldMs < 0) {
              currentHoldMs = 0;
            }
          }

          const readableDate = new Date(dp.timestamp).toLocaleString();
          csvContent += `"${readableDate}",${dp.timeLabel},${dp.force}\n`;

          if (isRepEndThisStep) {
            csvContent += `"================ สิ้นสุดรอบที่ ${currentRepVal} ================","--","--"\n`;
          }
        });

        csvContent += `\n`; // Spacer row
      }

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CTAR_Historical_${filenameLabel}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate aggregated download:', err);
    } finally {
      this.isDownloadingFile.set(false);
    }
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

    const sessionMax = Number(session.max_force) || 40;
    // Set dynamic baseline thresholds to capture both high-intensity (odd) and low-intensity (even) reps
    const repThreshold = Math.max(5.0, sessionMax * 0.18);
    const dropThreshold = Math.max(3.0, sessionMax * 0.08);

    let csvContent = 'Timestamp (Readable),Time(s),Force\n';
    let currentRepVal = 0;
    let requiredHoldTimeMs = 1500;
    let currentHoldMs = 0;

    rawSeries.forEach(dp => {
      const force = Number(dp.force);
      let isRepEndThisStep = false;

      // 1. Calculate Target Zone limits for the current rep
      const repNum = currentRepVal + 1;
      const isOdd = repNum % 2 !== 0;
      let targetMin = 0;
      let targetMax = 0;

      if (isOdd) {
        targetMin = sessionMax * 0.65;
        targetMax = sessionMax * 0.85;
      } else {
        targetMin = sessionMax * 0.20;
        targetMax = sessionMax * 0.40;
      }

      if (targetMin < 5) {
        targetMin = 5;
        targetMax = Math.max(10, targetMax);
      }

      // 2. Check target zone state
      const inTargetZone = force >= targetMin && force <= targetMax;

      // 3. Accumulate hold progress (50ms per telemetry sample at 20Hz)
      if (inTargetZone) {
        currentHoldMs += 50;
        if (currentHoldMs >= requiredHoldTimeMs) {
          currentRepVal++;
          isRepEndThisStep = true;
          currentHoldMs = 0;
          requiredHoldTimeMs = Math.min(1500 + (currentRepVal * 500), 5000);
        }
      } else {
        currentHoldMs -= 50;
        if (currentHoldMs < 0) {
          currentHoldMs = 0;
        }
      }

      const readableDate = new Date(dp.timestamp).toLocaleString();
      csvContent += `"${readableDate}",${dp.timeLabel},${dp.force}\n`;

      if (isRepEndThisStep) {
        csvContent += `"================ สิ้นสุดรอบที่ ${currentRepVal} ================","--","--"\n`;
      }
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
