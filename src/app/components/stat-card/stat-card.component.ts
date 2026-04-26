import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-brand-card backdrop-blur-xl rounded-2xl shadow-xl p-6 flex items-center justify-between border-t border-l border-white/10 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group">
      <!-- Background subtle glow -->
      <div class="absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[40px] opacity-20 transition-all duration-500 group-hover:scale-150 group-hover:opacity-40" [ngClass]="colorClass"></div>
      
      <div class="relative z-10">
        <p class="text-sm text-slate-400 font-medium mb-1 tracking-wide uppercase">{{ title }}</p>
        <div class="flex items-baseline gap-1">
          <span class="text-4xl font-extrabold text-white tracking-tight">{{ value }}</span>
          <span class="text-sm font-semibold text-brand-accent ml-1">{{ unit }}</span>
        </div>
      </div>
      <div class="relative z-10 text-4xl p-4 rounded-2xl backdrop-blur-md border border-white/5 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" [ngClass]="[colorClass, iconColorClass]">
        <i class="fa-solid drop-shadow-[0_0_10px_currentColor]" [ngClass]="iconClass"></i>
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
