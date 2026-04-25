import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BleService } from './services/ble.service';
import { CtarLogicService } from './services/ctar-logic.service';
import { HeaderComponent } from './components/header/header.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { ControlPanelComponent } from './components/control-panel/control-panel.component';
import { ChartComponent } from './components/chart/chart.component';
import { ZenBalloonComponent } from './components/zen-balloon/zen-balloon.component';
import { ResearcherDashboardComponent } from './components/researcher-dashboard/researcher-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HeaderComponent, StatCardComponent, ControlPanelComponent, ChartComponent, ZenBalloonComponent, ResearcherDashboardComponent],
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

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 items-stretch">
            <app-chart class="flex-1" [latestDataPoint]="ctar.latestDataPoint"></app-chart>
            
            <app-zen-balloon 
              class="flex-1 flex"
              [currentForce]="ctar.currentForce" 
              (repCompleted)="onGameRep()">
            </app-zen-balloon>
          </div>
        </main>

        <main *ngIf="currentView === 'researcher'">
          <app-researcher-dashboard></app-researcher-dashboard>
        </main>
      </div>
    </div>
  `
})
export class AppComponent {
  public currentView: 'patient' | 'researcher' = 'patient';

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

  onGameRep() {
    // Allows the gamification layer to directly inform backend logic safely
    this.ctar.repCount.update(count => count + 1);
  }
}
