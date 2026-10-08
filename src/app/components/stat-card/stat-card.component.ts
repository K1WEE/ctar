import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cl-card cl-card-pad h-full">
      <div class="flex items-start justify-between gap-3">
        <p class="font-semibold pp-muted">{{ title }}</p>
        <span class="cl-icon-tile" [ngClass]="colorClass" aria-hidden="true">
          <i class="fa-solid" [ngClass]="[iconClass, iconColorClass]"></i>
        </span>
      </div>
      <div class="mt-3 flex items-baseline gap-2">
        <p class="cl-kpi-value">{{ value | number:'1.1-1' }}</p>
        <span class="font-semibold pp-muted">{{ unit }}</span>
      </div>
    </div>
  `
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: number | string = 0;
  @Input() unit: string = '';
  @Input() iconClass: string = '';
  @Input() colorClass: string = '';
  @Input() iconColorClass: string = '';
}
