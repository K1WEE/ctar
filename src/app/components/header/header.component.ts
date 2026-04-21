import { Component, Input, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ConnectionState = 'Disconnected' | 'Scanning' | 'Connected';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-slate-800 text-slate-100 p-4 shadow-md flex justify-between items-center rounded-b-xl mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold tracking-wide">CTAR Dashboard</h1>
      </div>
      <div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-slate-700 border"
           [ngClass]="{
             'border-slate-500 text-slate-400': connectionState() === 'Disconnected',
             'border-blue-500 text-blue-400': connectionState() === 'Scanning',
             'border-emerald-500 text-emerald-400': connectionState() === 'Connected'
           }">
         <div class="w-3 h-3 rounded-full flex-shrink-0"
           [ngClass]="{
             'bg-slate-500': connectionState() === 'Disconnected',
             'bg-blue-500 animate-pulse': connectionState() === 'Scanning',
             'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]': connectionState() === 'Connected'
           }"
         ></div>
        <span>{{ connectionState() }}</span>
      </div>
    </header>
  `
})
export class HeaderComponent {
  @Input({required: true}) connectionState!: Signal<ConnectionState>;
}
