import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, effect, Injector, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { DataPoint } from '../../services/ctar-logic.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-6 w-full relative overflow-hidden group transition-colors duration-300">
      <!-- subtle background glow -->
      <div class="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500 rounded-full blur-[50px] opacity-10 transition-all duration-700 group-hover:opacity-20"></div>
      
      <div class="flex items-center space-x-3 mb-6 relative z-10">
         <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-transparent transition-colors duration-300">
            <i class="fa-solid fa-chart-area"></i>
         </div>
         <h2 class="text-lg font-semibold text-slate-900 dark:text-white tracking-wide transition-colors duration-300">Real-time Force Curve</h2>
      </div>
      <div class="relative h-64 w-full z-10">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input({required: true}) latestDataPoint!: Signal<DataPoint | null>;
  
  private chart: Chart | null = null;
  private maxDataPoints = 50;
  public themeService = inject(ThemeService);

  constructor(private injector: Injector) {}

  ngAfterViewInit() {
    this.initChart();
    
    // Listen for data points
    effect(() => {
      const dp = this.latestDataPoint();
      if (dp) {
        this.updateChart(dp);
      } else {
        this.clearChart();
      }
    }, { injector: this.injector });

    // Listen for theme changes to update chart colors
    effect(() => {
      const isDark = this.themeService.isDarkMode();
      this.updateChartTheme(isDark);
    }, { injector: this.injector });
  }

  private initChart() {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
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

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Force',
          data: [],
          borderColor: '#3b82f6', // brand-accent
          backgroundColor: gradient,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#3b82f6',
          pointHoverBorderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
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
          x: { 
            display: true,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: tickColor
            }
          },
          y: { 
            display: true,
            beginAtZero: true,
            suggestedMax: 80,
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
    if (!this.chart) return;
    
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const tickColor = isDark ? '#64748b' : '#94a3b8';
    const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const tooltipTitleColor = isDark ? '#cbd5e1' : '#475569';
    const tooltipBodyColor = isDark ? '#fff' : '#0f172a';
    const tooltipBorderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    if (this.chart.options.scales?.['x']) {
      if (this.chart.options.scales['x'].grid) this.chart.options.scales['x'].grid.color = gridColor;
      if (this.chart.options.scales['x'].ticks) this.chart.options.scales['x'].ticks.color = tickColor;
    }
    
    if (this.chart.options.scales?.['y']) {
      if (this.chart.options.scales['y'].grid) this.chart.options.scales['y'].grid.color = gridColor;
      if (this.chart.options.scales['y'].ticks) this.chart.options.scales['y'].ticks.color = tickColor;
    }

    if (this.chart.options.plugins?.tooltip) {
      const tooltip = this.chart.options.plugins.tooltip as any;
      tooltip.backgroundColor = tooltipBg;
      tooltip.titleColor = tooltipTitleColor;
      tooltip.bodyColor = tooltipBodyColor;
      tooltip.borderColor = tooltipBorderColor;
    }

    this.chart.update('none');
  }

  private updateChart(dp: DataPoint) {
    if (!this.chart) return;
    
    const dataset = this.chart.data.datasets[0].data;
    const labels = this.chart.data.labels;
    
    if (dataset.length > this.maxDataPoints) {
      dataset.shift();
      labels!.shift();
    }
    
    dataset.push(dp.force);
    labels!.push(dp.timeLabel);
    
    this.chart.update('none'); // Update without animation
  }

  private clearChart() {
     if (!this.chart) return;
     this.chart.data.datasets[0].data = [];
     this.chart.data.labels = [];
     this.chart.update('none');
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
