import { Component, Input, Output, EventEmitter, effect, Signal, NgZone, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BiofeedbackService } from '../../services/biofeedback.service';
import { I18nService } from '../../services/i18n.service';
import { ChinTuckDemoComponent } from '../chin-tuck-demo/chin-tuck-demo.component';

@Component({
  selector: 'app-zen-balloon',
  standalone: true,
  imports: [CommonModule, ChinTuckDemoComponent],
  template: `
    <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl rounded-3xl shadow-xl p-4 sm:p-6 w-full flex flex-col items-center border border-slate-200 dark:border-white/10 min-h-[450px] h-full relative overflow-hidden transition-colors duration-300">
      
      <!-- Ready State Overlay (Transparent backdrop, showing game behind it) -->
      <div *ngIf="gameFlowState() === 'ready'" class="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center p-6 rounded-3xl animate-fade-in">
        <!-- Center translucent instruction card -->
        <div class="bg-white/95 dark:bg-slate-900/95 p-6 rounded-2xl shadow-xl w-full max-w-[320px] border border-slate-200 dark:border-white/10 text-center flex flex-col items-center space-y-4 animate-scale-up">
          <app-chin-tuck-demo size="sm" [showLabel]="false" class="mb-2"></app-chin-tuck-demo>
          
          <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {{ i18n.currentLang() === 'th' ? 'เตรียมฝึกซ้อม' : 'Get Ready' }}
          </h2>
          
          <div class="text-slate-700 dark:text-slate-300 text-sm sm:text-base font-bold leading-relaxed space-y-2">
            <p>1. {{ i18n.currentLang() === 'th' ? 'วางเครื่องมือไว้บนอก' : 'Place device on chest' }}</p>
            <p>2. {{ i18n.currentLang() === 'th' ? 'วางคางบนแผ่นรอง' : 'Rest chin on pad' }}</p>
            <p class="text-amber-600 dark:text-amber-400 font-extrabold animate-pulse">
              👉 {{ i18n.currentLang() === 'th' ? 'ก้มกดเบาๆ เพื่อเริ่มเกม' : 'Press gently to start' }}
            </p>
          </div>
          
          <!-- Back button in modal to let them exit -->
          <button (click)="goBack()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-850 dark:hover:text-white text-xs font-bold rounded-lg transition-colors w-full mt-1">
            {{ i18n.currentLang() === 'th' ? 'ย้อนกลับ' : 'Go Back' }}
          </button>
        </div>
      </div>

      <!-- Countdown State Overlay -->
      <div *ngIf="gameFlowState() === 'countdown'" class="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center p-6 rounded-3xl animate-fade-in text-center">
        <span class="text-white font-bold uppercase tracking-widest text-sm xs:text-base sm:text-lg mb-4 drop-shadow-md">
          {{ i18n.currentLang() === 'th' ? 'เตรียมตัวฝึกซ้อม...' : 'Prepare yourself...' }}
        </span>
        <!-- Massive pulsing number -->
        <div class="text-8xl xs:text-9xl font-black text-amber-400 tabular-nums animate-[ping_1s_infinite] select-none drop-shadow-lg">
          {{ countdownValue() }}
        </div>
      </div>

      <!-- Glow effect -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] opacity-10 pointer-events-none"></div>

      <!-- Integrated Top Header Bar -->
      <div class="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-white/10 relative z-10">
        <div class="flex items-center space-x-3 min-w-0">
          <button (click)="goBack()" class="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0">
            <i class="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <div class="text-left min-w-0">
            <h3 class="font-black text-base xs:text-lg sm:text-xl text-slate-800 dark:text-white leading-tight whitespace-nowrap">{{ i18n.t('game.activeSession') }}</h3>
            <p class="text-xs xs:text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-tight font-semibold whitespace-nowrap">{{ i18n.t('game.targetReps') }} {{ targetReps }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2 shrink-0">
          <button 
            (click)="toggleMute()" 
            class="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 border bg-white dark:bg-slate-800"
            [ngClass]="isMuted ? 'border-slate-200 text-slate-400 dark:border-white/10 dark:text-slate-500' : 'border-amber-200 text-amber-600 dark:border-amber-500/30 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/5'"
            [title]="isMuted ? (i18n.currentLang() === 'th' ? 'เปิดเสียงพากย์' : 'Unmute Voice') : (i18n.currentLang() === 'th' ? 'ปิดเสียงพากย์' : 'Mute Voice')">
            <i class="fa-solid" [ngClass]="isMuted ? 'fa-volume-xmark' : 'fa-volume-high'"></i>
          </button>
          
          <button 
            (click)="finishSession()"
            class="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 font-black text-sm sm:text-base rounded-xl transition-all duration-300 flex items-center space-x-1.5 shadow-sm">
            <i class="fa-solid fa-flag-checkered"></i>
            <span>{{ i18n.t('game.finish') }}</span>
          </button>
        </div>
      </div>

      <div class="flex items-center space-x-3 mb-6 relative z-10 mt-1">
         <div class="w-10 h-10 xs:w-12 xs:h-12 rounded-lg bg-amber-50 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 border border-amber-100 dark:border-transparent transition-colors duration-300">
            <i class="fa-solid fa-parachute-box text-lg xs:text-xl"></i>
         </div>
         <h2 class="text-2xl xs:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-wide transition-colors duration-300">{{ i18n.t('game.title') }}</h2>
      </div>

      <!-- Main Game Area with Side HUDs -->
      <div class="w-full flex-1 relative flex justify-between items-center z-20 min-h-0">
        
        <!-- Left HUD: Forces (Percentage Display) -->
        <div class="flex flex-col gap-2 xs:gap-4 w-[30%] max-w-[130px] z-20">
          <div class="text-right bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-2 xs:p-2.5 rounded-xl border border-white/20 dark:border-white/5 w-full shadow-sm">
             <div class="text-xs xs:text-sm text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-0.5 sm:mb-1" aria-label="Current force"><i class="fa-solid fa-bolt text-blue-400 mr-1"></i> {{ i18n.t('game.hud.current') }}</div>
             <div class="text-2xl xs:text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums" role="status" aria-live="polite">{{ forcePercent() }}<span class="text-xs text-slate-400 font-bold ml-0.5 sm:ml-1">%</span></div>
          </div>
          
          <div class="text-right bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-2 xs:p-2.5 rounded-xl border border-white/20 dark:border-white/5 w-full shadow-sm">
             <div class="text-xs xs:text-sm text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-0.5 sm:mb-1" aria-label="Peak force"><i class="fa-solid fa-arrow-trend-up text-amber-600 mr-1"></i> {{ i18n.t('game.hud.peak') }}</div>
             <div class="text-xl xs:text-2xl font-black text-amber-700 dark:text-amber-300 tabular-nums">{{ peakPercent() }}<span class="text-xs text-slate-400 font-bold ml-0.5 sm:ml-1">%</span></div>
             <div class="text-xs xs:text-sm text-slate-600 dark:text-slate-400 font-bold mt-1 tabular-nums">{{ i18n.t('game.hud.goal') }} 100%</div>
          </div>
        </div>

        <!-- The Balloon Track (Centered & Dynamically Sized to fill parent container height) -->
        <div class="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-28 xs:w-32 h-[85%] xs:h-[90%] bg-slate-100 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner flex flex-col justify-end z-10 transition-colors duration-300">
          
          <!-- Target Zone Overlay (Elderly-Friendly High-Contrast Amber/Orange with indicators) -->
          <div *ngIf="!isReleasing"
               class="absolute w-full bg-amber-500/30 dark:bg-amber-500/40 border-y-4 border-amber-600 dark:border-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] dark:shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-between px-1 xs:px-2"
               [style.bottom.%]="targetMinPercent" 
               [style.height.%]="targetMaxPercent - targetMinPercent">
             <i class="fa-solid fa-chevron-right text-amber-700 dark:text-amber-300 text-xs xs:text-sm"></i>
             <span class="text-xs xs:text-sm font-black text-amber-950 dark:text-amber-100 uppercase tracking-widest pointer-events-none select-none">{{ i18n.t('game.zone.target') }}</span>
             <i class="fa-solid fa-chevron-left text-amber-700 dark:text-amber-300 text-xs xs:text-sm"></i>
          </div>

          <!-- Release Green Zone Overlay (Visible only when releasing for relaxation below 4.0N) -->
          <div *ngIf="isReleasing"
               class="absolute w-full bg-emerald-500/20 dark:bg-emerald-500/35 border-t-4 border-emerald-500/80 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] flex flex-col items-center justify-center px-1"
               style="bottom: 0;"
               [style.height.%]="restZoneVisualPercent">
             <i class="fa-solid fa-chevron-down text-emerald-600 dark:text-emerald-400 text-sm mb-0.5"></i>
             <span class="text-sm xs:text-base font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest pointer-events-none select-none">{{ i18n.t('game.zone.rest') }}</span>
          </div>

          <!-- The Floating Balloon (Raised offset slightly to prevent bottom clipping) -->
          <div class="absolute w-full flex justify-center transition-all duration-75 ease-linear"
               [style.bottom.%]="balloonPosition * 0.85 + 6">
            <div class="w-16 h-20 xs:w-20 xs:h-24 bg-gradient-to-tr from-rose-600 to-pink-500 rounded-[50%] shadow-[0_0_20px_rgba(244,63,94,0.5)] relative flex items-center justify-center
                        before:content-[''] before:absolute before:-bottom-2 before:w-0 before:h-0 
                        before:border-l-[6px] before:border-l-transparent before:border-r-[6px] before:border-r-transparent 
                        before:border-b-[8px] before:border-b-rose-700
                        transition-transform duration-300"
                  [ngClass]="{'scale-110 shadow-[0_0_30px_rgba(245,158,11,0.7)] border-2 border-amber-400': inTargetZone}">
               <i class="fa-solid fa-face-smile text-white text-2xl xs:text-3xl drop-shadow-md animate-pulse" *ngIf="inTargetZone"></i>
               <i class="fa-solid fa-wind text-white text-2xl xs:text-3xl opacity-80" *ngIf="!inTargetZone"></i>
            </div>
            <!-- String -->
            <div class="absolute top-20 xs:top-24 w-px h-[500px] bg-gradient-to-b from-slate-300 dark:from-white/50 to-transparent"></div>
          </div>
        </div>

        <!-- Right HUD: Reps -->
        <div class="flex flex-col gap-2 xs:gap-4 w-[30%] max-w-[130px] z-20">
          <div class="text-left bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-2 xs:p-2.5 rounded-xl border border-white/20 dark:border-white/5 w-full h-full shadow-sm">
             <div class="text-xs xs:text-sm text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-0.5 sm:mb-1" aria-label="Repetition count"><i class="fa-solid fa-dumbbell text-amber-600 mr-1"></i> {{ i18n.t('game.hud.reps') }}</div>
             <div class="text-3xl xs:text-4xl font-black text-amber-700 dark:text-amber-300 tabular-nums">{{ currentRepVal }}</div>
             <div class="text-sm xs:text-base font-bold text-slate-500 mt-1 tabular-nums">/ {{ targetReps }}</div>
          </div>
        </div>

      </div>

      <!-- Hold/Release Progress Indicator -->
      <div class="mt-8 w-full max-w-xs xs:max-w-sm relative z-10">
        <div class="flex justify-between text-sm xs:text-base font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wider transition-colors duration-300">
          <span>{{ isReleasing ? i18n.t('game.hud.releaseStatus') : i18n.t('game.hud.holdTimer') }}</span>
          <span class="text-brand-accent">{{ holdProgress | number:'1.0-0' }}%</span>
        </div>
        <div class="h-3 xs:h-4 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-white/5 transition-colors duration-300" role="progressbar" [attr.aria-valuenow]="holdProgress" aria-valuemin="0" aria-valuemax="100">
          <div class="h-full bg-gradient-to-r transition-all duration-100 relative"
               [ngClass]="isReleasing ? 'from-sky-400 to-blue-500' : 'from-amber-400 to-amber-300 dark:from-amber-500 dark:to-amber-300'"
               [style.width.%]="holdProgress">
                 <div class="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCA4TDggMFpNMCAwTDggOFoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] opacity-30 animate-[slide_1s_linear_infinite]"></div>
          </div>
        </div>
      </div>
      
      <!-- Feedback Text -->
      <div class="mt-4 text-center font-bold text-xl xs:text-2xl h-8 xs:h-10 transition-colors duration-300 relative z-10"
           [ngClass]="isReleasing ? 'text-sky-600 dark:text-sky-400' : (inTargetZone ? 'text-amber-700 dark:text-amber-300 drop-shadow-[0_0_4px_rgba(245,158,11,0.3)] dark:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-slate-700 dark:text-slate-300')"
           role="status" aria-live="polite">
        {{ feedbackMessage }}
      </div>
    </div>
  `,
  styles: [`
    @media (prefers-reduced-motion: reduce) {
      :host ::ng-deep .animate-pulse { animation: none !important; }
      :host ::ng-deep [class*="transition"] { transition-duration: 0.01ms !important; }
      :host ::ng-deep .animate-\\[slide_1s_linear_infinite\\] { animation: none !important; }
    }
  `]
})
export class ZenBalloonComponent implements OnInit, OnDestroy {
  public i18n = inject(I18nService);
  public gameFlowState = signal<'ready' | 'countdown' | 'playing'>('ready');
  public countdownValue = signal<number>(3);
  private countdownTimer: any;
  private router = inject(Router);

  public isMuted = false;
  private lastVoicePlayTime = 0;
  private activeAudio: HTMLAudioElement | null = null;

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
  public releaseThresholdPercent = 0;
  public balloonPosition = 0;

  public inTargetZone = false;
  public isReleasing = false;
  private readonly releaseThreshold = 4.0; // 4.0 Newtons constant safe release threshold
  private currentRestMs = 0; // Track rest duration in milliseconds

  public holdProgress = 0; // 0 to 100 scale for progress bar
  private requiredHoldTimeMs = 2000; // Constant 2.0 seconds hold time
  private currentHoldMs = 0;

  public feedbackMessage = "Breathe and tuck to lift...";
  private gameloop: any;

  // Visual maximum scale of the tube based on calibration
  private get maxScale() {
    return Math.max(50, this.maxForceLimit * 1.3); // give 30% headroom above max force
  }

  // Percentage display for elderly users (instead of Newton)
  public forcePercent(): number {
    if (this.maxForceLimit <= 0) return 0;
    return Math.min(999, Math.round((this.currentForce() / this.maxForceLimit) * 100));
  }

  public peakPercent(): number {
    if (this.maxForceLimit <= 0) return 0;
    return Math.min(999, Math.round((this.peakForce() / this.maxForceLimit) * 100));
  }

  getTriggerProgressPercent(): number {
    return Math.min(100, Math.round((this.currentForce() / 5.0) * 100));
  }

  // Ensure rest zone has minimum visual height of 15% for readability
  public get restZoneVisualPercent(): number {
    return Math.max(15, this.releaseThresholdPercent);
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
      this.releaseThresholdPercent = (this.releaseThreshold / this.maxScale) * 100;

      // Logic check and transition biofeedback
      const wasInTarget = this.inTargetZone;
      
      // Guard: Do not trigger feedback or target zone evaluation if not actively playing
      if (this.gameFlowState() !== 'playing') {
        this.inTargetZone = false;
        if (this.gameFlowState() === 'ready' && force >= 5.0) {
          this.ngZone.run(() => {
            this.startCountdown();
          });
        }
        return;
      }
      
      // Red Balloon Overlap Logic:
      // Visual height of the balloon is roughly 22% of the track height.
      // We check if the interval [pos, pos + 22] overlaps [targetMinPercent, targetMaxPercent]
      const balloonHeightPercent = 22;
      const isCurrentlyInTarget = !this.isReleasing && 
                                  pos <= this.targetMaxPercent && 
                                  (pos + balloonHeightPercent) >= this.targetMinPercent;

      if (isCurrentlyInTarget !== wasInTarget) {
        this.inTargetZone = isCurrentlyInTarget;
        this.ngZone.run(() => {
          if (isCurrentlyInTarget) {
            this.biofeedback.playEnterZone();
            this.biofeedback.startVibrationLoop();
            this.playVoice('cue_hold.mp3');
          } else {
            if (this.currentHoldMs > 50) {
              this.biofeedback.playExitZone();
            } else {
              this.biofeedback.stopVibrationLoop();
            }
          }
        });
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.isMuted = localStorage.getItem('zen_balloon_muted') === 'true';
    // Initialize visuals for rep 0
    this.isReleasing = false;
    this.updateDifficulty();

    // Play introductory welcome cue
    setTimeout(() => {
      this.playVoice('intro.mp3');
    }, 600);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('zen_balloon_muted', String(this.isMuted));
    if (this.isMuted && this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
      this.biofeedback.feedbackVolumeMultiplier = 1.0;
    }
  }

  private playVoice(filename: string) {
    if (this.isMuted) return;

    const now = Date.now();
    if (now - this.lastVoicePlayTime < 3000) {
      return;
    }
    this.lastVoicePlayTime = now;

    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }

    const lang = this.i18n.currentLang();
    const path = `/assets/audio/${lang}/${filename}`;
    const audio = new Audio(path);
    this.activeAudio = audio;

    // Duck the tone feedback volume
    this.biofeedback.feedbackVolumeMultiplier = 0.2;

    const cleanup = () => {
      if (this.activeAudio === audio) {
        this.biofeedback.feedbackVolumeMultiplier = 1.0;
        this.activeAudio = null;
      }
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;
    audio.onpause = cleanup;

    audio.play().catch(err => {
      console.warn(`Voice playback failed for ${path}:`, err);
      cleanup();
    });
  }

  /**
   * Run a local logic interval outside of Angular Zone to prevent memory leaks / jitter
   * Updates only sync back when visually relevant.
   */
  private startGameLoop() {
    this.ngZone.runOutsideAngular(() => {
      this.gameloop = setInterval(() => {
        const force = this.currentForce();

        if (this.isReleasing) {
          // Release phase: Wait for force to drop below threshold (4.0 Newtons)
          if (force < this.releaseThreshold) {
            const wasResting = this.currentRestMs > 0;
            this.currentRestMs += 50;
            const newProgress = (this.currentRestMs / 2000) * 100;
            
            this.ngZone.run(() => {
              this.holdProgress = newProgress;
              this.updateFeedback();

              if (!wasResting) {
                this.playVoice('cue_resting.mp3');
              }

              if (this.currentRestMs >= 2000) {
                this.isReleasing = false;
                this.repCompleted.emit();
                this.triggerSuccessAnimation();
                this.biofeedback.playSuccess();
                this.currentHoldMs = 0;
                this.holdProgress = 0;
                this.currentRestMs = 0;
                this.updateFeedback();

                // Play success rep voice cue
                this.playVoice('cue_rep_success.mp3');

                // Play squeeze instruction cue after success chime has finished playing (3.5s delay)
                setTimeout(() => {
                  if (!this.isReleasing && !this.inTargetZone && this.currentRepVal < this.targetReps) {
                    this.playVoice('cue_squeeze.mp3');
                  }
                }, 3500);
              }
            });
          } else {
            // Squeezed during rest: reset rest progress immediately to enforce continuous rest
            if (this.currentRestMs !== 0 || this.holdProgress !== 0) {
              this.ngZone.run(() => {
                this.currentRestMs = 0;
                this.holdProgress = 0;
                this.updateFeedback();

                // Warn about squeezing during rest
                this.playVoice('cue_rest_warning.mp3');
              });
            }
          }
        } else {
          // Squeeze & Hold phase
          if (this.inTargetZone) {
            this.currentHoldMs += 50;

            if (this.currentHoldMs >= this.requiredHoldTimeMs) {
              this.ngZone.run(() => {
                this.isReleasing = true;
                this.inTargetZone = false;
                this.biofeedback.playHoldComplete();
                this.holdProgress = 0; // Starts at 0 for rest progress
                this.currentRestMs = 0;
                this.updateFeedback();

                // Prompt user to release force
                this.playVoice('cue_release.mp3');
              });
            }
          } else {
            // Normal depletion if balloon exits target zone
            this.currentHoldMs -= 50;
            if (this.currentHoldMs < 0) this.currentHoldMs = 0;

            // Warn if exceeding the target zone
            if (force > this.targetMax) {
              this.ngZone.run(() => {
                this.playVoice('cue_too_hard.mp3');
              });
            }
          }

          if (!this.isReleasing) {
            // Calculate view progress
            const newProgress = (this.currentHoldMs / this.requiredHoldTimeMs) * 100;

            // Sync graphics only if distinct changes occurred
            if (Math.abs(this.holdProgress - newProgress) > 1 || newProgress === 0) {
              this.ngZone.run(() => {
                this.holdProgress = newProgress;
                this.updateFeedback();
              });
            }
          }
        }
      }, 50); // 20 frames per second check aligns gracefully with 20Hz hardware rate
    });
  }

  private updateDifficulty() {
    // Lock hold time to constant 2.0 seconds
    this.requiredHoldTimeMs = 2000;

    // Randomize target zone position in the range 65% - 95% of PEAK
    // Let's use a 15% width target zone.
    // targetMin is randomized between 65% and 80% (so targetMax will be 80% to 95%)
    const minPercent = 0.65;
    const maxPercent = 0.80; // 0.95 - 0.15 width = 0.80
    const randMultiplier = minPercent + Math.random() * (maxPercent - minPercent);

    this.targetMin = this.maxForceLimit * randMultiplier;
    this.targetMax = this.targetMin + (this.maxForceLimit * 0.15);

    // Ensure values don't go below minimum safe threshold (e.g. 5 Newtons)
    if (this.targetMin < 5) {
      this.targetMin = 5;
      this.targetMax = Math.max(10, this.targetMax);
    }

    // Update visuals
    this.targetMinPercent = (this.targetMin / this.maxScale) * 100;
    this.targetMaxPercent = (this.targetMax / this.maxScale) * 100;
    this.releaseThresholdPercent = (this.releaseThreshold / this.maxScale) * 100;
  }

  private updateFeedback() {
    if (this.isReleasing) {
      const restTimeSec = Math.max(0, Math.ceil((2000 - this.currentRestMs) / 1000));
      if (this.currentForce() >= this.releaseThreshold) {
        this.feedbackMessage = this.i18n.t('game.feedback.releaseBelow');
      } else {
        this.feedbackMessage = this.i18n.t('game.feedback.keepRelaxed').replace('{0}', String(restTimeSec));
      }
    } else if (this.inTargetZone && this.holdProgress > 50) {
      this.feedbackMessage = this.i18n.t('game.feedback.holdAlmost');
    } else if (this.inTargetZone) {
      this.feedbackMessage = this.i18n.t('game.feedback.hold');
    } else if (this.currentForce() < this.targetMin) {
      this.feedbackMessage = this.i18n.t('game.feedback.squeeze');
    } else {
      this.feedbackMessage = this.i18n.t('game.feedback.tooHard');
    }
  }

  private triggerSuccessAnimation() {
    this.feedbackMessage = this.i18n.t('game.feedback.success');
    this.holdProgress = 100;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  finishSession() {
    this.router.navigate(['/summary']);
  }

  startCountdown() {
    this.gameFlowState.set('countdown');
    this.countdownValue.set(3);
    
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    
    this.countdownTimer = setInterval(() => {
      this.ngZone.run(() => {
        const currentVal = this.countdownValue();
        if (currentVal <= 1) {
          clearInterval(this.countdownTimer);
          this.startGame();
        } else {
          this.countdownValue.set(currentVal - 1);
        }
      });
    }, 1000);
  }

  startGame() {
    this.gameFlowState.set('playing');
    this.isReleasing = false;
    this.holdProgress = 0;
    this.currentHoldMs = 0;
    
    this.startGameLoop();
    
    // Play initial squeeze instruction cue after starting
    setTimeout(() => {
      if (this.gameFlowState() === 'playing' && !this.isReleasing && !this.inTargetZone) {
        this.playVoice('cue_squeeze.mp3');
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.gameloop) {
      clearInterval(this.gameloop);
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    this.biofeedback.stopVibrationLoop();
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
      this.biofeedback.feedbackVolumeMultiplier = 1.0;
    }
  }
}
