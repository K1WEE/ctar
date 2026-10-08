import { Component, Input, Output, EventEmitter, effect, Signal, NgZone, OnDestroy, OnInit, HostListener, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { NavbarService } from '../../services/navbar.service';
import { BiofeedbackService } from '../../services/biofeedback.service';
import { BleService } from '../../services/ble.service';
import { I18nService } from '../../services/i18n.service';
import { ChinTuckDemoComponent } from '../chin-tuck-demo/chin-tuck-demo.component';
import { SkySceneComponent } from '../sky-scene/sky-scene.component';
import { VoiceCue, VoiceLine, ZenBalloonVoiceCoach } from './zen-balloon-voice';


type FeedbackState = 'squeeze' | 'hold' | 'holdAlmost' | 'tooHard' | 'release' | 'success';

const FEEDBACK_ROTATE_MS = 5000;
// Released-force time that completes a rep.
export const REST_MS = 500;
// With no praise voice to wait for, linger only long enough to see the star.
export const SILENT_CELEBRATION_MS = 1200;

@Component({
  selector: 'app-zen-balloon',
  standalone: true,
  imports: [CommonModule, ChinTuckDemoComponent, SkySceneComponent],
  animations: [
    // Re-pops the countdown digit on every value change, then stays fully
    // visible — unlike animate-ping which fades the number out while it shows
    trigger('countdownPop', [
      transition('* => *', [
        style({ transform: 'scale(1.35)', opacity: 0.4 }),
        animate('250ms ease-out', style({ transform: 'scale(1)', opacity: 1 })),
      ]),
    ]),
  ],
  template: `
    <div [@.disabled]="prefersReducedMotion" class="game-card relative w-full">
      <!-- Decorative sky fills the viewport below the navbar, behind the HUD. -->
      <app-sky-scene></app-sky-scene>

      <!-- After the practice rep: a calm pause so the patient starts the real session when ready -->
      <div *ngIf="activeOverlay === 'ready'" class="game-overlay ready-screen">
        <div role="dialog" aria-modal="false" data-dialog="start" aria-labelledby="game-ready-title" aria-describedby="game-ready-description" class="ready-card">
          <span class="ready-icon" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
          <h2 id="game-ready-title" tabindex="-1" class="focus:outline-none">{{ i18n.t('game.ready.title') }}</h2>
          <p id="game-ready-description">{{ i18n.t('game.ready.body') }}</p>
          <p class="ready-target"><i class="fa-solid fa-bullseye" aria-hidden="true"></i> {{ i18n.t('game.targetReps') }} <strong>{{ targetReps }}</strong> {{ i18n.currentLang() === 'th' ? 'ครั้ง' : 'reps' }}</p>
          <button type="button" class="ready-start" (click)="beginSession()">{{ i18n.t('game.ready.start') }}</button>
          <button type="button" class="ready-again" (click)="enterPractice()">{{ i18n.t('game.ready.again') }}</button>
        </div>
      </div>

      <!-- Countdown State Overlay -->
      <div *ngIf="activeOverlay === 'countdown'" class="game-overlay absolute inset-0 bg-slate-950/55 z-30 flex flex-col items-center justify-center p-6 rounded-3xl animate-fade-in text-center">
        <span class="text-white font-bold uppercase tracking-widest text-sm xs:text-base sm:text-lg mb-4 drop-shadow-md">
          {{ countdownInstruction() }}
        </span>
        <!-- Massive number: pops in per digit, stays readable (no ping fade-out) -->
        <div [@countdownPop]="countdownValue()" class="text-8xl xs:text-9xl font-black text-amber-400 tabular-nums select-none drop-shadow-lg" role="status" aria-live="assertive">
          {{ countdownValue() }}
        </div>
      </div>

      <!-- Disconnected State Overlay -->
      <div *ngIf="activeOverlay === 'disconnected'" class="game-overlay absolute inset-0 bg-slate-950/65 z-40 flex flex-col items-center justify-center p-6 rounded-3xl animate-fade-in">
        <div role="alert" class="game-dialog bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-[320px] border border-slate-200 dark:border-white/10 text-center flex flex-col items-center space-y-4 animate-scale-up">
          <div class="dialog-body w-full flex flex-col items-center space-y-3">
          <div class="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <i class="fa-brands fa-bluetooth-b text-2xl text-red-500" aria-hidden="true"></i>
          </div>
          <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {{ i18n.currentLang() === 'th' ? 'การเชื่อมต่อหลุด' : 'Connection Lost' }}
          </h2>
          <p class="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
            {{ i18n.currentLang() === 'th' ? 'กรุณาเชื่อมต่ออุปกรณ์ใหม่อีกครั้ง เพื่อฝึกต่อ' : 'Please reconnect the device to continue training.' }}
          </p>
          <button (click)="goToConnect()"
            class="px-6 min-h-[52px] w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-md transition-all duration-300 text-base cursor-pointer border-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
            <i class="fa-solid fa-link mr-2" aria-hidden="true"></i>{{ i18n.currentLang() === 'th' ? 'เชื่อมต่อใหม่' : 'Reconnect' }}
          </button>
        </div>
        </div>
      </div>

      <!-- Stale sensor data overlay: keep the last force from being mistaken
           for a live reading while notifications are temporarily paused. -->
      <div *ngIf="activeOverlay === 'stale'" class="game-overlay absolute inset-0 bg-slate-950/65 z-40 flex flex-col items-center justify-center p-6 rounded-3xl animate-fade-in">
        <div role="alert" class="game-dialog bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-[320px] border border-slate-200 dark:border-white/10 text-center flex flex-col items-center space-y-4 animate-scale-up">
          <div class="dialog-body w-full flex flex-col items-center space-y-3">
          <div class="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <i class="fa-solid fa-wave-square text-2xl text-amber-600 dark:text-amber-400" aria-hidden="true"></i>
          </div>
          <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {{ i18n.currentLang() === 'th' ? 'กำลังรอสัญญาณเซนเซอร์' : 'Sensor signal paused' }}
          </h2>
          <p class="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
            {{ i18n.currentLang() === 'th' ? 'ระบบหยุดนับชั่วคราว กรุณารอสัญญาณใหม่จากอุปกรณ์' : 'Training is paused until a new reading arrives from the device.' }}
          </p>
        </div>
        </div>
      </div>

      <!-- Navigation pauses training until the patient chooses how to leave. -->
      <div *ngIf="activeOverlay === 'exit'" class="game-overlay bg-slate-950/65 flex items-center justify-center p-4">
        <div role="dialog" aria-modal="false" data-dialog="exit" aria-labelledby="exit-dialog-title" aria-describedby="exit-dialog-description" class="game-dialog w-full max-w-sm rounded-2xl bg-white p-4 sm:p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
          <div class="dialog-body w-full space-y-2">
            <h2 id="exit-dialog-title" tabindex="-1" class="text-xl font-bold focus:outline-none">{{ i18n.currentLang() === 'th' ? 'บันทึกผลก่อนออก?' : 'Save before leaving?' }}</h2>
            <p id="exit-dialog-description" class="text-base leading-relaxed text-slate-700 dark:text-slate-200">
              <span class="block">{{ i18n.currentLang() === 'th' ? 'ฝึกแล้ว ' + currentRepVal + ' จาก ' + targetReps + ' ครั้ง' : 'Completed ' + currentRepVal + ' of ' + targetReps + ' reps.' }}</span>
              <span class="block">{{ i18n.currentLang() === 'th' ? 'การฝึกหยุดชั่วคราว' : 'Training is paused.' }}</span>
            </p>
            <div class="flex flex-col gap-2">
              <div class="grid grid-cols-2 gap-2">
                <button type="button" data-exit-save (click)="confirmFinish()" class="min-h-12 w-full rounded-xl bg-emerald-700 px-3 py-2 text-base font-bold leading-tight text-white hover:bg-emerald-800">
                  {{ i18n.currentLang() === 'th' ? 'บันทึกและจบการฝึก' : 'Save and finish training' }}
                </button>
                <button type="button" data-exit-discard (click)="confirmExit()" class="min-h-12 w-full rounded-xl border border-red-700 bg-red-50 px-3 py-2 text-base font-bold leading-tight text-red-800 hover:bg-red-100 dark:border-red-400 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900">
                  {{ i18n.currentLang() === 'th' ? 'ออกโดยไม่บันทึก' : 'Leave without saving' }}
                </button>
              </div>
              <button type="button" data-exit-continue (click)="cancelExit()" class="min-h-12 w-full rounded-xl border border-slate-400 bg-white px-3 py-2 text-base font-bold text-slate-800 hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                {{ i18n.currentLang() === 'th' ? 'ฝึกต่อ' : 'Keep training' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="game-play-content w-full flex flex-col items-center" [attr.inert]="activeOverlay ? '' : null" [attr.aria-hidden]="activeOverlay ? 'true' : null">
      <dl class="game-stats">
        <div class="stat stat-reps">
          <dt><i class="fa-solid fa-repeat" aria-hidden="true"></i>{{ i18n.t('game.hud.reps') }}</dt>
          <dd><strong>{{ currentRepVal }}</strong><span> / {{ targetReps }}</span></dd>
          <dd class="stat-bar" aria-hidden="true"><span [style.width.%]="targetReps ? (currentRepVal / targetReps) * 100 : 0"></span></dd>
        </div>
      </dl>

      <div class="game-main-area" [class.session-complete]="sessionComplete">
        <p *ngIf="practiceRound()" class="practice-badge">{{ i18n.t('game.practice.badge') }}</p>
        <!-- Force sits beside the track so the patient reads it while watching the balloon. -->
        <dl class="force-side force-readout" *ngIf="gameFlowState() === 'playing'">
          <dt>{{ i18n.currentLang() === 'th' ? 'แรงกด' : 'Force' }}</dt>
          <dd class="force-value">{{ forcePercent() }}<span>%</span></dd>
        </dl>
        <!-- Scale the entire track together: target contact depends on rendered
             rectangles, so changing only the balloon would change the exercise. -->
        <!-- The Balloon Track (Centered & Dynamically Sized to fill parent container height) -->
        <div class="game-track relative w-24 xs:w-28 h-[85%] xs:h-[90%] bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner flex flex-col justify-end z-10 transition-colors duration-300">
          
          <!-- Target Zone Overlay (Elderly-Friendly High-Contrast Amber/Orange with indicators) -->
          <div #targetZone *ngIf="!isReleasing"
               class="absolute w-full bg-amber-500/30 dark:bg-amber-500/40 border-y-4 border-amber-600 dark:border-amber-400 transition-all flex items-center justify-between px-1.5 xs:px-2"
               [style.bottom.%]="targetZoneVisualBottom"
               [style.height.%]="targetZoneVisualHeight">
             <i class="fa-solid fa-chevron-right text-amber-700 dark:text-amber-300 text-xs"></i>
             <span class="text-xs xs:text-sm font-black text-amber-950 dark:text-amber-100 uppercase tracking-tight whitespace-nowrap pointer-events-none select-none">{{ i18n.t('game.zone.target') }}</span>
             <i class="fa-solid fa-chevron-left text-amber-700 dark:text-amber-300 text-xs"></i>
          </div>

          <!-- Release Green Zone Overlay (Visible only when releasing for relaxation below 4.0N) -->
          <div *ngIf="isReleasing"
               class="absolute w-full bg-emerald-500/20 dark:bg-emerald-500/35 border-t-4 border-emerald-500/80 transition-all flex flex-col items-center justify-center px-1"
               style="bottom: 0;"
               [style.height.%]="restZoneVisualPercent">
             <i class="fa-solid fa-chevron-down text-emerald-600 dark:text-emerald-400 text-xs mb-0.5"></i>
             <span class="text-xs xs:text-sm font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-tight whitespace-nowrap pointer-events-none select-none">{{ i18n.t('game.zone.rest') }}</span>
          </div>

          <!-- Practice tip: a ghost balloon acts out the move — rise into the
               target, stay there, then drift back down to rest -->
          <div *ngIf="practiceRound() && gameFlowState() === 'playing' && !isReleasing && !inTargetZone" class="ghost-balloon"
               [class.dim]="currentForce() >= 4" [style.--ghost-to]="targetZoneVisualBottom + '%'" aria-hidden="true">
            <div class="ghost-body w-14 h-18 xs:w-16 xs:h-20"></div>
            <i class="fa-solid fa-arrow-up ghost-arrow"></i>
          </div>

          <!-- The Floating Balloon (Raised offset slightly to prevent bottom clipping) -->
          <div class="absolute w-full flex justify-center transition-all duration-75 ease-linear"
               [style.bottom.%]="balloonPosition * 0.85 + 6">
            <div #balloonBody class="w-14 h-18 xs:w-16 xs:h-20 bg-gradient-to-tr from-rose-600 to-pink-500 rounded-[50%] shadow-md relative flex items-center justify-center
                        before:content-[''] before:absolute before:-bottom-2 before:w-0 before:h-0
                        before:border-l-[5px] before:border-l-transparent before:border-r-[5px] before:border-r-transparent
                        before:border-b-[7px] before:border-b-rose-700
                        transition-transform duration-300"
                  [ngClass]="{'ring-2 ring-amber-400': inTargetZone}">
               <i class="fa-solid fa-face-smile text-white text-xl xs:text-2xl drop-shadow-md animate-pulse" *ngIf="inTargetZone"></i>
               <i class="fa-solid fa-wind text-white text-xl xs:text-2xl opacity-80" *ngIf="!inTargetZone"></i>
            </div>
            <!-- String -->
            <div class="absolute top-18 xs:top-20 w-px h-[500px] bg-gradient-to-b from-slate-300 dark:from-white/50 to-transparent"></div>
          </div>
        </div>

        <!-- Per-rep praise; decorative, the cue line below announces success. -->
        <div *ngFor="let p of praiseList(); trackBy: trackPraise" class="praise-burst" aria-hidden="true">
          <span class="praise-glow"></span>
          <span class="praise-rays"></span>
          <i *ngFor="let c of confetti" class="confetti" [style.--a]="c.a + 'deg'" [style.--d]="c.d + 'px'" [style.--c]="c.c" [style.--r]="c.r + 'deg'"></i>
          <svg class="praise-star" viewBox="0 0 100 96">
            <defs>
              <linearGradient id="praiseStarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#fff3a3"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#f59e0b"/>
              </linearGradient>
            </defs>
            <path d="M50 4c3 0 5 2 6.5 5l10 20.5 22.5 3.3c6.5 1 8.5 6.5 4 11L76.5 59.6l3.9 22.4c1.1 6.5-3.8 10-9.6 7L50 78.4 29.2 89c-5.8 3-10.7-.5-9.6-7l3.9-22.4L7 43.8c-4.5-4.5-2.5-10 4-11l22.5-3.3L43.5 9C45 6 47 4 50 4z" fill="url(#praiseStarFill)" stroke="#e8920c" stroke-width="2"/>
            <ellipse cx="38" cy="30" rx="9" ry="5" fill="#fff" opacity=".55" transform="rotate(-30 38 30)"/>
          </svg>
          <span class="sparkle s1"></span><span class="sparkle s2"></span><span class="sparkle s3"></span><span class="sparkle s4"></span>
          <strong class="praise-text"><span class="praise-outline">{{ p.text }}</span><span class="praise-fill">{{ p.text }}</span></strong>
        </div>
      </div>


      <!-- Hold/Release Progress Indicator -->
      <div class="progress-container">
        <div class="flex justify-between text-sm xs:text-base font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wider transition-colors duration-300">
          <span class="hold-label"><i class="fa-solid fa-stopwatch" aria-hidden="true"></i>{{ sessionComplete ? i18n.t('game.sessionComplete') : (isReleasing ? i18n.t('game.hud.releaseStatus') : i18n.t('game.hud.holdTimer')) }}</span>
          <span class="text-blue-700 dark:text-blue-300">{{ holdProgress | number:'1.0-0' }}%</span>
        </div>
        <div class="h-3 xs:h-4 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-white/5 transition-colors duration-300" role="progressbar" [attr.aria-label]="isReleasing ? i18n.t('game.hud.releaseStatus') : i18n.t('game.hud.holdTimer')" [attr.aria-valuenow]="holdProgress" aria-valuemin="0" aria-valuemax="100">
          <div class="h-full transition-all duration-100 relative"
               [ngClass]="isReleasing ? 'bg-sky-500' : 'bg-amber-500'"
               [style.width.%]="holdProgress">
          </div>
        </div>
      </div>
      <div class="cue-area">
        <div class="feedback-container" role="status" aria-live="polite"
             [ngClass]="isReleasing ? 'text-sky-800 dark:text-sky-200' : (inTargetZone ? 'text-amber-800 dark:text-amber-200' : 'text-slate-800 dark:text-slate-100')">
          {{ feedbackMessage }}
        </div>
        <button *ngIf="practiceRound() && gameFlowState() === 'playing'" type="button" class="practice-skip" (click)="beginSession()">{{ i18n.t('game.practice.skip') }}</button>
      </div>
      
      </div>
    </div>
  `,
  styles: [`
    /* Layout and exercise geometry live here; visual theme is in src/training.css. */
    .game-overlay { position:fixed; inset:var(--app-navbar-height, 0px) 0 0; overflow-y:auto; z-index:40; }
    .game-dialog { max-height:calc(100dvh - var(--app-navbar-height, 0px) - 2rem); display:flex; flex-direction:column; overflow:hidden; }
    .dialog-body { min-height:0; overflow-y:auto; overscroll-behavior:contain; }
    .game-play-content { position:relative; z-index:1; padding-bottom:calc(var(--meadow-h) * .5); display:grid; grid-template-areas:'stats' 'scene' 'progress' 'cue'; gap:16px; width:100%; max-width:640px; margin-inline:auto; }
    .cue-area { grid-area:cue; display:flex; flex-direction:column; align-items:center; gap:4px; }
    .feedback-container { width:100%; min-height:4.35em; text-align:center; font-size:clamp(1.375rem,2.5vw,2rem); line-height:1.45; font-weight:700; text-wrap:balance; }
    .game-main-area { grid-area:scene; display:flex; align-items:center; justify-content:center; position:relative; isolation:isolate; padding:16px; overflow:hidden; }
    /* Keep the original dimensions and force-to-position mapping. A common
       transform preserves intersection at every force, including edge contact. */
    .game-track { height:clamp(16rem,45dvh,32rem); min-height:16rem; flex-shrink:0; }
    .progress-container { grid-area:progress; min-width:0; }
    .game-stats { grid-area:stats; display:flex; gap:12px; }
    @media(min-width:768px) {
      .game-main-area { padding-block:calc(clamp(16rem,45dvh,32rem) * 0.1 + 24px); }
      .game-track { transform:scale(1.2); }
    }
    /* Desktop: scene fills the viewport height on the left, HUD centred on the right. */
    @media(min-width:1024px) {
      .game-play-content { max-width:1040px; grid-template-columns:minmax(0,1.2fr) minmax(320px,0.8fr); grid-template-rows:1fr auto auto auto 1fr; grid-template-areas:'scene .' 'scene stats' 'scene progress' 'scene cue' 'scene .'; gap:20px 32px; padding-bottom:0; }
      .game-main-area { min-height:calc(100dvh - var(--app-navbar-height, 0px) - 4rem); }
    }
    @media(max-height:600px) and (orientation:landscape) {
      .game-overlay { justify-content:flex-start !important; overflow-y:auto; padding:8px !important; }
      .game-dialog { margin-block:auto; }
    }
  `]
})
export class ZenBalloonComponent implements OnInit, OnDestroy {
  public i18n = inject(I18nService);
  public bleService = inject(BleService);
  public gameFlowState = signal<'ready' | 'countdown' | 'playing' | 'disconnected'>('playing');
  // The first round is a full rep (reach, hold, relax) that teaches the game and isn't counted
  public practiceRound = signal(false);
  get activeOverlay(): 'ready' | 'countdown' | 'disconnected' | 'stale' | 'exit' | null {
    if (this.showExitConfirm()) return 'exit';
    const flow = this.gameFlowState();
    if (flow !== 'playing') return flow;
    return this.sensorDataStale() ? 'stale' : null;
  }
  public countdownValue = signal<number>(3);
  public showExitConfirm = signal<boolean>(false);
  private countdownTimer: any;
  private voiceTimeout: any;
  private progressionPaused = false;
  private pausedFlow: 'countdown' | 'playing' | null = null;
  private navbar = inject(NavbarService);
  private unregisterNavbar?: () => void;
  private destroyed = false;
  private hasStarted = false;
  private resumePracticeOnReconnect = false;
  private introStarted = false;
  @Output() sessionExit = new EventEmitter<'save' | 'discard' | 'leave'>();
  @Output() exitDialogChange = new EventEmitter<boolean>();
  private dialogReturnFocus: HTMLElement | null = null;
  private dialogFocusTimer: ReturnType<typeof setTimeout> | null = null;

  public isMuted = false;
  private activeAudio: HTMLAudioElement | null = null;
  private readonly voice = new ZenBalloonVoiceCoach((line, cue) => this.speakLine(line, cue));
  // While a clip plays, the cue text is pinned to the sentence being spoken.
  private spokenTextKey: string | null = null;
  private feedbackState: FeedbackState | null = null;
  private feedbackLastChangedAt = 0;
  private successFeedbackUntil = 0;
  private readonly feedbackIndices: Record<FeedbackState, number> = {
    squeeze: -1,
    hold: -1,
    holdAlmost: -1,
    tooHard: -1,
    release: -1,
    success: -1,
  };
  private readonly feedbackMessageKeys: Record<FeedbackState, string[]> = {
    squeeze: ['game.feedback.squeeze1', 'game.feedback.squeeze2', 'game.feedback.squeeze3', 'game.feedback.squeeze4'],
    // Same sentences as the recorded clips, so silent and spoken cues agree.
    hold: ['game.feedback.hold1'],
    holdAlmost: ['game.feedback.holdAlmost'],
    tooHard: ['game.feedback.tooHard1'],
    release: ['game.feedback.release1'],
    success: ['game.feedback.success1', 'game.feedback.success2', 'game.feedback.success3', 'game.feedback.success4'],
  };
  // Sustained-violation accumulator for the rest phase (see game loop)
  private restViolationMs = 0;
  // Angular animations run via WAAPI; the CSS reduced-motion rules can't stop them
  public prefersReducedMotion = typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      if (rep > 0 && !this.sessionComplete) {
        this.updateDifficulty();
      }
    }
  }
  public currentRepVal = 0;
  public sessionComplete = false;

  // Emitted safely upwards to the logic service so we avoid mutating service internals here
  @Output() repCompleted = new EventEmitter<void>();
  // The final rep's praise has been heard (or shown, when silent); safe to leave for the summary.
  @Output() celebrationDone = new EventEmitter<void>();
  private celebrationTimer: ReturnType<typeof setTimeout> | null = null;
  private finalPraiseSpeaking = false;

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
  @Input() requiredHoldTimeMs = 2000; // Configurable hold time, defaults to 2.0s
  private currentHoldMs = 0;

  public feedbackMessage = '';
  private gameloop: any;
  public sensorDataStale = signal(false);

  // Visual maximum scale of the tube, anchored to the *active* target zone.
  //
  // Anchoring to targetMax (not the raw calibrated max with a fixed 50N floor)
  // keeps the target band sitting ~⅔ up the tube for every patient. A weakly
  // calibrated user used to get a band compressed onto the floor, where the
  // resting balloon's 22%-tall body already overlapped it — so they scored a
  // hold without squeezing at all. Tying the scale to targetMax guarantees the
  // balloon must always travel a real distance to reach the zone (the track
  // also has a minimum height so text scaling cannot collapse it), while the
  // /0.78 factor leaves headroom above the band for over-press ("too hard").
  private get maxScale() {
    return Math.max(this.targetMax / 0.78, 10);
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

  // The balloon is drawn at (pos * 0.85 + 6)% from the bottom, so every zone
  // must use the same mapping — otherwise the visuals drift away from the
  // in-zone logic as positions get higher.
  public get targetZoneVisualBottom(): number {
    return this.targetMinPercent * 0.85 + 6;
  }

  public get targetZoneVisualHeight(): number {
    return (this.targetMaxPercent - this.targetMinPercent) * 0.85;
  }

  // Ensure rest zone has minimum visual height of 15% for readability
  public get restZoneVisualPercent(): number {
    return Math.max(15, this.releaseThresholdPercent * 0.85 + 6);
  }

  constructor(private ngZone: NgZone, private biofeedback: BiofeedbackService, private host: ElementRef<HTMLElement>) {
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
      
      // Guard: Do not trigger feedback or target zone evaluation if not actively playing
      if (this.gameFlowState() !== 'playing' || this.sensorDataStale() || this.progressionPaused) {
        this.inTargetZone = false;
        return;
      }
      

    }, { allowSignalWrites: true });

    // A stale-sensor overlay is a safety pause. Resume only after a fresh
    // sample arrives; opening a user confirmation dialog never auto-resumes.
    effect(() => {
      const lastSampleAt = this.bleService.lastSampleAt();
      if (lastSampleAt === null || !this.sensorDataStale() || this.progressionPaused
        || this.gameFlowState() !== 'playing' || !this.bleService.isSampleFresh()) {
        return;
      }

      this.ngZone.run(() => {
        if (!this.sensorDataStale() || this.progressionPaused || this.gameFlowState() !== 'playing') return;
        this.sensorDataStale.set(false);
        this.updateFeedback();
        this.startGameLoop();
      });
    }, { allowSignalWrites: true });

    // Freeze the session if the BLE device drops mid-game — otherwise the
    // balloon silently sticks at the last force value and the user keeps
    // pressing with no response. Resumes to the ready screen on reconnect.
    effect(() => {
      const connection = this.bleService.connectionState();
      const flow = this.gameFlowState();
      if (connection !== 'Connected' && (flow === 'playing' || flow === 'countdown')) {
        this.resumePracticeOnReconnect = this.practiceRound();
        this.ngZone.run(() => this.handleDisconnect());
      } else if (connection === 'Connected' && flow === 'disconnected' && !this.showExitConfirm()) {
        this.ngZone.run(() => this.resumePracticeOnReconnect ? this.enterPractice() : this.startCountdown());
      }
    }, { allowSignalWrites: true });
  }

  @ViewChild('balloonBody') private balloonBody?: ElementRef<HTMLElement>;
  @ViewChild('targetZone') private targetZone?: ElementRef<HTMLElement>;

  private updateTargetContact(): void {
    // Use the rendered body so contact agrees with what the patient sees,
    // including font scaling, viewport changes and the movement transition.
    // The decorative string and knot are outside this body's bounds.
    const touching = !this.isReleasing && this.isBalloonTouchingTarget();

    if (touching === this.inTargetZone) return;
    this.ngZone.run(() => {
      this.inTargetZone = touching;
      if (touching) {
        this.biofeedback.playEnterZone();
        this.biofeedback.startVibrationLoop();
        this.voice.enteredZone();
      } else {
        this.biofeedback.stopVibrationLoop();
        if (this.currentHoldMs > 50) this.biofeedback.playExitZone();
      }
      this.updateFeedback();
    });
  }

  private isBalloonTouchingTarget(): boolean {
    const balloon = this.balloonBody?.nativeElement.getBoundingClientRect();
    const target = this.targetZone?.nativeElement.getBoundingClientRect();
    return !!balloon && !!target
      && balloon.height > 0 && target.height > 0
      && balloon.bottom >= target.top && balloon.top <= target.bottom
      && balloon.right >= target.left && balloon.left <= target.right;
  }

  private handleDisconnect() {
    this.stopGameLoop();
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.progressionPaused = this.showExitConfirm();
    this.pausedFlow = null;
    this.stopActiveFeedback();
    this.biofeedback.stopVibrationLoop();
    this.inTargetZone = false;
    this.sensorDataStale.set(false);
    this.gameFlowState.set('disconnected');
    this.playAudioFile('cue_disconnected.mp3');
  }

  goToConnect() {
    // Reconnect in place and preserve the current calibration/session.
    this.bleService.connect();
  }

  ngOnInit() {
    this.isMuted = localStorage.getItem('zen_balloon_muted') === 'true';
    // Register after the parent's first check so the shared navbar can update safely.
    queueMicrotask(() => {
      if (!this.destroyed) this.unregisterNavbar = this.navbar.registerGame({
        back: () => this.goBack(), toggleMute: () => this.toggleMute(), isMuted: () => this.isMuted,
      });
    });
    // Initialize visuals for rep 0
    this.isReleasing = false;
    this.feedbackState = null;
    this.updateDifficulty();
    // The calibrate page's taps usually unlock audio already; on a fresh load
    // the intro waits for the first touch instead of failing silently.
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (!activation || activation.hasBeenActive) this.voice.start();
    this.enterPractice();
  }

  @HostListener('document:pointerdown')
  onFirstPointer() {
    if (!this.introStarted && this.practiceRound()) this.voice.start();
  }

  /** Play one uncounted rep on the live scene, then count down into the real session. */
  enterPractice() {
    this.resumePracticeOnReconnect = false;
    this.practiceRound.set(true);
    this.startRound();
  }

  private finishPractice() {
    this.stopGameLoop();
    this.practiceRound.set(false);
    this.isReleasing = false;
    this.inTargetZone = false;
    this.currentHoldMs = 0;
    this.currentRestMs = 0;
    this.holdProgress = 100;
    this.biofeedback.stopVibrationLoop();
    this.biofeedback.playSuccess();
    // No praise star here — that celebration is kept for counted reps
    this.gameFlowState.set('ready');
    this.focusDialog('start');
  }

  /** Start the real session (from the ready screen, or skipping the practice). */
  beginSession() {
    this.stopGameLoop();
    this.practiceRound.set(false);
    this.isReleasing = false;
    this.inTargetZone = false;
    this.biofeedback.stopVibrationLoop();
    this.hasStarted = true;
    if (!this.introStarted) this.voice.start();
    this.startCountdown();
  }

  countdownInstruction(): string {
    const key = this.countdownValue() === 3
      ? 'game.countdown.three'
      : (this.countdownValue() === 2 ? 'game.countdown.two' : 'game.countdown.one');
    return this.i18n.t(key);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('zen_balloon_muted', String(this.isMuted));
    if (this.isMuted) this.stopActiveFeedback();
  }

  private setVoiceTimeout(callback: () => void, delay: number) {
    if (this.voiceTimeout) {
      clearTimeout(this.voiceTimeout);
    }
    this.voiceTimeout = setTimeout(callback, delay);
  }

  private stopGameLoop() {
    if (this.gameloop) {
      clearInterval(this.gameloop);
      this.gameloop = null;
    }
  }

  private stopActiveFeedback() {
    this.voice.reset();
    this.spokenTextKey = null;
    if (this.voiceTimeout) {
      clearTimeout(this.voiceTimeout);
      this.voiceTimeout = null;
    }
    this.stopVoice();
  }

  private pauseProgressionForDialog() {
    if (!this.progressionPaused) {
      const flow = this.gameFlowState();
      this.pausedFlow = flow === 'countdown' || flow === 'playing' ? flow : null;
    }
    this.progressionPaused = true;
    this.stopGameLoop();
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.inTargetZone = false;
    this.biofeedback.stopVibrationLoop();
    this.stopActiveFeedback();
  }

  private resumeProgressionAfterDialog() {
    if (!this.progressionPaused || this.gameFlowState() === 'disconnected') return;
    const pausedFlow = this.pausedFlow;
    this.progressionPaused = false;
    this.pausedFlow = null;

    if (pausedFlow === 'countdown' && this.bleService.connectionState() === 'Connected') {
      this.startCountdown(false);
    } else if (pausedFlow === 'playing'
      && this.bleService.connectionState() === 'Connected'
      && !this.sensorDataStale()
      && this.bleService.isSampleFresh()) {
      this.startGameLoop();
      this.updateFeedback();
    }
  }

  private speakLine(line: VoiceLine, cue: VoiceCue): boolean {
    const finalPraise = cue === 'success' && this.sessionComplete;
    const played = this.playAudioFile(line.file, line.fallback, () => {
      this.spokenTextKey = null;
      this.voice.finished();
      if (!this.spokenTextKey) this.refreshFeedbackText();
      if (finalPraise) this.celebrationDone.emit();
    });
    if (finalPraise) this.finalPraiseSpeaking = played;
    if (cue === 'intro' && played) this.introStarted = true;
    // The intro plays under the countdown overlay; there is no cue line to pin.
    if (played && cue !== 'intro') {
      this.spokenTextKey = line.textKey;
      this.feedbackMessage = this.i18n.t(line.textKey);
    }
    return played;
  }

  private refreshFeedbackText() {
    this.feedbackLastChangedAt = 0;
    this.updateFeedback();
  }

  private stopVoice() {
    const previous = this.activeAudio;
    this.activeAudio = null;
    previous?.pause();
    this.biofeedback.feedbackVolumeMultiplier = 1.0;
  }

  /** Plays one clip, replacing the current one. `onFinished` runs once when it ends or fails for good. */
  private playAudioFile(filename: string, fallbackFilename?: string, onFinished?: () => void): boolean {
    const lang = this.i18n.voiceLanguage();
    if (this.destroyed || this.isMuted || this.progressionPaused || !lang) return false;
    this.stopVoice();
    const audio = new Audio(`/assets/audio/${lang}/${filename}`);
    this.activeAudio = audio;
    const release = () => {
      this.activeAudio = null;
      this.biofeedback.feedbackVolumeMultiplier = 1.0;
    };
    const finished = () => {
      // stopVoice() detaches the clip first, so a replaced clip never reports back.
      if (this.activeAudio !== audio) return;
      release();
      onFinished?.();
    };
    const failed = () => {
      // A replaced, paused or already-failed clip must never launch a fallback.
      if (this.activeAudio !== audio) return;
      release();
      if (fallbackFilename && this.playAudioFile(fallbackFilename, undefined, onFinished)) return;
      onFinished?.();
    };
    audio.onended = finished;
    audio.onpause = finished;
    audio.onerror = failed;
    this.biofeedback.feedbackVolumeMultiplier = 0.2;
    audio.play().catch(failed);
    return true;
  }

  /**
   * Run a local logic interval outside of Angular Zone to prevent memory leaks / jitter
   * Updates only sync back when visually relevant.
   */
  private startGameLoop() {
    this.stopGameLoop();
    this.ngZone.runOutsideAngular(() => {
      this.gameloop = setInterval(() => {
        if (this.sessionComplete) return;
        if (this.progressionPaused || this.gameFlowState() !== 'playing') return;
        if (!this.bleService.isSampleFresh()) {
          this.stopGameLoop();
          this.ngZone.run(() => {
            if (!this.sensorDataStale()) {
              this.sensorDataStale.set(true);
              this.inTargetZone = false;
              this.biofeedback.stopVibrationLoop();
            }
          });
          return;
        }

        if (this.sensorDataStale()) {
          this.ngZone.run(() => {
            this.sensorDataStale.set(false);
            this.updateFeedback();
          });
          return;
        }

        const force = this.currentForce();
        this.updateTargetContact();

        if (this.isReleasing) {
          // Release phase: Wait for force to drop below threshold (4.0 Newtons)
          if (force < this.releaseThreshold) {
            this.restViolationMs = 0;
            this.currentRestMs += 50;
            const newProgress = (this.currentRestMs / REST_MS) * 100;
            
            this.ngZone.run(() => {
              this.holdProgress = newProgress;
              this.updateFeedback();

              if (this.currentRestMs >= REST_MS) {
                if (this.practiceRound()) {
                  this.finishPractice();
                  return;
                }
                // Keep the final completed bar visible throughout the summary delay.
                if (this.currentRepVal + 1 >= this.targetReps) {
                  this.sessionComplete = true;
                  this.holdProgress = 100;
                  clearInterval(this.gameloop);
                  this.biofeedback.playSuccess();
                  this.showPraise(this.voice.repCompleted());
                  if (!this.finalPraiseSpeaking) {
                    this.celebrationTimer = setTimeout(() => this.celebrationDone.emit(), SILENT_CELEBRATION_MS);
                  }
                  this.updateFeedback();
                  this.repCompleted.emit();
                  return;
                }
                this.isReleasing = false;
                this.repCompleted.emit();
                this.triggerSuccessAnimation();
                this.currentHoldMs = 0;
                this.holdProgress = 0;
                this.currentRestMs = 0;
                this.voice.beginRep(false);
                this.updateFeedback();
              }
            });
          } else {
            // Squeezed during rest. Elderly users commonly tremor around the
            // threshold, so a momentary spike only pauses the rest counter —
            // progress resets only after a sustained (300ms) violation.
            this.restViolationMs += 50;
            if (this.restViolationMs >= 300 && (this.currentRestMs !== 0 || this.holdProgress !== 0)) {
              this.ngZone.run(() => {
                this.currentRestMs = 0;
                this.holdProgress = 0;
                this.updateFeedback();

                this.voice.restViolation();
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
                this.voice.holdCompleted();
                this.updateFeedback();
              });
            }
          } else {
            // Normal depletion if balloon exits target zone
            this.currentHoldMs -= 50;
            if (this.currentHoldMs < 0) this.currentHoldMs = 0;
          }

          if (!this.isReleasing) {
            this.voice.trackTooHard(!this.inTargetZone && force >= this.targetMin, 50);
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
    // Hold time is kept at the configured settings value (no longer hardcoded)

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
    if (this.sessionComplete) {
      this.feedbackMessage = this.i18n.t(this.spokenTextKey ?? 'game.sessionComplete');
      return;
    }
    if (this.feedbackState === 'success' && Date.now() < this.successFeedbackUntil) return;

    let state: FeedbackState;
    let replacement: string | undefined;

    if (this.isReleasing) {
      const restTimeSec = Math.max(0, Math.ceil((REST_MS - this.currentRestMs) / 1000));
      if (this.currentForce() >= this.releaseThreshold) {
        state = 'release';
      } else {
        state = 'release';
        replacement = String(restTimeSec);
      }
    } else if (this.inTargetZone && this.holdProgress > 50) {
      state = 'holdAlmost';
    } else if (this.inTargetZone) {
      state = 'hold';
    } else if (this.currentForce() < this.targetMin) {
      state = 'squeeze';
    } else {
      state = 'tooHard';
    }

    this.applyFeedbackState(state, replacement);
  }

  private applyFeedbackState(state: FeedbackState, replacement?: string) {
    const now = Date.now();
    const stateChanged = state !== this.feedbackState;
    if (!stateChanged && now - this.feedbackLastChangedAt < FEEDBACK_ROTATE_MS) return;

    const choices = this.feedbackMessageKeys[state];
    let nextIndex = (this.feedbackIndices[state] + 1) % choices.length;
    const previousMessage = this.feedbackMessage;
    let nextMessage = this.i18n.t(choices[nextIndex]);
    if (choices.length > 1 && nextMessage === previousMessage) {
      nextIndex = (nextIndex + 1) % choices.length;
      nextMessage = this.i18n.t(choices[nextIndex]);
    }

    this.feedbackIndices[state] = nextIndex;
    this.feedbackState = state;
    this.feedbackLastChangedAt = now;
    this.feedbackMessage = this.spokenTextKey
      ? this.i18n.t(this.spokenTextKey)
      : (replacement ? nextMessage.replace('{0}', replacement) : nextMessage);
  }

  public praise = signal<{ id: number; text: string } | null>(null);
  public praiseList = computed(() => { const p = this.praise(); return p ? [p] : []; });
  public trackPraise = (_: number, p: { id: number }) => p.id;
  // Fixed burst layout: angle, distance, colour and spin per confetti piece.
  public confetti = [
    { a: -150, d: 120, c: '#f472b6', r: 30 }, { a: -120, d: 135, c: '#fbbf24', r: -20 }, { a: -95, d: 110, c: '#60a5fa', r: 45 },
    { a: -60, d: 130, c: '#f472b6', r: -35 }, { a: -30, d: 120, c: '#fbbf24', r: 15 }, { a: 10, d: 115, c: '#60a5fa', r: -50 },
    { a: 160, d: 115, c: '#fbbf24', r: 25 }, { a: 195, d: 125, c: '#f472b6', r: -15 }, { a: 40, d: 105, c: '#fbbf24', r: 60 },
    { a: 135, d: 100, c: '#60a5fa', r: -40 },
  ];
  private praiseSeq = 0;
  private praiseTimer: any;

  /** The star shows the short form of the praise being spoken. */
  public showPraise(line: VoiceLine) {
    this.praise.set({ id: ++this.praiseSeq, text: this.i18n.t(line.starKey ?? 'game.praise.1') });
    clearTimeout(this.praiseTimer);
    this.praiseTimer = setTimeout(() => this.ngZone.run(() => this.praise.set(null)), 1800);
  }

  private triggerSuccessAnimation() {
    // Fanfare first: a voice clip ducks any effect scheduled after it starts.
    this.biofeedback.playSuccess();
    const line = this.voice.repCompleted();
    this.showPraise(line);
    this.successFeedbackUntil = Date.now() + 1800;
    this.feedbackState = 'success';
    this.feedbackLastChangedAt = Date.now();
    this.feedbackMessage = this.i18n.t(line.textKey);
    this.holdProgress = 100;
  }

  goBack() {
    if (this.showExitConfirm()) return;
    if (!this.hasStarted) {
      // Nothing played yet — leave straight to the patient portal
      this.sessionExit.emit('leave');
      return;
    }
    this.pauseProgressionForDialog();
    this.rememberDialogFocus();
    this.showExitConfirm.set(true);
    this.exitDialogChange.emit(true);
    this.focusDialog('exit');
  }

  confirmExit() {
    this.pauseProgressionForDialog();
    this.sessionExit.emit('discard');
  }

  cancelExit() {
    this.showExitConfirm.set(false);
    this.resumeProgressionAfterDialog();
    this.exitDialogChange.emit(false);
    this.restoreDialogFocus();
  }

  confirmFinish() {
    this.pauseProgressionForDialog();
    this.sessionExit.emit('save');
  }

  /** Keep keyboard and switch-control users inside the active confirmation dialog. */
  @HostListener('document:keydown', ['$event'])
  onDialogKeydown(event: KeyboardEvent) {
    const dialog = this.getActiveDialog();
    if (!dialog) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.showExitConfirm()) this.cancelExit();
      return;
    }

    if (event.key !== 'Tab') return;
    // The navbar remains available even when a training dialog is open.
    const navbar = document.querySelector<HTMLElement>('[data-app-navbar]');
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = [...(navbar ? Array.from(navbar.querySelectorAll<HTMLElement>(selector)) : []), ...Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ))].filter(element => element.offsetParent !== null);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private getActiveDialog(): HTMLElement | null {
    const dialogType = this.showExitConfirm()
      ? 'exit'
      : (this.gameFlowState() === 'ready' ? 'start' : null);
    return dialogType ? this.host.nativeElement.querySelector(`[data-dialog="${dialogType}"]`) : null;
  }

  private rememberDialogFocus() {
    if (!this.getActiveDialog() && document.activeElement instanceof HTMLElement) {
      this.dialogReturnFocus = document.activeElement;
    }
  }

  private focusDialog(dialogType: 'exit' | 'start') {
    if (this.dialogFocusTimer) clearTimeout(this.dialogFocusTimer);
    this.dialogFocusTimer = setTimeout(() => {
      const dialog = this.host.nativeElement.querySelector<HTMLElement>(`[data-dialog="${dialogType}"]`);
      const title = dialog?.querySelector<HTMLElement>('h2[tabindex]');
      title?.focus({ preventScroll: true });
      this.dialogFocusTimer = null;
    });
  }

  private restoreDialogFocus() {
    const returnFocus = this.dialogReturnFocus;
    this.dialogReturnFocus = null;
    if (this.dialogFocusTimer) {
      clearTimeout(this.dialogFocusTimer);
      this.dialogFocusTimer = null;
    }
    this.dialogFocusTimer = setTimeout(() => {
      returnFocus?.focus();
      this.dialogFocusTimer = null;
    });
  }

  startCountdown(resetCountdown = true) {
    this.progressionPaused = false;
    this.pausedFlow = null;
    this.gameFlowState.set('countdown');
    if (resetCountdown) this.countdownValue.set(3);
    // Audible tick per second so the start moment registers even with eyes
    // on the chin movement; a higher tone marks the actual start
    this.biofeedback.playTone(659.25, 'sine', 150, 0.1);

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    this.countdownTimer = setInterval(() => {
      this.ngZone.run(() => {
        const currentVal = this.countdownValue();
        if (currentVal <= 1) {
          clearInterval(this.countdownTimer);
          this.biofeedback.playTone(880, 'sine', 300, 0.12);
          this.startGame();
        } else {
          this.countdownValue.set(currentVal - 1);
          this.biofeedback.playTone(659.25, 'sine', 150, 0.1);
        }
      });
    }, 1000);
  }

  startGame() {
    this.practiceRound.set(false);
    this.hasStarted = true;
    this.startRound();
  }

  private startRound() {
    this.progressionPaused = false;
    this.pausedFlow = null;
    this.gameFlowState.set('playing');
    this.isReleasing = false;
    this.holdProgress = 0;
    this.currentHoldMs = 0;
    this.currentRestMs = 0;
    this.feedbackState = null;
    this.sensorDataStale.set(!this.bleService.isSampleFresh());
    this.voice.beginRep(this.currentRepVal === 0);
    this.updateFeedback();
    
    this.startGameLoop();
  }

  ngOnDestroy() {
    this.destroyed = true;
    clearTimeout(this.praiseTimer);
    this.unregisterNavbar?.();
    this.stopGameLoop();
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    if (this.voiceTimeout) clearTimeout(this.voiceTimeout);
    if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
    if (this.dialogFocusTimer) {
      clearTimeout(this.dialogFocusTimer);
    }
    this.biofeedback.stopVibrationLoop();
    this.stopActiveFeedback();
  }
}
