import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BleService } from './services/ble.service';
import { CtarLogicService } from './services/ctar-logic.service';
import { HeaderComponent } from './components/header/header.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { ControlPanelComponent } from './components/control-panel/control-panel.component';
import { ChartComponent } from './components/chart/chart.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HeaderComponent, StatCardComponent, ControlPanelComponent, ChartComponent],
  template: `
    <div class="min-h-screen pb-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <app-header [connectionState]="bleService.connectionState"></app-header>
        
        <main class="mt-6 flex flex-col gap-6">
          <app-control-panel 
            [isConnected]="bleService.connectionState() === 'Connected'"
            (onConnect)="connect()"
            (onDisconnect)="disconnect()"
            (onExport)="exportData()">
          </app-control-panel>

          <div *ngIf="bleService.error()" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm" role="alert">
            <p class="font-bold">Error</p>
            <p>{{ bleService.error() }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <app-stat-card 
              title="Current Force" 
              [value]="ctar.currentForce()" 
              unit="N" 
              iconClass="fa-bolt" 
              colorClass="border-blue-500"
              iconColorClass="text-blue-500">
            </app-stat-card>
            
            <app-stat-card 
              title="Peak Force" 
              [value]="ctar.peakForce()" 
              unit="N" 
              iconClass="fa-arrow-trend-up" 
              colorClass="border-emerald-500"
              iconColorClass="text-emerald-500">
            </app-stat-card>
            
            <app-stat-card 
              title="Repetitions" 
              [value]="ctar.repCount()" 
              unit="reps" 
              iconClass="fa-dumbbell" 
              colorClass="border-amber-500"
              iconColorClass="text-amber-500">
            </app-stat-card>
          </div>

          <div class="mt-2">
            <app-chart [latestDataPoint]="ctar.latestDataPoint"></app-chart>
          </div>
        </main>
      </div>
    </div>
  `
})
export class AppComponent {
  constructor(public bleService: BleService, public ctar: CtarLogicService) {}

  connect() {
    this.bleService.connect();
  }

  disconnect() {
    this.bleService.disconnect();
  }

  exportData() {
    this.ctar.exportCsv();
  }
}
