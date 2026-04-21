import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow p-5 flex flex-wrap gap-4 items-center justify-center">
      <button 
        *ngIf="!isConnected"
        (click)="onConnect.emit()"
        class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2">
        <i class="fa-brands fa-bluetooth"></i>
        Connect Device
      </button>

      <button 
        *ngIf="isConnected"
        (click)="onDisconnect.emit()"
        class="bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2">
        <i class="fa-solid fa-link-slash"></i>
        Disconnect
      </button>

      <div class="w-px h-10 bg-slate-200 hidden sm:block"></div>

      <button 
        (click)="onExport.emit()"
        class="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2">
        <i class="fa-solid fa-file-csv"></i>
        Export CSV
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
