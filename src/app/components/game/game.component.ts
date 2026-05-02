import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { ZenBalloonComponent } from '../zen-balloon/zen-balloon.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, ZenBalloonComponent],
  template: `
    <div class="min-h-screen pb-10 relative z-10 text-slate-800 dark:text-slate-200 p-4 sm:p-6 lg:p-8">
      <div class="max-w-5xl mx-auto">
        
        <div class="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-lg gap-4">
          <div class="flex items-center space-x-3 w-full sm:w-auto">
             <button (click)="goBack()" class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0">
               <i class="fa-solid fa-arrow-left"></i>
             </button>
             <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30 shrink-0">
               <i class="fa-solid fa-gamepad text-lg"></i>
             </div>
             <div>
               <h3 class="font-bold text-slate-800 dark:text-white">Active Session</h3>
               <p class="text-xs text-slate-500 dark:text-slate-400">Target Reps: {{ targetReps }}</p>
             </div>
          </div>
          <button 
            (click)="finishSession()"
            class="px-6 py-2.5 bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/50 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white font-medium rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(244,63,94,0.2)] flex items-center space-x-2">
            <i class="fa-solid fa-flag-checkered"></i>
            <span>Finish Session</span>
          </button>
        </div>

        <div class="h-[600px] w-full">
          <app-zen-balloon 
            class="w-full h-full block"
            [currentForce]="ctar.currentForce" 
            [peakForce]="ctar.peakForce"
            [maxForceLimit]="ctar.calibrationMaxForce()"
            [currentRep]="ctar.repCount()"
            [targetReps]="targetReps"
            (repCompleted)="onGameRep()">
          </app-zen-balloon>
        </div>

      </div>
    </div>
  `
})
export class GameComponent implements OnInit {
  public targetReps = 15;

  constructor(public ctar: CtarLogicService, private router: Router) {
    effect(() => {
      // Auto finish when target reps reached
      if (this.ctar.repCount() >= this.targetReps) {
        this.finishSession();
      }
    });
  }

  ngOnInit() {
    // If user refreshed and skipped calibration, redirect to connect
    if (this.ctar.calibrationMaxForce() === 0) {
      this.router.navigate(['/connect']);
    }
  }

  onGameRep() {
    this.ctar.repCount.update((count: number) => count + 1);
  }

  finishSession() {
    this.router.navigate(['/summary']);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
