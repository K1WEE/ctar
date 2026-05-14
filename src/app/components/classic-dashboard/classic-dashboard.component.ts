import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BleService } from '../../services/ble.service';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { StatCardComponent } from '../stat-card/stat-card.component';
import { ControlPanelComponent } from '../control-panel/control-panel.component';
import { ChartComponent } from '../chart/chart.component';
import { ProgressChartComponent } from '../progress-chart/progress-chart.component';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-classic-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, ControlPanelComponent, ChartComponent,ProgressChartComponent],
  template: `
    <div class="flex flex-col gap-6 animate-fade-in">
      <app-control-panel 
        [isConnected]="bleService.connectionState() === 'Connected'"
        [isAdmin]="supabase.userRole() === 'admin'"
        (onConnect)="connect()"
        (onSimulate)="simulate()"
        (onDisconnect)="disconnect()"
        (onExport)="exportData()">
      </app-control-panel>

      <div *ngIf="bleService.error()" class="bg-red-500/10 border-l-4 border-red-500 text-red-400 p-4 rounded-xl shadow-lg backdrop-blur-md" role="alert">
        <p class="font-bold flex items-center"><i class="fa-solid fa-circle-exclamation mr-2"></i> Error</p>
        <p class="mt-1">{{ bleService.error() }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <app-stat-card 
          title="Current Force" 
          [value]="ctar.currentForce()" 
          unit="N" 
          iconClass="fa-bolt" 
          colorClass="border-blue-500/50 bg-blue-500/10"
          iconColorClass="text-blue-400">
        </app-stat-card>
        
        <app-stat-card 
          title="Peak Force" 
          [value]="ctar.peakForce()" 
          unit="N" 
          iconClass="fa-arrow-trend-up" 
          colorClass="border-emerald-500/50 bg-emerald-500/10"
          iconColorClass="text-emerald-400">
        </app-stat-card>
      </div>

      <div class="w-full">
        <app-chart class="block w-full h-[400px]" [latestDataPoint]="ctar.latestDataPoint"></app-chart>
      </div>
      <app-progress-chart></app-progress-chart>

    </div>
  `
})
export class ClassicDashboardComponent {
  constructor(
  public bleService: BleService,
  public ctar: CtarLogicService,
  public supabase: SupabaseService
) {}

  connect() {
    this.bleService.connect();
  }

  simulate() {
    this.bleService.simulateDevice();
  }

  disconnect() {
    this.bleService.disconnect();
  }

  exportData() {
  this.ctar.exportCsv();
  }
}
