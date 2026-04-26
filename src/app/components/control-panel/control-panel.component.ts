import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-brand-card backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-6 flex flex-wrap gap-5 items-center justify-center">
      <button 
        *ngIf="!isConnected"
        (click)="onConnect.emit()"
        class="group bg-blue-600/20 border border-blue-500/50 hover:bg-blue-500 text-blue-400 hover:text-white font-semibold py-3 px-8 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all duration-300 flex items-center gap-3">
        <i class="fa-brands fa-bluetooth group-hover:animate-bounce"></i>
        <span>Connect Device</span>
      </button>

      <button 
        *ngIf="isConnected"
        (click)="onDisconnect.emit()"
        class="bg-rose-500/20 border border-rose-500/50 hover:bg-rose-500 text-rose-400 hover:text-white font-semibold py-3 px-8 rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] transition-all duration-300 flex items-center gap-3">
        <i class="fa-solid fa-link-slash"></i>
        <span>Disconnect</span>
      </button>

      <div class="w-px h-12 bg-white/10 hidden sm:block"></div>

      <button 
        (click)="onExport.emit()"
        class="bg-slate-700/50 border border-slate-600 hover:bg-slate-600 text-slate-300 hover:text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 flex items-center gap-3">
        <i class="fa-solid fa-file-csv text-emerald-400"></i>
        <span>Export CSV</span>
      </button>
    </div>
  `
})
export class ControlPanelComponent {
  @Input() isConnected: boolean = false;
  @Output() onConnect = new EventEmitter<void>();
  @Output() onDisconnect = new EventEmitter<void>();
  @Output() onExport = new EventEmitter<void>();
}
