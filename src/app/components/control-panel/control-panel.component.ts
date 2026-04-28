import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300">
      <div class="flex items-center space-x-4 w-full md:w-auto">
        <div class="w-10 h-10 rounded-full flex items-center justify-center border transition-colors duration-300"
             [ngClass]="isConnected ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'">
          <i class="fa-brands fa-bluetooth-b text-lg"></i>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-300">Device Connection</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-300">Connect your CTAR hardware via Bluetooth</p>
        </div>
      </div>

      <div class="flex items-center space-x-3 w-full md:w-auto">
        <button *ngIf="!isConnected" (click)="onConnect.emit()" class="flex-1 md:flex-none px-6 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white font-medium rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <i class="fa-solid fa-link mr-2"></i> Connect
        </button>
        <button *ngIf="isConnected" (click)="onDisconnect.emit()" class="flex-1 md:flex-none px-6 py-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 font-medium rounded-xl transition-all duration-300 shadow-sm transition-colors">
          <i class="fa-solid fa-link-slash mr-2"></i> Disconnect
        </button>
        <button (click)="onExport.emit()" class="flex-1 md:flex-none px-6 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-all duration-300 shadow-sm transition-colors">
          <i class="fa-solid fa-download mr-2"></i> Export CSV
        </button>
      </div>
    </div>
  `
})
export class ControlPanelComponent {
  @Input() isConnected: boolean = false;
  @Output() onConnect = new EventEmitter<void>();
  @Output() onDisconnect = new EventEmitter<void>();
  @Output() onExport = new EventEmitter<void>();
}
