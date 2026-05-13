import { Component, OnInit, inject, signal, ViewChild, ElementRef, AfterViewInit, Injector, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DataSyncService, RawDataPoint } from '../../../services/data-sync.service';
import { I18nService } from '../../../services/i18n.service';
import { ThemeService } from '../../../services/theme.service';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen pb-10 relative z-10 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        <!-- Back + Title -->
        <div class="flex items-center space-x-4 mb-6">
          <button (click)="goBack()" class="w-12 h-12 rounded-xl bg-white/70 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-brand-accent border border-slate-200 dark:border-white/10 transition-all shadow-sm">
            <i class="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ i18n.t('detail.title') }}</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400" *ngIf="patient()">{{ patient().first_name }} {{ patient().last_name }}</p>
          </div>
          <div class="flex-1"></div>
          <!-- Language Toggle -->
          <button (click)="i18n.toggleLang()" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:text-brand-accent border border-slate-200 dark:border-white/10 text-sm font-bold transition-all">
            {{ i18n.currentLang() === 'th' ? 'EN' : 'TH' }}
          </button>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading()" class="text-center py-16">
          <i class="fa-solid fa-spinner fa-spin text-4xl text-brand-accent mb-4"></i>
        </div>

        <div *ngIf="!isLoading() && patient()" class="space-y-6 animate-fade-in">

          <!-- Profile Card -->
          <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg">
            <div class="flex items-center space-x-4">
              <div class="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/30 text-2xl font-bold">
                {{ (patient().first_name || '?')[0] }}
              </div>
              <div>
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ patient().first_name }} {{ patient().last_name }}</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <i class="fa-solid fa-chart-bar mr-1"></i> {{ sessions().length }} {{ i18n.t('clinic.sessions') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Trend Chart -->
          <div *ngIf="sessions().length > 1" class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg">
            <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center">
              <i class="fa-solid fa-chart-line text-brand-accent mr-2"></i> {{ i18n.t('detail.progressTrend') }}
            </h3>
            <div class="h-64 relative">
              <canvas #trendCanvas></canvas>
            </div>
          </div>

          <!-- Session History Table -->
          <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center">
                <i class="fa-solid fa-list-ul text-brand-accent mr-2"></i> {{ i18n.t('detail.sessionHistory') }}
              </h3>
            </div>
            
            <div *ngIf="sessions().length === 0" class="text-center py-12 text-slate-500">
              <i class="fa-solid fa-inbox text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
              <p>{{ i18n.t('detail.noSessions') }}</p>
            </div>

            <div class="overflow-x-auto" *ngIf="sessions().length > 0">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wider border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th class="px-5 py-3 font-semibold">{{ i18n.t('detail.date') }}</th>
                    <th class="px-5 py-3 font-semibold">{{ i18n.t('detail.maxForce') }}</th>
                    <th class="px-5 py-3 font-semibold">{{ i18n.t('detail.reps') }}</th>
                    <th class="px-5 py-3 font-semibold">{{ i18n.t('detail.duration') }}</th>
                    <th class="px-5 py-3 font-semibold text-right">{{ i18n.t('detail.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-white/5">
                  <tr *ngFor="let s of sessions()" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td class="px-5 py-3.5 text-slate-700 dark:text-slate-300">{{ s.session_date | date:'MMM d, y, h:mm a' }}</td>
                    <td class="px-5 py-3.5 text-emerald-600 dark:text-emerald-400 font-bold">{{ s.max_force | number:'1.0-1' }} N</td>
                    <td class="px-5 py-3.5 text-amber-600 dark:text-amber-400 font-bold">{{ s.reps }}</td>
                    <td class="px-5 py-3.5 text-slate-500"><i class="fa-regular fa-clock mr-1 opacity-50"></i>{{ s.duration_seconds }}s</td>
                    <td class="px-5 py-3.5 flex gap-2 justify-end">
                      <button (click)="viewChart(s)" class="text-indigo-600 dark:text-indigo-300 hover:text-white px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-200 dark:border-indigo-500/30 rounded-lg transition-all text-xs font-bold flex items-center gap-1">
                        <i class="fa-solid fa-chart-line"></i> {{ i18n.t('detail.viewChart') }}
                      </button>
                      <button (click)="downloadCSV(s)" class="text-slate-600 dark:text-slate-300 hover:text-white px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-emerald-500 border border-slate-200 dark:border-slate-600 rounded-lg transition-all text-xs font-bold flex items-center gap-1">
                        <i class="fa-solid fa-download"></i> {{ i18n.t('detail.downloadCSV') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Session Chart Inspector -->
          <div *ngIf="inspectedSession() !== null" class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg animate-fade-in">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center">
                <i class="fa-solid fa-magnifying-glass-chart text-brand-accent mr-2"></i>
                Force Curve — {{ inspectedSession()?.session_date | date:'MMM d, y' }}
              </h3>
              <button (click)="closeInspector()" class="text-slate-500 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 p-2 rounded-lg transition-colors border border-slate-200 dark:border-white/5">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div *ngIf="isBlobLoading()" class="flex flex-col items-center py-12">
              <i class="fa-solid fa-cloud-arrow-down fa-bounce text-3xl text-brand-accent mb-4"></i>
            </div>
            <div [class.hidden]="isBlobLoading()" class="h-72 relative">
              <canvas #sessionCanvas></canvas>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class PatientDetailComponent implements OnInit, AfterViewInit {
  @ViewChild('trendCanvas') trendCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sessionCanvas') sessionCanvas!: ElementRef<HTMLCanvasElement>;

  public patient = signal<any>(null);
  public sessions = signal<any[]>([]);
  public isLoading = signal(true);
  public inspectedSession = signal<any | null>(null);
  public isBlobLoading = signal(false);
  public i18n = inject(I18nService);
  public themeService = inject(ThemeService);

  private trendChart: Chart | null = null;
  private sessionChart: Chart | null = null;
  private patientId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataSync: DataSyncService,
    private injector: Injector
  ) {}

  ngOnInit() {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.patientId) {
      this.router.navigate(['/clinic/records']);
      return;
    }
    this.loadData();
  }

  ngAfterViewInit() {
    effect(() => {
      const isDark = this.themeService.isDarkMode();
      this.updateChartThemes(isDark);
    }, { injector: this.injector });
  }

  async loadData() {
    this.isLoading.set(true);
    
    const [profile, sessionData] = await Promise.all([
      this.dataSync.fetchPatientProfile(this.patientId),
      this.dataSync.fetchPatientSessions(this.patientId)
    ]);

    this.patient.set(profile);
    this.sessions.set(sessionData);
    this.isLoading.set(false);

    // Render trend chart after data loads
    setTimeout(() => this.renderTrendChart(), 100);
  }

  private renderTrendChart() {
    if (!this.trendCanvas || this.sessions().length < 2) return;
    const ctx = this.trendCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.trendChart) this.trendChart.destroy();

    const sorted = [...this.sessions()].reverse(); // oldest first
    const isDark = this.themeService.isDarkMode();

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sorted.map((s: any) => new Date(s.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })),
        datasets: [
          {
            label: 'Max Force (N)',
            data: sorted.map((s: any) => s.max_force),
            borderColor: '#3b82f6',
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: true,
            tension: 0.3
          },
          {
            label: 'Reps',
            data: sorted.map((s: any) => s.reps),
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#f59e0b',
            borderDash: [5, 5],
            fill: false,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: isDark ? '#94a3b8' : '#64748b', padding: 16 }
          }
        },
        scales: {
          x: {
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#64748b' : '#94a3b8' }
          },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#64748b' : '#94a3b8' }
          }
        }
      }
    });
  }

  async viewChart(session: any) {
    this.inspectedSession.set(session);
    this.isBlobLoading.set(true);

    if (this.sessionChart) {
      this.sessionChart.destroy();
      this.sessionChart = null;
    }

    const rawSeries = await this.dataSync.fetchRawSessionData(session.file_url);
    this.isBlobLoading.set(false);

    if (!rawSeries || rawSeries.length === 0) {
      alert('No raw data found for this session.');
      return;
    }

    setTimeout(() => this.renderSessionChart(rawSeries), 50);
  }

  private renderSessionChart(rawSeries: RawDataPoint[]) {
    if (!this.sessionCanvas) return;
    const ctx = this.sessionCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const isDark = this.themeService.isDarkMode();
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    this.sessionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rawSeries.map(d => d.timeLabel),
        datasets: [{
          label: 'Force (N)',
          data: rawSeries.map(d => d.force),
          borderColor: '#3b82f6',
          backgroundColor: gradient,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#64748b' : '#94a3b8' }
          }
        }
      }
    });
  }

  closeInspector() {
    this.inspectedSession.set(null);
    if (this.sessionChart) {
      this.sessionChart.destroy();
      this.sessionChart = null;
    }
  }

  async downloadCSV(session: any) {
    const rawSeries = await this.dataSync.fetchRawSessionData(session.file_url);
    if (!rawSeries || rawSeries.length === 0) return;

    let csvContent = 'DateTime,Time(s),Force\n';
    rawSeries.forEach(dp => {
      const readableDate = new Date(dp.timestamp).toLocaleString('th-TH');
      csvContent += `"${readableDate}",${dp.timeLabel},${dp.force}\n`;
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CTAR_${this.patient()?.first_name}_${session.session_date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private updateChartThemes(isDark: boolean) {
    [this.trendChart, this.sessionChart].forEach(chart => {
      if (!chart) return;
      const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      const tickColor = isDark ? '#64748b' : '#94a3b8';

      ['x', 'y'].forEach(axis => {
        const scale = chart.options.scales?.[axis];
        if (scale) {
          if (scale.grid) scale.grid.color = gridColor;
          if (scale.ticks) scale.ticks.color = tickColor;
        }
      });

      if (chart.options.plugins?.legend?.labels) {
        (chart.options.plugins.legend.labels as any).color = tickColor;
      }
      chart.update('none');
    });
  }

  goBack() {
    this.router.navigate(['/clinic/records']);
  }
}
