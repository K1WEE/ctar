import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BleService } from '../../services/ble.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
        <div class="flex items-center justify-between mb-6">
          <button (click)="goBack()" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div class="w-14 h-14 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shadow-inner border border-blue-200 dark:border-blue-500/30">
            <i class="fa-brands fa-bluetooth-b text-2xl"></i>
          </div>
          <div class="w-10 h-10"></div> <!-- Spacer for centering -->
        </div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">Connect Device</h2>
        <p class="text-slate-500 dark:text-slate-400 mb-8">Please connect your CTAR hardware to begin your therapy session.</p>
        
        <div *ngIf="bleService.connectionState() !== 'Connected'" class="space-y-3 w-full">
          <button
            (click)="connect()"
            class="px-8 py-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center text-lg">
            <i class="fa-solid fa-link mr-3"></i> Connect via Bluetooth
          </button>
          <button *ngIf="supabase.userRole() === 'admin'"
            (click)="simulate()"
            class="px-8 py-3 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all duration-300 flex items-center justify-center text-sm border border-slate-200 dark:border-slate-700 mt-3">
            <i class="fa-solid fa-flask mr-2"></i> Simulate Device (Admin Only)
          </button>
        </div>

        <div *ngIf="bleService.connectionState() === 'Connected'" 
          class="px-8 py-4 w-full bg-emerald-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center text-lg animate-fade-in">
          <i class="fa-solid fa-check mr-3"></i> Connected!
        </div>

        <div *ngIf="bleService.error()" class="mt-6 bg-red-500/10 border-l-4 border-red-500 text-red-500 p-4 rounded-xl text-left text-sm">
          <p class="font-bold flex items-center"><i class="fa-solid fa-circle-exclamation mr-2"></i> Error</p>
          <p class="mt-1">{{ bleService.error() }}</p>
        </div>
      </div>
    </div>
  `
})
export class ConnectComponent {
  constructor(public bleService: BleService, public supabase: SupabaseService, private router: Router) {
    effect(() => {
      if (this.bleService.connectionState() === 'Connected') {
        setTimeout(() => this.router.navigate(['/calibrate']), 1000);
      }
    });
  }

  connect() {
    this.bleService.connect();
  }

  simulate() {
    this.bleService.simulateDevice();
  }

  disconnect() {
    this.bleService.disconnect();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
