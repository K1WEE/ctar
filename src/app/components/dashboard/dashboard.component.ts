import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BleService } from '../../services/ble.service';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { DataSyncService } from '../../services/data-sync.service';
import { SupabaseService } from '../../services/supabase.service';
import { HeaderComponent } from '../header/header.component';
import { StatCardComponent } from '../stat-card/stat-card.component';
import { ControlPanelComponent } from '../control-panel/control-panel.component';
import { ChartComponent } from '../chart/chart.component';
import { ZenBalloonComponent } from '../zen-balloon/zen-balloon.component';
import { ResearcherDashboardComponent } from '../researcher-dashboard/researcher-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, StatCardComponent, ControlPanelComponent, ChartComponent, ZenBalloonComponent, ResearcherDashboardComponent],
  template: `
    <div class="min-h-screen pb-10 relative z-10 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div class="mb-6 block w-full">
           <app-header [connectionState]="bleService.connectionState" (onLogout)="logout()"></app-header>
        </div>
        
        <!-- View Toggle & Save Button -->
        <div class="flex flex-col sm:flex-row justify-between items-center my-8 bg-white/70 dark:bg-brand-card backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg transition-colors duration-300">
          
          <!-- Doctor Role: View Toggle -->
          <div *ngIf="isDoctor()" class="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl flex space-x-1 border border-slate-200 dark:border-white/5 shadow-inner mb-4 sm:mb-0 transition-colors duration-300">
            <button 
              (click)="currentView = 'patient'"
              [class.bg-brand-accent]="currentView === 'patient'"
              [class.text-white]="currentView === 'patient'"
              [class.text-slate-500]="currentView !== 'patient'"
              [class.dark:text-slate-400]="currentView !== 'patient'"
              [class.hover:text-slate-800]="currentView !== 'patient'"
              [class.dark:hover:text-white]="currentView !== 'patient'"
              class="px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center space-x-2">
              <i class="fa-solid fa-user"></i>
              <span>Patient View</span>
            </button>
            <button 
              (click)="currentView = 'researcher'"
              [class.bg-indigo-500]="currentView === 'researcher'"
              [class.text-white]="currentView === 'researcher'"
              [class.text-slate-500]="currentView !== 'researcher'"
              [class.dark:text-slate-400]="currentView !== 'researcher'"
              [class.hover:text-slate-800]="currentView !== 'researcher'"
              [class.dark:hover:text-white]="currentView !== 'researcher'"
              class="px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center space-x-2">
              <i class="fa-solid fa-microscope"></i>
              <span>Researcher View</span>
            </button>
          </div>

          <!-- Patient Role: Simple Title -->
          <div *ngIf="!isDoctor()" class="flex items-center space-x-3 mb-4 sm:mb-0 px-2">
             <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
               <i class="fa-solid fa-bed-pulse text-lg"></i>
             </div>
             <div>
               <h3 class="font-bold text-slate-800 dark:text-white">Active Session</h3>
               <p class="text-xs text-slate-500 dark:text-slate-400">Patient Mode</p>
             </div>
          </div>
          
          <div class="flex items-center space-x-4" *ngIf="currentView === 'patient'">
             <div class="text-sm font-medium">
               <span *ngIf="isSaving" class="text-blue-500 dark:text-blue-400 animate-pulse transition-colors duration-300"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...</span>
               <span *ngIf="saveSuccess" class="text-emerald-600 dark:text-emerald-400 transition-colors duration-300"><i class="fa-solid fa-check mr-1"></i> Saved!</span>
               <span *ngIf="saveError" class="text-rose-600 dark:text-rose-400 transition-colors duration-300"><i class="fa-solid fa-xmark mr-1"></i> {{ saveError }}</span>
             </div>
             <button 
               (click)="saveSessionToCloud()" 
               [disabled]="ctar.repCount() === 0 || isSaving"
               class="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/50 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white font-medium rounded-xl transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center space-x-2">
               <i class="fa-solid fa-cloud-arrow-up"></i>
               <span>Save Session</span>
             </button>
          </div>
        </div>

        <main *ngIf="currentView === 'patient'" class="flex flex-col gap-6 animate-fade-in">
          <app-control-panel 
            [isConnected]="bleService.connectionState() === 'Connected'"
            (onConnect)="connect()"
            (onDisconnect)="disconnect()"
            (onExport)="exportData()">
          </app-control-panel>

          <div *ngIf="bleService.error()" class="bg-red-500/10 border-l-4 border-red-500 text-red-400 p-4 rounded-xl shadow-lg backdrop-blur-md" role="alert">
            <p class="font-bold flex items-center"><i class="fa-solid fa-circle-exclamation mr-2"></i> Error</p>
            <p class="mt-1">{{ bleService.error() }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            
            <app-stat-card 
              title="Repetitions" 
              [value]="ctar.repCount()" 
              unit="reps" 
              iconClass="fa-dumbbell" 
              colorClass="border-amber-500/50 bg-amber-500/10"
              iconColorClass="text-amber-400">
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

        <main *ngIf="currentView === 'researcher'" class="animate-fade-in">
          <app-researcher-dashboard></app-researcher-dashboard>
        </main>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  public currentView: 'patient' | 'researcher' = 'patient';
  public userRole = 'patient'; // Default until fetched
  
  public isSaving = false;
  public saveSuccess = false;
  public saveError = '';

  constructor(
    public bleService: BleService, 
    public ctar: CtarLogicService,
    private dataSync: DataSyncService,
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.currentView = 'patient';
  }

  async ngOnInit() {
    const user = this.supabase.currentUser();
    if (user) {
      this.userRole = await this.supabase.getUserRole(user.id);
    }
  }

  isDoctor(): boolean {
    return this.userRole === 'doctor';
  }

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
    this.ctar.repCount.update((count: number) => count + 1);
  }

  async logout() {
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/login']);
  }

  async saveSessionToCloud() {
    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = false;

    // Use actual logged in user
    const user = this.supabase.currentUser();
    if (!user) {
      this.saveError = 'You must be logged in to save.';
      this.isSaving = false;
      return;
    }

    const patientId = user.id;
    const rawData = (this.ctar as any).dataHistory || [];
    const maxForce = this.ctar.peakForce();
    const reps = this.ctar.repCount();
    
    // Calculate duration from data history
    let durationSeconds = 0;
    if (rawData.length > 0) {
       const start = rawData[0].timestamp;
       const end = rawData[rawData.length - 1].timestamp;
       durationSeconds = Math.round((end - start) / 1000);
    }

    try {
      const success = await this.dataSync.uploadSessionData(patientId, rawData, maxForce, reps, durationSeconds);
      if (success) {
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      } else {
        this.saveError = 'Failed to save. Check RLS or DB schema.';
      }
    } catch (e: any) {
      this.saveError = e.message || 'Error saving session';
    } finally {
      this.isSaving = false;
    }
  }
}
