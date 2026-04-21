import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow p-5 flex items-center justify-between border-l-4"
         [ngClass]="colorClass">
      <div>
        <p class="text-sm text-slate-500 font-medium mb-1">{{ title }}</p>
        <div class="flex items-baseline gap-1">
          <span class="text-3xl font-bold text-slate-800">{{ value }}</span>
          <span class="text-sm font-semibold text-slate-400">{{ unit }}</span>
        </div>
      </div>
      <div class="text-3xl opacity-80" [ngClass]="iconColorClass">
        <i class="fa-solid" [ngClass]="iconClass"></i>
      </div>
    </div>
  `
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: number | string = 0;
  @Input() unit: string = '';
  @Input() iconClass: string = '';
  @Input() colorClass: string = 'border-blue-500';
  @Input() iconColorClass: string = 'text-blue-500';
}
