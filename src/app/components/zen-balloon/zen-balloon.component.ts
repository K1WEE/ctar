import { Component, Input, Output, EventEmitter, effect, Signal, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-zen-balloon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl rounded-2xl shadow-xl p-6 w-full flex flex-col items-center border border-slate-200 dark:border-white/10 h-full relative overflow-hidden transition-colors duration-300">
      <!-- Glow effect -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-10 pointer-events-none"></div>

      <div class="flex items-center space-x-3 mb-2 relative z-10">
         <div class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-transparent transition-colors duration-300">
            <i class="fa-solid fa-parachute-box"></i>
         </div>
         <h2 class="text-xl font-bold text-slate-900 dark:text-white tracking-wide transition-colors duration-300">The Zen Balloon</h2>
      </div>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center relative z-10 transition-colors duration-300">Maintain your chin-tuck force exactly inside the green zone.</p>

      <div class="relative w-28 h-64 bg-slate-100 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner flex flex-col justify-end z-10 transition-colors duration-300">
        
        <!-- Target Zone Overlay -->
        <div class="absolute w-full bg-emerald-100/50 dark:bg-emerald-500/20 border-y border-emerald-300 dark:border-emerald-400/50 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] dark:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
             [style.bottom.%]="targetMinPercent" 
             [style.height.%]="targetMaxPercent - targetMinPercent">
        </div>

        <!-- The Floating Balloon -->
        <div class="absolute w-full flex justify-center transition-all duration-75 ease-linear"
             [style.bottom.%]="balloonPosition">
          <div class="w-16 h-20 bg-gradient-to-tr from-rose-600 to-pink-500 rounded-[50%] shadow-[0_0_20px_rgba(244,63,94,0.5)] relative flex items-center justify-center
                      before:content-[''] before:absolute before:-bottom-2 before:w-0 before:h-0 
                      before:border-l-[6px] before:border-l-transparent before:border-r-[6px] before:border-r-transparent 
                      before:border-b-[8px] before:border-b-rose-700
                      transition-transform duration-300"
               [ngClass]="{'scale-110 shadow-[0_0_30px_rgba(16,185,129,0.6)]': inTargetZone}">
             <i class="fa-solid fa-face-smile text-white text-2xl opacity-100 drop-shadow-md" *ngIf="inTargetZone"></i>
             <i class="fa-solid fa-wind text-white text-2xl opacity-80" *ngIf="!inTargetZone"></i>
          </div>
          <!-- String -->
          <div class="absolute top-20 w-px h-[400px] bg-gradient-to-b from-slate-300 dark:from-white/50 to-transparent"></div>
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
  @Input({required: true}) currentForce!: Signal<number>;
  
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
  private requiredHoldTimeMs = 3000; // 3 full seconds in zone equals 1 Rep
  private currentHoldMs = 0;
  
  public feedbackMessage = "Breathe and tuck to lift...";
  private gameloop: any;

  // Set the visual maximum scale of the tube to 70 Newtons
  private maxScale = 70;

  constructor(private ngZone: NgZone) {
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

      // Logic check
      this.inTargetZone = force >= this.targetMin && force <= this.targetMax;
    });
  }

  ngOnInit() {
    // Initialize visuals
    this.targetMinPercent = (this.targetMin / this.maxScale) * 100;
    this.targetMaxPercent = (this.targetMax / this.maxScale) * 100;
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
              this.randomizeTargetZone();
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

  private randomizeTargetZone() {
    // Randomize target zone between 15N and 40N limit
    // Target zone width is 15N
    // So targetMin is between 15 and 25. targetMax will be 30 to 40.
    const minRange = 15;
    const maxRange = 25;
    const newMin = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
    
    this.targetMin = newMin;
    this.targetMax = newMin + 15; // fixed 15N width gap
    
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
  }
}
