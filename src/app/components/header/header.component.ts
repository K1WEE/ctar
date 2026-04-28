import { Component, Input, Output, EventEmitter, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-center rounded-2xl shadow-lg transition-colors duration-300 gap-4 w-full">
      <div class="flex items-center space-x-4 w-full md:w-auto justify-center md:justify-start">
        <!-- Logo Icon with glow -->
        <div class="relative group flex-shrink-0">
          <div class="absolute -inset-1 bg-gradient-to-r from-brand-accent to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div class="relative w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-inner transition-colors duration-300">
            <i class="fa-solid fa-staff-snake text-2xl text-brand-accent"></i>
          </div>
        </div>
        
        <!-- Title -->
        <div class="flex-shrink-0">
          <h1 class="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-300">CTAR Dashboard</h1>
          <p class="text-[10px] md:text-xs text-brand-accent font-medium tracking-widest uppercase">Medical IoT System</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-3 md:space-x-4 w-full md:w-auto justify-center md:justify-end overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
        <!-- Theme Toggle -->
        <button (click)="themeService.toggleTheme()" class="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-accent dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50">
          <i class="fa-solid" [ngClass]="themeService.isDarkMode() ? 'fa-sun' : 'fa-moon'"></i>
        </button>

        <!-- Status Indicator -->
        <div class="flex-shrink-0 flex items-center px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-inner transition-colors duration-300">
          <div class="relative flex h-3 w-3 mr-2 md:mr-3">
            <span *ngIf="connectionState() === 'Connected'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3"
                  [ngClass]="{
                    'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]': connectionState() === 'Connected',
                    'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]': connectionState() === 'Scanning',
                    'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]': connectionState() === 'Disconnected'
                  }">
            </span>
          </div>
          <span class="text-xs md:text-sm font-semibold tracking-wide"
                [ngClass]="{
                  'text-emerald-600 dark:text-emerald-400': connectionState() === 'Connected',
                  'text-amber-600 dark:text-amber-400': connectionState() === 'Scanning',
                  'text-rose-600 dark:text-rose-400': connectionState() === 'Disconnected'
                }">
            {{ connectionState() }}
          </span>
        </div>

        <!-- Logout Button -->
        <button (click)="onLogout.emit()" class="flex-shrink-0 px-3 py-2 md:px-4 bg-slate-100 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/50 rounded-xl transition-all shadow-sm text-sm font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-rose-500/50">
           <i class="fa-solid fa-right-from-bracket md:mr-2"></i> <span class="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class HeaderComponent {
  @Input({required: true}) connectionState!: Signal<string>;
  @Output() onLogout = new EventEmitter<void>();
  public themeService = inject(ThemeService);
}
