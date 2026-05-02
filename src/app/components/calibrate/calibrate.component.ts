import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';

@Component({
  selector: 'app-calibrate',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
      <div class="max-w-lg w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center relative overflow-hidden">
        
        <div class="flex items-center justify-between mb-6">
          <button (click)="goBack()" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0 z-10 relative">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div class="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center shadow-inner border border-amber-200 dark:border-amber-500/30 absolute left-1/2 -translate-x-1/2">
            <i class="fa-solid fa-gauge-high text-4xl"></i>
          </div>
          <div class="w-10 h-10"></div> <!-- Spacer for centering -->
        </div>
        
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-2 mt-4">Calibration Phase</h2>
        
        <div *ngIf="state === 'intro'" class="animate-fade-in">
          <p class="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            We will measure your strength by asking you to squeeze as hard as you can <strong>3 times</strong>.<br><br>
            Each squeeze will last 5 seconds, followed by a 5-second rest. We will average your results to set the game difficulty.
          </p>
          <button 
            (click)="startRep()"
            class="px-8 py-4 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]">
            <i class="fa-solid fa-play mr-2"></i> Start Calibration
          </button>
        </div>

        <div *ngIf="state === 'pulling' || state === 'resting'" class="animate-fade-in">
          <div class="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Round {{ currentRep }} of 3</div>
          <h3 class="text-5xl font-extrabold mb-4" [ngClass]="state === 'pulling' ? 'text-brand-accent animate-pulse' : 'text-slate-400'">{{ timeLeft }}s</h3>
          
          <p class="text-xl font-bold mb-8" [ngClass]="state === 'pulling' ? 'text-emerald-500' : 'text-amber-500'">
            {{ state === 'pulling' ? 'SQUEEZE AS HARD AS YOU CAN!' : 'REST AND RELAX...' }}
          </p>
          
          <div class="w-full h-8 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-300 dark:border-slate-700 relative mb-4">
            <div class="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-100 ease-out"
                 [style.width.%]="(ctar.currentForce() / 100) * 100">
            </div>
            <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white mix-blend-difference">
              Current: {{ ctar.currentForce() | number:'1.0-1' }} N
            </div>
          </div>
          
          <div class="text-sm text-slate-500 dark:text-slate-400 font-medium flex justify-center space-x-4">
            <span *ngFor="let p of peaks; let i = index">
              R{{i+1}}: <strong class="text-emerald-500">{{ p | number:'1.0-1' }}N</strong>
            </span>
            <span *ngIf="state === 'pulling'">
               R{{currentRep}}: <strong class="text-emerald-500">{{ ctar.peakForce() | number:'1.0-1' }}N</strong>
            </span>
          </div>
        </div>
        
        <div *ngIf="state === 'finished'" class="animate-fade-in">
          <p class="text-2xl font-bold text-emerald-500 mb-4">Calibration Complete! 🎉</p>
          <p class="text-slate-600 dark:text-slate-300 mb-2">Average Max Force: <strong>{{ averagePeak | number:'1.0-1' }} N</strong></p>
          <div class="text-sm text-slate-500 mb-8">
            (R1: {{ peaks[0] | number:'1.0-0' }}N | R2: {{ peaks[1] | number:'1.0-0' }}N | R3: {{ peaks[2] | number:'1.0-0' }}N)
          </div>
          <p class="text-slate-500 dark:text-slate-400 mb-6 text-sm">Adjusting game difficulty...</p>
          <i class="fa-solid fa-spinner fa-spin text-3xl text-emerald-500"></i>
        </div>

      </div>
    </div>
  `
})
export class CalibrateComponent implements OnDestroy {
  public state: 'intro' | 'pulling' | 'resting' | 'finished' = 'intro';
  public currentRep = 1;
  public timeLeft = 5;
  public peaks: number[] = [];
  public averagePeak = 0;
  private timer: any;

  constructor(public ctar: CtarLogicService, private router: Router) {}

  startRep() {
    this.state = 'pulling';
    this.timeLeft = 5; // 5 seconds of pulling
    this.ctar.peakForce.set(0); 

    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.peaks.push(this.ctar.peakForce());
        
        if (this.currentRep < 3) {
          this.startRest();
        } else {
          this.finishCalibration();
        }
      }
    }, 1000);
  }

  startRest() {
    this.state = 'resting';
    this.timeLeft = 5; // 5 seconds of resting
    this.ctar.peakForce.set(0); 

    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.currentRep++;
        this.startRep();
      }
    }, 1000);
  }

  finishCalibration() {
    this.state = 'finished';
    
    // Calculate average
    const sum = this.peaks.reduce((a, b) => a + b, 0);
    this.averagePeak = sum / this.peaks.length;
    
    const safeMax = Math.max(10, this.averagePeak); 
    this.ctar.setCalibration(safeMax);

    setTimeout(() => {
      this.router.navigate(['/game']);
    }, 3000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
