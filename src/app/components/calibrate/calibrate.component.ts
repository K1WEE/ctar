import { Component, OnDestroy, inject, effect, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-calibrate',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
      <div class="max-w-lg w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-center relative overflow-hidden transition-colors duration-300">
        
        <div class="flex items-center justify-between mb-6">
          <button (click)="goBack()" class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0 z-10 relative">
            <i class="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <div class="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center shadow-inner border border-amber-200 dark:border-amber-500/30 absolute left-1/2 -translate-x-1/2">
            <i class="fa-solid fa-gauge-high text-2xl"></i>
          </div>
          <div class="w-12 h-12"></div>
        </div>
        
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-2 mt-2">{{ i18n.t('calibrate.title') }}</h2>
        
        <div *ngIf="state === 'intro'" class="animate-fade-in">
          <p class="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-base" [innerHTML]="i18n.t('calibrate.intro')"></p>
          <button 
            (click)="startRep()"
            class="px-8 min-h-[56px] w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-lg">
            <i class="fa-solid fa-play mr-2"></i> {{ i18n.t('calibrate.start') }}
          </button>
        </div>

        <!-- Interactive Visual Cards for Press state -->
        <div *ngIf="state === 'pulling'" class="animate-fade-in flex flex-col items-center w-full">
          
          <!-- High-Contrast Color Card -->
          <div class="w-full rounded-3xl p-6 sm:p-8 mb-6 border-2 transition-all duration-300 shadow-lg flex flex-col items-center bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 shadow-rose-500/5">
            
            <!-- Dynamic Action Icon -->
            <div class="mb-4 flex items-center justify-center">
              <i class="fa-solid fa-hand-fist text-7xl text-rose-500 animate-pulse"></i>
            </div>
            
            <!-- Large Action Title -->
            <h3 class="text-2xl sm:text-3xl font-black mb-1 tracking-wide uppercase text-rose-600 dark:text-rose-400">
              {{ i18n.t('calibrate.squeeze') }}
            </h3>
            
            <!-- Huge Countdown Timer -->
            <div class="text-6xl sm:text-7xl font-black font-mono tracking-tighter mb-4 text-rose-700 dark:text-rose-300">
              {{ timeLeft }}<span class="text-2xl font-bold ml-1">s</span>
            </div>
            
            <!-- Expanded High-Contrast Force Bar -->
            <div class="w-full h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-inner border border-slate-300 dark:border-slate-700/50 relative">
              <div class="h-full transition-all duration-75 ease-out rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500"
                   [style.width.%]="(ctar.currentForce() / 100) * 100">
              </div>
              <div class="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-black text-slate-800 dark:text-white mix-blend-difference">
                {{ i18n.t('calibrate.current') }} {{ ctar.currentForce() | number:'1.0-1' }} N
              </div>
            </div>
          </div>
          
          <!-- Bottom Info / Hints -->
          <div class="text-sm font-bold flex justify-center bg-slate-100 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 px-5 py-4 rounded-2xl w-full max-w-sm transition-colors text-slate-600 dark:text-slate-300">
            <span>{{ i18n.t('calibrate.hint') }}</span>
          </div>
        </div>
        
        <div *ngIf="state === 'finished'" class="animate-fade-in">
          <p class="text-2xl font-bold text-emerald-500 mb-4">{{ i18n.t('calibrate.complete') }}</p>
          <p class="text-slate-600 dark:text-slate-300 mb-4 text-lg">
            {{ i18n.t('calibrate.avgForce') }} <strong class="text-2xl text-emerald-500 dark:text-emerald-400 font-black">{{ averagePeak | number:'1.0-1' }} N</strong>
          </p>
          <p class="text-slate-500 dark:text-slate-400 mb-6 text-base">{{ i18n.t('calibrate.adjusting') }}</p>
          <i class="fa-solid fa-spinner fa-spin text-3xl text-emerald-500"></i>
        </div>

      </div>
    </div>
  `
})
export class CalibrateComponent implements OnDestroy {
  public state: 'intro' | 'pulling' | 'finished' = 'intro';
  public timeLeft = 5;
  public peaks: number[] = [];
  public averagePeak = 0;
  private timer: any;
  public i18n = inject(I18nService);
  private ngZone = inject(NgZone);
  private hasPressed = false;

  constructor(public ctar: CtarLogicService, private router: Router) {
    effect(() => {
      const force = this.ctar.currentForce();
      
      // If we are in pulling state, detect press and release
      if (this.state === 'pulling') {
        if (force >= 8.0) {
          this.hasPressed = true;
        }
        
        // If they pressed above 8N and now released below 4.0N, finish calibration immediately
        if (this.hasPressed && force < 4.0) {
          this.ngZone.run(() => {
            if (this.timer) {
              clearInterval(this.timer);
            }
            this.peaks = [this.ctar.peakForce()];
            this.finishCalibration();
          });
        }
      }
    });
  }

  startRep() {
    this.state = 'pulling';
    this.timeLeft = 5;
    this.ctar.peakForce.set(0); 
    this.hasPressed = false;
    this.peaks = [];

    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.peaks.push(this.ctar.peakForce());
        this.finishCalibration();
      }
    }, 1000);
  }

  finishCalibration() {
    this.state = 'finished';
    
    // Average peak is just the peak force of the single round
    this.averagePeak = this.peaks.length > 0 ? this.peaks[0] : this.ctar.peakForce();
    
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
