import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { DataSyncService } from '../../services/data-sync.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen p-4 flex items-center justify-center">
      <div class="max-w-2xl w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
        
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-200 dark:border-emerald-500/30">
            <i class="fa-solid fa-trophy text-4xl"></i>
          </div>
          <h2 class="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Session Complete!</h2>
          <p class="text-slate-500 dark:text-slate-400">Great job completing your therapy session.</p>
        </div>

        <div *ngIf="isSaving" class="text-center py-8">
          <i class="fa-solid fa-spinner fa-spin text-4xl text-brand-accent mb-4"></i>
          <p class="text-slate-500">Saving your progress securely...</p>
        </div>

        <div *ngIf="!isSaving" class="space-y-6 animate-fade-in">
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
              <div class="text-slate-500 text-sm font-medium mb-1">Duration</div>
              <div class="text-2xl font-bold text-slate-800 dark:text-white">{{ currentStats.duration }}s</div>
              <div class="text-xs mt-2" [ngClass]="getImprovementColor(improvement.duration)">
                <i class="fa-solid" [ngClass]="getImprovementIcon(improvement.duration)"></i>
                {{ formatImprovement(improvement.duration) }}
              </div>
            </div>
            
            <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
              <div class="text-slate-500 text-sm font-medium mb-1">Total Reps</div>
              <div class="text-2xl font-bold text-slate-800 dark:text-white">{{ currentStats.reps }}</div>
              <div class="text-xs mt-2" [ngClass]="getImprovementColor(improvement.reps)">
                <i class="fa-solid" [ngClass]="getImprovementIcon(improvement.reps)"></i>
                {{ formatImprovement(improvement.reps) }}
              </div>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
              <div class="text-slate-500 text-sm font-medium mb-1">Peak Force</div>
              <div class="text-2xl font-bold text-slate-800 dark:text-white">{{ currentStats.maxForce | number:'1.0-1' }} N</div>
              <div class="text-xs mt-2" [ngClass]="getImprovementColor(improvement.maxForce)">
                <i class="fa-solid" [ngClass]="getImprovementIcon(improvement.maxForce)"></i>
                {{ formatImprovement(improvement.maxForce) }} N
              </div>
            </div>
          </div>

          <div *ngIf="saveError" class="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-center text-sm">
            <i class="fa-solid fa-circle-exclamation mr-1"></i> {{ saveError }}
          </div>

          <div class="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 text-center">
            <button 
              (click)="finish()"
              class="px-8 py-3 bg-brand-accent hover:bg-indigo-600 text-white font-medium rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105">
              Done for today
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class SummaryComponent implements OnInit {
  public isSaving = true;
  public saveError = '';

  public currentStats = {
    duration: 0,
    reps: 0,
    maxForce: 0
  };

  public improvement = {
    duration: 0,
    reps: 0,
    maxForce: 0
  };

  constructor(
    private ctar: CtarLogicService,
    private dataSync: DataSyncService,
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = this.supabase.currentUser();
    if (!user) {
      this.saveError = 'You must be logged in to save.';
      this.isSaving = false;
      return;
    }

    // 1. Get current session metrics
    this.currentStats.duration = this.ctar.getSessionDurationSeconds();
    this.currentStats.reps = this.ctar.repCount();
    this.currentStats.maxForce = this.ctar.peakForce();

    // 2. Fetch previous session BEFORE uploading the new one
    try {
      const prevSession = await this.dataSync.fetchUserPreviousSession(user.id);
      
      if (prevSession) {
        this.improvement.duration = this.currentStats.duration - prevSession.duration_seconds;
        this.improvement.reps = this.currentStats.reps - prevSession.reps;
        this.improvement.maxForce = this.currentStats.maxForce - prevSession.max_force;
      }
    } catch (e) {
      console.warn("Could not fetch previous session for comparison", e);
    }

    // 3. Upload new session
    const rawData = this.ctar.getDataHistory();
    if (rawData.length > 0) {
      const success = await this.dataSync.uploadSessionData(
        user.id, 
        rawData, 
        this.currentStats.maxForce, 
        this.currentStats.reps, 
        this.currentStats.duration
      );

      if (!success) {
        this.saveError = 'Failed to save session data to cloud.';
      }
    } else {
      this.saveError = 'No data recorded in this session.';
    }

    this.isSaving = false;
  }

  getImprovementColor(val: number) {
    if (val > 0) return 'text-emerald-500';
    if (val < 0) return 'text-rose-500';
    return 'text-slate-400';
  }

  getImprovementIcon(val: number) {
    if (val > 0) return 'fa-arrow-up';
    if (val < 0) return 'fa-arrow-down';
    return 'fa-minus';
  }

  formatImprovement(val: number) {
    if (val > 0) return '+' + val.toFixed(1);
    if (val < 0) return val.toFixed(1);
    return 'No change';
  }

  finish() {
    this.router.navigate(['/dashboard']);
  }
}
