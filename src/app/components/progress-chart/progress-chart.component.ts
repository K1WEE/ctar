import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-progress-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-chart.component.html',
})
export class ProgressChartComponent implements OnInit {

    constructor(private supabase: SupabaseService) {}

  progressData: any[] = [];
  chart: any;

  async ngOnInit() {
  await this.loadProgress();
  this.renderChart();
}

async loadProgress() {
  const user = this.supabase.currentUser(); 
  console.log(this.supabase.currentUser()?.id);

  if (!user) return;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await this.supabase.client
    .from('sessions')
    .select('session_date, max_force')
    .eq('patient_id', user.id)
    .gte('session_date', thirtyDaysAgo.toISOString())
    .order('session_date', { ascending: true });          

  if (error) {
    console.error(error);
    return;
  }

  this.progressData = this.groupByDay(data || []);
}

  // mock ก่อน
  loadMockData() {
    const data = [
      { session_date: '2026-05-01', max_force: 10 },
      { session_date: '2026-05-01', max_force: 12 },
      { session_date: '2026-05-02', max_force: 15 },
      { session_date: '2026-05-02', max_force: 14 },
      { session_date: '2026-05-03', max_force: 20 }
    ];

    this.progressData = this.groupByDay(data);
  }

  // avg ต่อวัน
  groupByDay(data: any[]) {
    const map = new Map<string, number[]>();

    data.forEach(d => {
      const day = new Date(d.session_date).toISOString().slice(5, 10);

      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(Number(d.max_force));
    });

    return Array.from(map.entries())
  .sort((a, b) => a[0].localeCompare(b[0])) 
  .map(([day, values]) => ({
    day,
    avg_force: values.reduce((a, b) => a + b, 0) / values.length
  }));
  }

  // best day
  getBestDay() {
    if (!this.progressData.length) return null;

    return this.progressData.reduce((best, curr) =>
      curr.avg_force > best.avg_force ? curr : best
    );
  }

  // render chart
  renderChart() {
    const isDark = document.documentElement.classList.contains('dark');

    this.chart = new Chart('progressChart', {
      type: 'line',
      data: {
        labels: this.progressData.map(d => d.day),
        datasets: [{
          label: 'Avg Force (N)',
          data: this.progressData.map(d => d.avg_force),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.2)',
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: {
              color: isDark ? '#cbd5f5' : '#334155'
            },
            grid: {
              color: isDark ? '#334155' : '#e2e8f0'
            }
          },
          y: {
            ticks: {
              color: isDark ? '#cbd5f5' : '#334155'
            },
            grid: {
              color: isDark ? '#334155' : '#e2e8f0'
            }
          }
        }
      }
    });
  }
}