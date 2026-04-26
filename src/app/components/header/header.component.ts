import { Component, Input, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ConnectionState = 'Disconnected' | 'Scanning' | 'Connected';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-brand-card backdrop-blur-xl border border-white/10 text-white p-5 shadow-2xl flex justify-between items-center rounded-2xl mb-2 relative overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute -top-10 -left-10 w-40 h-40 bg-brand-accent rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
      
      <div class="flex items-center gap-4 relative z-10">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
          <i class="fa-solid fa-wave-square text-white text-xl"></i>
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">CTAR Dashboard</h1>
          <p class="text-xs text-brand-accent uppercase tracking-widest font-semibold mt-0.5">Chin Tuck Against Resistance</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-md border border-white/10 transition-all duration-300 shadow-inner relative z-10"
           [ngClass]="{
             'bg-slate-800/50 text-slate-400': connectionState() === 'Disconnected',
             'bg-blue-900/30 text-blue-400 border-blue-500/30': connectionState() === 'Scanning',
             'bg-emerald-900/30 text-emerald-400 border-emerald-500/30': connectionState() === 'Connected'
           }">
         <div class="w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300"
           [ngClass]="{
             'bg-slate-500': connectionState() === 'Disconnected',
             'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]': connectionState() === 'Scanning',
             'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]': connectionState() === 'Connected'
           }"
         ></div>
        <span class="tracking-wide">{{ connectionState() | uppercase }}</span>
      </div>
    </header>
  `
})
export class HeaderComponent {
  @Input({required: true}) connectionState!: Signal<ConnectionState>;
}
