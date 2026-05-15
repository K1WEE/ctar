import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { SupabaseService } from '../../services/supabase.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-progress-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-chart.component.html',
})
export class ProgressChartComponent implements OnInit {

  constructor(private supabase: SupabaseService) {}

  public i18n = inject(I18nService);
  progressData: any[] = [];
  chart: any;
  viewMode: 'day' | 'week' | 'month' = 'day';

  async ngOnInit() {
    await this.loadProgress();
    this.renderChart();
  }

  async setViewMode(mode: 'day' | 'week' | 'month') {
    this.viewMode = mode;
    await this.loadProgress();
    this.updateChart();
  }

  async loadProgress() {
    const user = this.supabase.currentUser(); 
    if (!user) return;

    const pastDate = new Date();
    if (this.viewMode === 'day') {
      pastDate.setDate(pastDate.getDate() - 30);
    } else if (this.viewMode === 'week') {
      pastDate.setDate(pastDate.getDate() - 84); // 12 weeks
    } else if (this.viewMode === 'month') {
      pastDate.setFullYear(pastDate.getFullYear() - 1); // 1 year
    }

    const { data, error } = await this.supabase.client
      .from('sessions')
      .select('session_date, max_force')
      .eq('patient_id', user.id)
      .gte('session_date', pastDate.toISOString())
      .order('session_date', { ascending: true });          

    if (error) {
      console.error(error);
      return;
    }

    this.progressData = this.groupData(data || []);
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

    this.progressData = this.groupData(data);
  }

  groupData(data: any[]) {
    const map = new Map<string, { sum: number, count: number, timestamp: number }>();

    data.forEach(d => {
      const date = new Date(d.session_date);
      let key = '';

      if (this.viewMode === 'day') {
        key = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      } else if (this.viewMode === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = `W. ${startOfWeek.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
      } else if (this.viewMode === 'month') {
        key = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      }

      if (!map.has(key)) {
        map.set(key, { sum: 0, count: 0, timestamp: date.getTime() });
      }
      const entry = map.get(key)!;
      entry.sum += Number(d.max_force);
      entry.count += 1;
      if (date.getTime() < entry.timestamp) {
        entry.timestamp = date.getTime();
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .map(([label, val]) => ({
        day: label,
        avg_force: val.sum / val.count
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
  updateChart() {
    if (this.chart) {
      this.chart.data.labels = this.progressData.map(d => d.day);
      this.chart.data.datasets[0].data = this.progressData.map(d => d.avg_force);
      this.chart.update();
    } else {
      this.renderChart();
    }
  }

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
          legend: {
            position: 'top',
            align: 'start',
            labels: { color: isDark ? '#94a3b8' : '#64748b', usePointStyle: true, boxWidth: 8 }
          }
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