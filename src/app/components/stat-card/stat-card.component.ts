import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden group transition-colors duration-300">
      <div class="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[40px] opacity-20 dark:opacity-30 transition-all duration-500 group-hover:opacity-40" [ngClass]="colorClass"></div>
      
      <div class="flex justify-between items-start relative z-10">
        <div>
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 tracking-wide uppercase transition-colors duration-300">{{ title }}</p>
          <div class="flex items-baseline space-x-2">
            <h2 class="text-4xl font-bold text-slate-900 dark:text-white transition-colors duration-300">{{ value | number:'1.1-1' }}</h2>
            <span class="text-slate-400 dark:text-slate-500 font-semibold transition-colors duration-300">{{ unit }}</span>
          </div>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner transition-colors duration-300"
             [ngClass]="colorClass">
          <i class="fa-solid text-xl" [ngClass]="[iconClass, iconColorClass]"></i>
        </div>
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
