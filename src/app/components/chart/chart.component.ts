import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, effect, Injector, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { DataPoint } from '../../services/ctar-logic.service';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-brand-card backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-6 w-full relative overflow-hidden group">
      <!-- subtle background glow -->
      <div class="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500 rounded-full blur-[50px] opacity-10 transition-all duration-700 group-hover:opacity-20"></div>
      
      <div class="flex items-center space-x-3 mb-6 relative z-10">
         <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <i class="fa-solid fa-chart-area"></i>
         </div>
         <h2 class="text-lg font-semibold text-white tracking-wide">Real-time Force Curve</h2>
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

  constructor(private injector: Injector) {}

  ngAfterViewInit() {
    this.initChart();
    
    effect(() => {
      const dp = this.latestDataPoint();
      if (dp) {
        this.updateChart(dp);
      } else {
        this.clearChart();
      }
    }, { injector: this.injector });
  }

  private initChart() {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Create a beautiful gradient for the chart
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); // brand-accent
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

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
          x: { 
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
            },
            ticks: {
              color: '#64748b'
            }
          },
          y: { 
            display: true,
            beginAtZero: true,
            suggestedMax: 100,
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
