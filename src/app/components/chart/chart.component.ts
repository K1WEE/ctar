import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, effect, Injector, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { DataPoint } from '../../services/ctar-logic.service';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow p-5 w-full">
      <h2 class="text-sm text-slate-500 font-medium mb-4">Real-time Force Curve</h2>
      <div class="relative h-64 w-full">
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

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Force',
          data: [],
          borderColor: '#10b981', // emerald 500
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { display: true },
          y: { 
            display: true,
            beginAtZero: true,
            suggestedMax: 100 
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
