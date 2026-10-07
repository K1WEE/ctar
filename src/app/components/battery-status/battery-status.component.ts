import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BatteryLevel, BleService } from '../../services/ble.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-battery-status',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="presentation === 'badge'" class="inline-flex items-center">
      <div class="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors"
           [ngClass]="badgeToneClass"
           [title]="text('สถานะอุปกรณ์บลูทูธ', 'Bluetooth device status') + ': ' + statusLabel">
        <span class="relative flex h-2 w-2">
          <span *ngIf="ble.connectionState() === 'Connected'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2"
                [ngClass]="ble.connectionState() === 'Connected' ? 'bg-emerald-500' : (ble.connectionState() === 'Scanning' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400')"></span>
        </span>
        <svg class="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M17 6H7c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-1h1c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1h-1V8c0-1.1-.9-2-2-2zm-1 9H8c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1z"></path>
        </svg>
        <span>{{ badgeText }}</span>
      </div>
    </div>
    <div *ngIf="presentation !== 'badge'" class="text-base font-semibold" [ngClass]="onBlue ? 'text-white' : compact ? 'text-slate-700 dark:text-slate-200' : 'rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200'">
      <div *ngIf="presentation !== 'notice'" class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span *ngIf="showConnection && !compact" class="inline-flex items-center gap-2">
          <i class="fa-brands fa-bluetooth-b" aria-hidden="true"></i>
          {{ ble.connectionState() === 'Connected' ? text('เชื่อมต่อแล้ว', 'Connected') :
             ble.connectionState() === 'Scanning' ? text('กำลังเชื่อมต่อ', 'Connecting') : text('ยังไม่ได้เชื่อมต่ออุปกรณ์', 'Device disconnected') }}
        </span>
        <span class="inline-flex min-h-12 items-center gap-2" [class.min-w-10]="iconOnly" [class.justify-center]="iconOnly" [class.rounded-lg]="onBlue" [class.bg-white]="onBlue" [class.px-2]="onBlue">
          <span role="img" [attr.aria-label]="statusLabel" [title]="statusLabel" class="inline-flex shrink-0" [ngClass]="iconTone">
            <svg [attr.width]="iconOnly ? 28 : 48" [attr.height]="iconOnly ? 20 : 28" viewBox="0 0 48 28" fill="none" aria-hidden="true" focusable="false">
              <rect x="2" y="3" width="39" height="22" rx="4" stroke="currentColor" [attr.stroke-width]="iconOnly ? 3 : 2.5"/>
              <path d="M45 10v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <rect *ngIf="bars >= 1" x="7" y="8" width="7" height="12" rx="1" fill="currentColor"/>
              <rect *ngIf="bars >= 2" x="17" y="8" width="7" height="12" rx="1" fill="currentColor"/>
              <rect *ngIf="bars >= 3" x="27" y="8" width="7" height="12" rx="1" fill="currentColor"/>
              <text *ngIf="displayPercent === null && ble.connectionState() === 'Connected'" x="21.5" y="19" text-anchor="middle" fill="currentColor" font-size="16" font-weight="700">?</text>
              <path *ngIf="ble.connectionState() !== 'Connected'" d="m16 9 10 10m0-10L16 19" stroke="currentColor" [attr.stroke-width]="iconOnly ? 3 : 2" stroke-linecap="round"/>
            </svg>
          </span>
          <span *ngIf="!iconOnly && ble.connectionState() !== 'Connected'" class="text-slate-700 dark:text-slate-200" [class.dark:text-slate-700]="onBlue">{{ statusLabel }}</span>
          <span *ngIf="!compact && ble.connectionState() === 'Connected'" [ngClass]="onBlue ? 'text-slate-700' : ''">{{ statusLabel }}</span>
        </span>
        <span *ngIf="ble.isSimulated() && !iconOnly" [ngClass]="onBlue ? 'text-white' : 'text-slate-600 dark:text-slate-300'">{{ text('(จำลอง)', '(Simulated)') }}</span>
      </div>
      <div *ngIf="presentation !== 'indicator' && warningMessage" class="py-2 flex flex-wrap items-start justify-between gap-2" [ngClass]="tone()">
        <p class="min-w-0 flex-1 leading-relaxed" [class.basis-48]="!compact">{{ warningMessage }}</p>
        <button *ngIf="ble.batteryNotice() && !compact" type="button" (click)="ble.dismissBatteryNotice()"
          class="shrink-0 min-h-12 rounded-lg px-3 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          {{ text('รับทราบ', 'Got it') }}
        </button>
      </div>
      <!-- Only a newly reached warning level is announced, never every force frame. -->
      <span *ngIf="presentation !== 'indicator'" class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ compact && ble.connectionState() !== 'Connected' ? '' : message(ble.batteryNotice()) }}</span>
      <label *ngIf="ble.isSimulated() && !compact" class="mt-2 flex flex-wrap items-center gap-2">
        {{ text('ทดสอบระดับแบต', 'Test battery level') }}
        <select #batterySelect [value]="ble.batteryPercent()" (change)="ble.setMockBatteryPercent(+batterySelect.value)"
          class="min-h-12 rounded-lg border border-slate-400 bg-white px-3 text-slate-800 dark:bg-slate-900 dark:text-slate-100 focus-visible:outline focus-visible:outline-2">
          <option value="100">{{ text('สูง', 'High') }}</option><option value="50">{{ text('กลาง', 'Medium') }}</option><option value="20">{{ text('ต่ำ', 'Low') }}</option>
          <option value="10">{{ text('ใกล้หมด', 'Very low') }}</option><option value="0">{{ text('หมด', 'Empty') }}</option>
        </select>
      </label>
    </div>
  `
})
export class BatteryStatusComponent {
  @Input() showConnection = false;
  @Input() iconOnly = false;
  @Input() onBlue = false;
  @Input() presentation: 'default' | 'compact' | 'indicator' | 'notice' | 'badge' = 'default';

  get badgeToneClass(): string {
    if (this.ble.connectionState() === 'Connected') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
    }
    if (this.ble.connectionState() === 'Scanning') {
      return 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  get badgeText(): string {
    if (this.ble.connectionState() === 'Connected') {
      const pct = this.displayPercent;
      return pct !== null ? `${pct}% ${this.text('ต่อแล้ว', 'Connected')}` : this.text('ต่อแล้ว', 'Connected');
    }
    if (this.ble.connectionState() === 'Scanning') {
      return this.text('กำลังเชื่อมต่อ', 'Connecting');
    }
    return this.text('ไม่ได้เชื่อมต่อ', 'Disconnected');
  }

  get compact(): boolean { return this.presentation !== 'default'; }
  get displayPercent(): number | null {
    return this.ble.connectionState() !== 'Connected' ? null : this.ble.batteryPercent();
  }
  get warningMessage(): string {
    return this.ble.connectionState() !== 'Connected' ? '' : this.message(this.ble.batteryLevel());
  }
  get bars(): number {
    const value = this.displayPercent;
    return value === null || value === 0 ? 0 : value <= 20 ? 1 : value <= 60 ? 2 : 3;
  }
  get iconTone(): string {
    if (this.displayPercent === null) return this.onBlue ? 'text-slate-600' : 'text-slate-600 dark:text-slate-300';
    if (this.displayPercent <= 20) return this.onBlue ? 'text-red-700' : 'text-red-700 dark:text-red-400';
    if (this.displayPercent <= 60) return this.onBlue ? 'text-yellow-700' : 'text-yellow-700 dark:text-yellow-300';
    return this.onBlue ? 'text-emerald-700' : 'text-emerald-700 dark:text-emerald-400';
  }
  get statusLabel(): string {
    if (this.ble.connectionState() !== 'Connected') return this.text('ไม่ได้เชื่อมต่อ', 'Disconnected');
    if (this.displayPercent === null) return this.text('ไม่ทราบระดับแบตเตอรี่', 'Battery level unknown');
    if (this.displayPercent === 0) return this.text('แบตเตอรี่หมด', 'Battery empty');
    return this.bars === 1 ? this.text('แบตเตอรี่ต่ำ', 'Battery low')
      : this.bars === 2 ? this.text('แบตเตอรี่ปานกลาง', 'Battery medium')
      : this.text('แบตเตอรี่สูง', 'Battery high');
  }
  public ble = inject(BleService);
  private i18n = inject(I18nService);

  text(th: string, en: string): string {
    return this.i18n.currentLang() === 'th' ? th : en;
  }

  message(level: BatteryLevel | null): string {
    switch (level) {
      case 'low': return this.text('แบตเตอรี่ต่ำ ควรชาร์จ', 'Battery low. Please charge soon.');
      case 'critical': return this.text('แบตเตอรี่ใกล้หมด กรุณาชาร์จ', 'Battery very low. Please charge.');
      case 'empty': return this.text('แบตเตอรี่หมด กรุณาชาร์จหรือตรวจสอบแบตเตอรี่', 'Battery empty. Please charge or check the battery.');
      default: return '';
    }
  }

  tone(): string {
    if (this.onBlue) return 'text-white';
    const level = this.ble.batteryLevel();
    return level === 'empty' || level === 'critical'
      ? 'text-rose-800 dark:text-rose-300'
      : level === 'low' ? 'text-amber-800 dark:text-amber-300' : '';
  }
}
