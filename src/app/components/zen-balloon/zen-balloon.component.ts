import { Component, Input, Output, EventEmitter, effect, Signal, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-zen-balloon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow-lg p-6 w-full flex flex-col items-center border border-slate-100 h-full">
      <h2 class="text-xl font-bold text-slate-800 mb-2">🎈 The Zen Balloon</h2>
      <p class="text-sm text-slate-500 mb-6 text-center">Maintain your chin-tuck force exactly inside the green zone.</p>

      <div class="relative w-24 h-64 bg-sky-100 rounded-full border-4 border-slate-200 overflow-hidden shadow-inner flex flex-col justify-end">
        
        <!-- Target Zone Overlay -->
        <div class="absolute w-full bg-emerald-400 bg-opacity-30 border-y-4 border-emerald-500 transition-all"
             [style.bottom.%]="targetMin" 
             [style.height.%]="targetMax - targetMin">
        </div>

        <!-- The Floating Balloon -->
        <div class="absolute w-full flex justify-center transition-all duration-75 ease-linear"
             [style.bottom.%]="balloonPosition">
          <div class="w-16 h-20 bg-rose-500 rounded-[50%] shadow-md relative flex items-center justify-center
                      before:content-[''] before:absolute before:-bottom-2 before:w-0 before:h-0 
                      before:border-l-[6px] before:border-l-transparent before:border-r-[6px] before:border-r-transparent 
                      before:border-b-[8px] before:border-b-rose-700">
             <i class="fa-solid fa-face-smile text-white text-2xl opacity-90" *ngIf="inTargetZone"></i>
             <i class="fa-solid fa-wind text-white text-2xl opacity-60" *ngIf="!inTargetZone"></i>
          </div>
          <!-- String -->
          <div class="absolute top-20 w-px h-[400px] bg-slate-400/50"></div>
        </div>

      </div>

      <!-- Hold Progress Indicator -->
      <div class="mt-8 w-full max-w-sm">
        <div class="flex justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>Hold Focus Timer</span>
          <span>{{ holdProgress | number:'1.0-0' }}%</span>
        </div>
        <div class="h-4 bg-slate-200 rounded-full overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
          <div class="h-full bg-amber-400 transition-all duration-100"
               [style.width.%]="holdProgress">
          </div>
        </div>
      </div>
      
      <!-- Feedback Text -->
      <div class="mt-4 text-center font-bold text-lg h-6 transition-colors"
           [ngClass]="inTargetZone ? 'text-emerald-600' : 'text-slate-400'">
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

  // Configurable Target Zone (% or Newtons depending on scale)
  public targetMin = 40; 
  public targetMax = 60; 
  
  public balloonPosition = 0;
  public inTargetZone = false;
  
  public holdProgress = 0; // 0 to 100 scale for progress bar
  private requiredHoldTimeMs = 3000; // 3 full seconds in zone equals 1 Rep
  private currentHoldMs = 0;
  
  public feedbackMessage = "Breathe and tuck to lift...";
  private gameloop: any;

  constructor(private ngZone: NgZone) {
    // Angular 17 Effect strictly subscribes to the hardware force stream natively
    effect(() => {
      const force = this.currentForce();
      
      // Calculate balloon height bounds avoiding top clipping
      const maxScale = 100;
      let pos = (force / maxScale) * 100;
      if (pos > 85) pos = 85; 
      if (pos < 0) pos = 0;
      
      this.balloonPosition = pos;

      // Logic check
      this.inTargetZone = force >= this.targetMin && force <= this.targetMax;
    });
  }

  ngOnInit() {
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
            });
            this.currentHoldMs = 0; // Drop rep progress after win
          }
        } else {
          // Heavy penalty depletion if balloon exits target zone
          this.currentHoldMs -= 150; 
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

  private updateFeedback() {
    if (this.inTargetZone && this.holdProgress > 50) {
      this.feedbackMessage = "Hold it right there...!";
    } else if (this.inTargetZone) {
      this.feedbackMessage = "Perfect! Keep steady.";
    } else if (this.balloonPosition < this.targetMin) {
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
