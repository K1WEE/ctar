import { Component, Input, Output, EventEmitter, effect, Signal, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BiofeedbackService } from '../../services/biofeedback.service';

@Component({
  selector: 'app-zen-balloon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl rounded-3xl shadow-xl p-4 sm:p-6 w-full flex flex-col items-center border border-slate-200 dark:border-white/10 min-h-[400px] h-full relative overflow-hidden transition-colors duration-300">
      <!-- Glow effect -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-10 pointer-events-none"></div>

      <div class="flex items-center space-x-3 mb-6 relative z-10 mt-2">
         <div class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-transparent transition-colors duration-300">
            <i class="fa-solid fa-parachute-box"></i>
         </div>
         <h2 class="text-xl font-bold text-slate-900 dark:text-white tracking-wide transition-colors duration-300">The Zen Balloon</h2>
      </div>

      <!-- Main Game Area with Side HUDs -->
      <div class="w-full flex-1 relative flex justify-between items-center z-20">
        
        <!-- Left HUD: Forces -->
        <div class="flex flex-col gap-2 sm:gap-6 w-1/3 max-w-[140px] z-20">
          <div class="text-right bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-2 sm:p-3 rounded-2xl border border-white/20 dark:border-white/5 w-full">
             <div class="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5 sm:mb-1"><i class="fa-solid fa-bolt text-blue-400 mr-1"></i> Current</div>
             <div class="text-2xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 tabular-nums">{{ currentForce() | number:'1.0-1' }}<span class="text-xs sm:text-sm text-slate-400 font-bold ml-1">N</span></div>
          </div>
          
          <div class="text-right bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-2 sm:p-3 rounded-2xl border border-white/20 dark:border-white/5 w-full">
             <div class="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5 sm:mb-1"><i class="fa-solid fa-arrow-trend-up text-emerald-400 mr-1"></i> Peak</div>
             <div class="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{{ peakForce() | number:'1.0-1' }}<span class="text-[10px] sm:text-xs text-slate-400 font-bold ml-1">N</span></div>
             <div class="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1 tabular-nums">Goal: {{ maxForceLimit | number:'1.0-0' }} N</div>
          </div>
        </div>

        <!-- The Balloon Track (Absolutely Centered) -->
        <div class="absolute left-1/2 -translate-x-1/2 w-20 sm:w-28 h-64 sm:h-72 bg-slate-100 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner flex flex-col justify-end z-10 transition-colors duration-300">
          
          <!-- Target Zone Overlay -->
          <div class="absolute w-full bg-emerald-100/50 dark:bg-emerald-500/20 border-y border-emerald-300 dark:border-emerald-400/50 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] dark:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
               [style.bottom.%]="targetMinPercent" 
               [style.height.%]="targetMaxPercent - targetMinPercent">
          </div>

          <!-- The Floating Balloon -->
          <div class="absolute w-full flex justify-center transition-all duration-75 ease-linear"
               [style.bottom.%]="balloonPosition">
            <div class="w-12 h-14 sm:w-16 sm:h-20 bg-gradient-to-tr from-rose-600 to-pink-500 rounded-[50%] shadow-[0_0_20px_rgba(244,63,94,0.5)] relative flex items-center justify-center
                        before:content-[''] before:absolute before:-bottom-2 before:w-0 before:h-0 
                        before:border-l-[6px] before:border-l-transparent before:border-r-[6px] before:border-r-transparent 
                        before:border-b-[8px] before:border-b-rose-700
                        transition-transform duration-300"
                 [ngClass]="{'scale-110 shadow-[0_0_30px_rgba(16,185,129,0.6)]': inTargetZone}">
               <i class="fa-solid fa-face-smile text-white text-lg sm:text-2xl opacity-100 drop-shadow-md" *ngIf="inTargetZone"></i>
               <i class="fa-solid fa-wind text-white text-lg sm:text-2xl opacity-80" *ngIf="!inTargetZone"></i>
            </div>
            <!-- String -->
            <div class="absolute top-14 sm:top-20 w-px h-[400px] bg-gradient-to-b from-slate-300 dark:from-white/50 to-transparent"></div>
          </div>
        </div>

        <!-- Right HUD: Reps -->
        <div class="flex flex-col gap-2 sm:gap-6 w-1/3 max-w-[140px] z-20">
          <div class="text-left bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-2 sm:p-3 rounded-2xl border border-white/20 dark:border-white/5 w-full h-full">
             <div class="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5 sm:mb-1"><i class="fa-solid fa-dumbbell text-amber-400 mr-1"></i> Reps</div>
             <div class="text-3xl sm:text-5xl font-black text-amber-500 dark:text-amber-400 tabular-nums">{{ currentRepVal }}</div>
             <div class="text-xs sm:text-lg text-slate-400 font-bold mt-1 tabular-nums">/ {{ targetReps }}</div>
          </div>
        </div>

      </div>

      <!-- Hold Progress Indicator -->
      <div class="mt-8 w-full max-w-sm relative z-10">
        <div class="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider transition-colors duration-300">
          <span>Hold Focus Timer</span>
          <span class="text-brand-accent">{{ holdProgress | number:'1.0-0' }}%</span>
        </div>
        <div class="h-3 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-white/5 transition-colors duration-300">
          <div class="h-full bg-gradient-to-r from-amber-400 to-amber-300 dark:from-amber-500 dark:to-amber-300 transition-all duration-100 relative"
               [style.width.%]="holdProgress">
               <div class="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCA4TDggMFpNMCAwTDggOFoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] opacity-30 animate-[slide_1s_linear_infinite]"></div>
          </div>
        </div>
      </div>
      
      <!-- Feedback Text -->
      <div class="mt-4 text-center font-bold text-lg h-6 transition-colors duration-300 relative z-10"
           [ngClass]="inTargetZone ? 'text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.3)] dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-slate-400'">
        {{ feedbackMessage }}
      </div>
    </div>
  `
})
export class ZenBalloonComponent implements OnInit, OnDestroy {
  // Driven strictly by the hardware BLE signal internally
  @Input({ required: true }) currentForce!: Signal<number>;
  @Input({ required: true }) peakForce!: Signal<number>;
  
  // Dynamic scale from calibration
  @Input({ required: true }) maxForceLimit!: number;
  @Input({ required: true }) targetReps!: number;
  
  // Current rep to increase difficulty
  @Input() set currentRep(rep: number) {
    if (rep !== this.currentRepVal) {
      this.currentRepVal = rep;
      // Re-randomize target zone and increase time when rep completes
      if (rep > 0) {
        this.updateDifficulty();
      }
    }
  }
  public currentRepVal = 0;

  // Emitted safely upwards to the logic service so we avoid mutating service internals here
  @Output() repCompleted = new EventEmitter<void>();

  // Configurable Target Zone in Newtons
  public targetMin = 20;
  public targetMax = 35;

  // Visual positions in percentages
  public targetMinPercent = 0;
  public targetMaxPercent = 0;
  public balloonPosition = 0;

  public inTargetZone = false;

  public holdProgress = 0; // 0 to 100 scale for progress bar
  private requiredHoldTimeMs = 1500; // Starts at 1.5s
  private currentHoldMs = 0;

  public feedbackMessage = "Breathe and tuck to lift...";
  private gameloop: any;

  // Visual maximum scale of the tube based on calibration
  private get maxScale() {
    return Math.max(50, this.maxForceLimit * 1.3); // give 30% headroom above max force
  }

  constructor(private ngZone: NgZone, private biofeedback: BiofeedbackService) {
    // Angular 17 Effect strictly subscribes to the hardware force stream natively
    effect(() => {
      const force = this.currentForce();

      // Calculate balloon height bounds avoiding top clipping
      let pos = (force / this.maxScale) * 100;
      if (pos > 85) pos = 85;
      if (pos < 0) pos = 0;

      this.balloonPosition = pos;

      // Update Target Zone visual percentages
      this.targetMinPercent = (this.targetMin / this.maxScale) * 100;
      this.targetMaxPercent = (this.targetMax / this.maxScale) * 100;

      // Logic check and transition biofeedback
      const wasInTarget = this.inTargetZone;
      const isCurrentlyInTarget = force >= this.targetMin && force <= this.targetMax;

      if (isCurrentlyInTarget !== wasInTarget) {
        this.inTargetZone = isCurrentlyInTarget;
        this.ngZone.run(() => {
          if (isCurrentlyInTarget) {
            this.biofeedback.playEnterZone();
            this.biofeedback.startVibrationLoop();
          } else {
            if (this.currentHoldMs > 50) {
              this.biofeedback.playExitZone();
            } else {
              this.biofeedback.stopVibrationLoop();
            }
          }
        });
      }
    });
  }

  ngOnInit() {
    // Initialize visuals for rep 0
    this.updateDifficulty();
    this.startGameLoop();
  }

  /**
   * Run a local logic interval outside of Angular Zone to prevent memory leaks / jitter
   * Updates only sync back when visually relevant.
   */
  private startGameLoop() {
    this.ngZone.runOutsideAngular(() => {
      this.gameloop = setInterval(() => {

        if (this.inTargetZone) {
          this.currentHoldMs += 50;

          if (this.currentHoldMs >= this.requiredHoldTimeMs) {
            this.ngZone.run(() => {
              this.repCompleted.emit();
              this.triggerSuccessAnimation();
              this.biofeedback.playSuccess();
              // The updateDifficulty() will be called when currentRep input changes
            });
            this.currentHoldMs = 0; // Drop rep progress after win
          }
        } else {
          // Normal penalty depletion if balloon exits target zone (less punishing than before)
          this.currentHoldMs -= 50;
          if (this.currentHoldMs < 0) this.currentHoldMs = 0;
        }

        // Calculate view progress
        const newProgress = (this.currentHoldMs / this.requiredHoldTimeMs) * 100;

        // Sync graphics only if distinct changes occurred
        if (Math.abs(this.holdProgress - newProgress) > 1 || newProgress === 0) {
          this.ngZone.run(() => {
            this.holdProgress = newProgress;
            this.updateFeedback();
          });
        }
      }, 50); // 20 frames per second check aligns gracefully with 20Hz hardware rate
    });
  }

  private updateDifficulty() {
    // 1. Increase hold time progressively (add 0.5s per rep, max 5s)
    const maxHoldTimeMs = 5000;
    this.requiredHoldTimeMs = Math.min(1500 + (this.currentRepVal * 500), maxHoldTimeMs);

    // 2. Alternating Wave Pattern (High Intensity on odd reps, Low Intensity on even reps)
    const repNum = this.currentRepVal + 1; // 1-indexed rep number
    const isOdd = repNum % 2 !== 0;

    if (isOdd) {
      // High Intensity: 65% - 85% of calibration limit
      this.targetMin = this.maxForceLimit * 0.65;
      this.targetMax = this.maxForceLimit * 0.85;
    } else {
      // Low Intensity: 20% - 40% of calibration limit
      this.targetMin = this.maxForceLimit * 0.20;
      this.targetMax = this.maxForceLimit * 0.40;
    }

    // Ensure values don't go below minimum safe threshold (e.g. 5 Newtons)
    if (this.targetMin < 5) {
      this.targetMin = 5;
      this.targetMax = Math.max(10, this.targetMax);
    }

    // Update visuals
    this.targetMinPercent = (this.targetMin / this.maxScale) * 100;
    this.targetMaxPercent = (this.targetMax / this.maxScale) * 100;
  }

  private updateFeedback() {
    if (this.inTargetZone && this.holdProgress > 50) {
      this.feedbackMessage = "Hold it right there...!";
    } else if (this.inTargetZone) {
      this.feedbackMessage = "Perfect! Keep steady.";
    } else if (this.currentForce() < this.targetMin) {
      this.feedbackMessage = "Tuck harder to lift bubble...";
    } else {
      this.feedbackMessage = "Too hard! Relax slightly...";
    }
  }

  private triggerSuccessAnimation() {
    this.feedbackMessage = "Rep Completed! 🎉";
    this.holdProgress = 100;
  }

  ngOnDestroy() {
    if (this.gameloop) {
      clearInterval(this.gameloop);
    }
    this.biofeedback.stopVibrationLoop();
  }
}
