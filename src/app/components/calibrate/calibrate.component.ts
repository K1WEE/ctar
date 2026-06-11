import { Component, OnInit, OnDestroy, inject, effect, NgZone, signal, isDevMode as ngIsDevMode } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { I18nService } from '../../services/i18n.service';
import { ChinTuckDemoComponent } from '../chin-tuck-demo/chin-tuck-demo.component';
import { BleService } from '../../services/ble.service';
import { SupabaseService } from '../../services/supabase.service';
import { BiofeedbackService } from '../../services/biofeedback.service';

@Component({
  selector: 'app-calibrate',
  standalone: true,
  imports: [CommonModule, ChinTuckDemoComponent],
  animations: [
    // Gentle morph between state panels: the leaving block collapses while the
    // entering one expands, so the card height glides instead of snapping.
    trigger('panelSwap', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden', transform: 'translateY(6px)' }),
        animate('240ms 60ms ease-out', style({ opacity: 1, height: '*', transform: 'none' })),
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('200ms ease-in', style({ opacity: 0, height: '0px' })),
      ]),
    ]),
  ],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <!-- max-w-md on mobile expands the card's readability. min-h-[82vh] reduces vertical negative space on phone viewports -->
      <div [@.disabled]="prefersReducedMotion" class="calibrate-card w-full max-w-md min-h-[82vh] sm:min-h-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-center relative overflow-hidden transition-colors duration-300 flex flex-col justify-between scrollbar-thin">
        
        <!-- Header Actions -->
        <div class="flex items-center justify-between mb-4 shrink-0 relative z-10">
          <button (click)="goBack()"
            [attr.aria-label]="backButtonLabel()"
            [title]="backButtonLabel()"
            class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0 cursor-pointer border-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
            <i class="fa-solid text-base" [ngClass]="state() === 'intro' ? 'fa-arrow-left' : 'fa-rotate-left'" aria-hidden="true"></i>
          </button>
          
          <!-- Connection Icon status tracker -->
          <div class="w-12 h-12 rounded-full flex items-center justify-center shadow-inner border absolute left-1/2 -translate-x-1/2 transition-colors duration-300"
               [ngClass]="bleService.connectionState() === 'Connected' 
                 ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                 : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'">
            <i class="text-xl" 
               [ngClass]="bleService.connectionState() === 'Connected' 
                 ? 'fa-solid fa-check text-emerald-600 dark:text-emerald-400' 
                 : 'fa-brands fa-bluetooth-b animate-pulse text-blue-600 dark:text-blue-400'"></i>
          </div>
          <div class="w-10 h-10"></div>
        </div>
        
        <!-- Main content area that expands vertically to push footer to the bottom -->
        <div class="flex-1 flex flex-col justify-center py-2">
          <h2 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white mb-2 leading-tight" role="status" aria-live="polite">{{ getPageStateTitle() }}</h2>
          
          <!-- Subtitle help text in active testing to remove bottom help cards -->
          <p *ngIf="state() === 'pulling'" @panelSwap class="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 mb-3 animate-pulse">
            {{ i18n.currentLang() === 'th' ? 'ก้มคางกดลงค้างไว้ให้แรงที่สุด!' : 'Press and hold your chin down as hard as you can!' }}
          </p>

          <!-- Persistent demo anchor: stays in place across intro/waiting/pulling so the
               panel swap below it doesn't yank the user's main visual reference.
               Grows to lg once the device is connected to emphasize "press as hard as you can" -->
          <div *ngIf="state() !== 'finished'" class="flex justify-center mb-3">
            <app-chin-tuck-demo [size]="state() === 'waiting' ? 'lg' : 'md'" [showLabel]="false" class="demo-animation"></app-chin-tuck-demo>
          </div>

          <!-- UNIFIED DISPLAY: Steps during both Intro (Connecting) and Waiting (Ready) states -->
          <div *ngIf="state() === 'intro' || state() === 'waiting'" @panelSwap class="flex flex-col items-center w-full mb-3">
            <!-- Steps block for seniors (larger text and badges) -->
            <div class="steps-block space-y-2.5 text-left w-full bg-slate-100/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <div class="flex items-center gap-3 text-base sm:text-lg text-slate-700 dark:text-slate-300 font-bold">
                <span class="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-sm">1</span>
                <span>{{ i18n.t('onboarding.step1') }}</span>
              </div>
              <div class="flex items-center gap-3 text-base sm:text-lg text-slate-700 dark:text-slate-300 font-bold">
                <span class="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-sm">2</span>
                <span>{{ i18n.t('onboarding.step2') }}</span>
              </div>
              <div class="flex items-center gap-3 text-base sm:text-lg text-slate-700 dark:text-slate-300 font-bold">
                <span class="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-sm">3</span>
                <span>{{ i18n.t('onboarding.step3') }}</span>
              </div>
            </div>
          </div>

          <!-- WAITING PANEL: Pulsing waiting prompt -->
          <div *ngIf="state() === 'waiting'" @panelSwap class="flex flex-col items-center w-full mb-2">
            <div class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl w-full shadow-sm">
              <div class="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-300 font-extrabold text-sm mb-1">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <span>{{ i18n.currentLang() === 'th' ? 'เชื่อมต่อเครื่องมือแล้ว' : 'Device Connected' }}</span>
              </div>
              <p class="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 leading-relaxed">
                {{ i18n.currentLang() === 'th' ? 'ก้มคางกดลงให้แรงที่สุด เพื่อเริ่มต้นจับเวลา...' : 'Press chin down firmly to start the timer...' }}
              </p>

              <!-- Live force feedback so the user knows their press is being detected before the 5N threshold -->
              <div class="mt-3 text-left">
                <div class="flex justify-between items-baseline text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                  <span>{{ i18n.currentLang() === 'th' ? 'แรงกดขณะนี้' : 'Current force' }}</span>
                  <span class="tabular-nums">{{ ctar.currentForce() | number:'1.0-1' }} / 5.0 N</span>
                </div>
                <div class="w-full h-2.5 rounded-full bg-amber-200/60 dark:bg-amber-900/40 overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-150"
                       [style.width.%]="waitingProgress()"></div>
                </div>
              </div>
            </div>

            <!-- Shown when the device is connected but no force has arrived for a while -->
            <div *ngIf="showWaitingHint()" @panelSwap role="alert"
                 class="mt-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 p-3 rounded-xl text-left text-sm font-bold w-full flex items-start gap-2">
              <i class="fa-solid fa-circle-info text-base mt-0.5 shrink-0" aria-hidden="true"></i>
              <span>{{ i18n.currentLang() === 'th' ? 'ยังไม่พบแรงกดจากอุปกรณ์ ลองตรวจสอบว่าสวมอุปกรณ์ถูกต้อง หรือกดคางลงอีกครั้ง' : 'No force detected yet. Check the device is positioned correctly, then press your chin down again.' }}</span>
            </div>
          </div>

          <!-- PULLING PANEL: Active Strength Test (demo SVG lives in the persistent anchor above) -->
          <div *ngIf="state() === 'pulling'" @panelSwap class="flex flex-col items-center w-full">

            <!-- Highly Compact Inner Card (Without pink background color) -->
            <div class="w-full rounded-2xl p-5 mb-3 border-2 transition-all duration-300 shadow-sm flex flex-col items-center border-rose-200 dark:border-rose-900/30">

              <p class="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                {{ i18n.currentLang() === 'th' ? 'แรงกดขณะนี้' : 'Current Force' }}
              </p>
              
              <!-- Massive live force value for elderly -->
              <div class="text-7xl sm:text-8xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight mb-3">
                {{ ctar.currentForce() | number:'1.0-1' }}<span class="text-2xl sm:text-3xl font-bold ml-1">N</span>
              </div>
              
              <!-- Timer Badge -->
              <div class="px-4 py-1.5 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-full font-black text-sm flex items-center gap-1.5 shadow-sm">
                <i class="fa-regular fa-clock animate-pulse"></i>
                <span>{{ i18n.currentLang() === 'th' ? 'เวลาบันทึกแรง:' : 'Testing time:' }} {{ timeLeft() }}s</span>
              </div>
            </div>
          </div>
          
          <!-- FINISHED PANEL: Result + Auto Navigate (Highly Compact) -->
          <div *ngIf="state() === 'finished'" @panelSwap class="space-y-4 w-full pt-2 flex flex-col items-center justify-center">
            
            <div class="text-slate-500 dark:text-slate-400 font-extrabold text-sm uppercase tracking-wider">
              {{ i18n.currentLang() === 'th' ? 'แรงกดสูงสุดที่ทดสอบได้' : 'Peak Force Measured' }}
            </div>
            
            <!-- BIG Result value -->
            <div class="text-7xl sm:text-8xl font-black text-emerald-500 dark:text-emerald-400 tabular-nums tracking-tight mb-2">
              {{ averagePeak | number:'1.0-1' }}<span class="text-2xl sm:text-3xl font-bold ml-1">N</span>
            </div>

            <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 max-w-sm mx-auto text-emerald-700 dark:text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
              <i class="fa-solid fa-circle-check text-base animate-pulse text-emerald-500"></i>
              <span>{{ i18n.currentLang() === 'th' ? 'บันทึกแรงกดสำเร็จ พร้อมเริ่มเล่นเกม' : 'Force calibrated successfully' }}</span>
            </div>
          </div>
        </div>

        <!-- Footer Actions area -->
        <div class="mt-3 w-full shrink-0">
          <!-- INTRO PANEL: Connect Buttons -->
          <div *ngIf="state() === 'intro'" @panelSwap class="space-y-2.5 w-full">
            <button 
              (click)="connect()"
              class="px-6 min-h-[52px] w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-xl transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] text-lg flex items-center justify-center cursor-pointer border-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
              <i class="fa-solid fa-link mr-2.5 text-base"></i> {{ i18n.t('connect.btnConnect') }}
            </button>
            
            <button *ngIf="supabase.userRole() === 'admin' || isDevMode()"
              (click)="simulate()"
              class="px-6 min-h-[44px] w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all duration-300 flex items-center justify-center text-sm border border-slate-200 dark:border-slate-700 mt-2 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
              <i class="fa-solid fa-flask mr-1.5"></i> {{ i18n.t('connect.btnSimulate') }}
            </button>
            
            <!-- Disconnection warning -->
            <div *ngIf="disconnectWarning" role="alert" class="mt-2.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-left text-sm font-bold w-full flex items-start gap-2">
              <i class="fa-solid fa-circle-exclamation text-base mt-0.5 shrink-0 text-red-500 animate-pulse"></i>
              <span>{{ i18n.currentLang() === 'th' ? 'การเชื่อมต่ออุปกรณ์ขาดหาย! กรุณาเชื่อมต่อใหม่อีกครั้ง' : 'Device disconnected! Please connect again.' }}</span>
            </div>
            
            <div *ngIf="bleService.error()" role="alert" class="mt-2.5 bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-left text-sm">
              <p class="font-bold flex items-center"><i class="fa-solid fa-circle-exclamation mr-1.5"></i> {{ i18n.t('error.title') }}</p>
              <p class="mt-0.5 text-xs">{{ friendlyError(bleService.error()) }}</p>
            </div>
          </div>

          <!-- Mock Squeeze Button (waiting + pulling): a single persistent element so the
               waiting->pulling swap never removes the button mid-press; only color/text shift -->
          <div *ngIf="(state() === 'waiting' || state() === 'pulling') && bleService.deviceName() === 'Mock CTAR Device'" @panelSwap class="w-full">
            <button
              (mousedown)="setMockSqueezing(true)"
              (mouseup)="setMockSqueezing(false)"
              (touchstart)="setMockSqueezing(true)"
              (touchend)="setMockSqueezing(false)"
              class="px-6 min-h-[52px] w-full bg-gradient-to-r text-white font-extrabold rounded-2xl shadow-md transition-all duration-300 select-none cursor-pointer flex items-center justify-center text-base border-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              [ngClass]="state() === 'pulling'
                ? 'from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 focus-visible:ring-rose-300'
                : 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus-visible:ring-amber-300'">
              <i class="fa-solid fa-circle-chevron-down mr-2 text-base" [ngClass]="state() === 'pulling' ? 'animate-pulse' : 'animate-bounce'"></i>
              {{ state() === 'pulling'
                ? (i18n.currentLang() === 'th' ? 'กดค้างไว้ต่อเนื่อง...' : 'Keep holding...')
                : (i18n.currentLang() === 'th' ? 'กดค้างตรงนี้เพื่อกดจำลองแรง' : 'Hold here to simulate force') }}
            </button>
          </div>

          <!-- FINISHED PANEL: Result + Auto Navigate -->
          <div *ngIf="state() === 'finished'" @panelSwap class="w-full pt-1.5 flex flex-col gap-2.5">
            <button
              (click)="goToGame()"
              class="px-6 min-h-[52px] w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold rounded-2xl shadow-md transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] text-lg border-0 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
              {{ i18n.currentLang() === 'th' ? 'เริ่มเล่นเกม →' : 'Start Game →' }}
            </button>
            <div *ngIf="autoNavCountdown() !== null" class="flex items-center justify-center gap-3" role="status" aria-live="polite">
              <span class="text-sm text-slate-600 dark:text-slate-300 font-bold tabular-nums">
                {{ i18n.currentLang() === 'th' ? 'เริ่มเกมอัตโนมัติใน' : 'Starting automatically in' }} {{ autoNavCountdown() }} {{ i18n.currentLang() === 'th' ? 'วินาที' : 's' }}
              </span>
              <button (click)="cancelAutoNav()"
                class="min-h-[44px] px-4 text-sm font-bold text-slate-600 dark:text-slate-300 underline underline-offset-4 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 rounded-xl">
                {{ i18n.currentLang() === 'th' ? 'ยกเลิก' : 'Cancel' }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* Desktop layout optimization for short height screens to prevent vertical overflow */
    @media (min-width: 640px) and (max-height: 850px) {
      .min-h-screen {
        padding-top: 1rem !important;
        padding-bottom: 1rem !important;
      }
      .calibrate-card {
        padding: 1.5rem !important;
        max-width: 384px !important;
      }
      .calibrate-card h2 {
        font-size: 1.5rem !important;
        margin-bottom: 0.25rem !important;
        margin-top: 0.25rem !important;
      }
      ::ng-deep .chin-tuck-svg {
        max-width: 125px !important;
      }
      .steps-block {
        padding: 0.75rem !important;
        gap: 0.25rem !important;
      }
      .steps-block > div {
        font-size: 0.95rem !important;
      }
      .steps-block span.rounded-full {
        width: 1.5rem !important;
        height: 1.5rem !important;
        font-size: 0.8rem !important;
      }
      .text-7xl {
        font-size: 4rem !important;
      }
    }
    
    @media (max-height: 720px) {
      .calibrate-card {
        padding: 1.25rem !important;
      }
      .calibrate-card h2 {
        font-size: 1.25rem !important;
      }
      ::ng-deep .chin-tuck-svg {
        max-width: 110px !important;
      }
      .steps-block {
        padding: 0.5rem 0.75rem !important;
      }
      .steps-block > div {
        font-size: 0.9rem !important;
      }
      .text-7xl {
        font-size: 3.5rem !important;
      }
    }

    @media (max-height: 640px) {
      .steps-block {
        display: none !important;
      }
      ::ng-deep .chin-tuck-svg {
        max-width: 90px !important;
      }
    }
  `]
})
export class CalibrateComponent implements OnInit, OnDestroy {
  // Use Signals to guarantee UI reactivity and change detection triggers
  public state = signal<'intro' | 'waiting' | 'pulling' | 'finished'>('intro');
  public timeLeft = signal<number>(3); // Changed from 5s to 3s based on user request
  // null = auto-navigation cancelled or not running
  public autoNavCountdown = signal<number | null>(null);
  public showWaitingHint = signal<boolean>(false);
  public peaks: number[] = [];
  public averagePeak = 0;
  public disconnectWarning = false;

  private timer: any;
  private autoNavTimer: any;
  private waitingHintTimer: any;
  private introTimer: any;
  // Timestamp when force first crossed the 5N threshold; the test only starts
  // after the press is sustained, so a brief accidental spike can't trigger it
  private thresholdHoldStart: number | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  // Angular animations run via WAAPI, so the global CSS reduced-motion rule
  // can't stop them — they must be disabled explicitly via [@.disabled]
  public prefersReducedMotion = typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  public i18n = inject(I18nService);
  public bleService = inject(BleService);
  public supabase = inject(SupabaseService);
  private biofeedback = inject(BiofeedbackService);
  private ngZone = inject(NgZone);

  constructor(public ctar: CtarLogicService, private router: Router) {
    // Monitor connection states
    effect(() => {
      const connState = this.bleService.connectionState();
      if (connState === 'Connected') {
        this.disconnectWarning = false;
        if (this.state() === 'intro') {
          this.state.set('waiting');
          // Eyes are on the device now — announce success + next step by voice
          this.playVoice('cue_calibrate_ready.mp3');
        }
      } else {
        if (this.state() === 'waiting' || this.state() === 'pulling') {
          this.disconnectWarning = true;
          this.playVoice('cue_disconnected.mp3');
        }
        if (this.state() !== 'finished') {
          this.state.set('intro');
        }
      }
    }, { allowSignalWrites: true });

    // Monitor force to trigger calibration. The 20Hz stream re-runs this
    // effect on every sample, so requiring the press to be sustained for
    // 500ms filters out accidental spikes and gives the user a moment to
    // register that the test is about to begin.
    effect(() => {
      const force = this.ctar.currentForce();
      if (this.state() !== 'waiting') {
        this.thresholdHoldStart = null;
        return;
      }
      if (force >= 5.0) {
        if (this.thresholdHoldStart === null) {
          this.thresholdHoldStart = Date.now();
        } else if (Date.now() - this.thresholdHoldStart >= 500) {
          this.thresholdHoldStart = null;
          this.ngZone.run(() => {
            this.beginCalibration();
          });
        }
      } else {
        this.thresholdHoldStart = null;
      }
    }, { allowSignalWrites: true });

    // Surface a help hint if the device is connected but no press arrives,
    // so the user is not left waiting on a silent sensor forever
    effect(() => {
      const currentState = this.state();
      if (this.waitingHintTimer) {
        clearTimeout(this.waitingHintTimer);
        this.waitingHintTimer = null;
      }
      this.showWaitingHint.set(false);
      if (currentState === 'waiting') {
        this.waitingHintTimer = setTimeout(() => {
          this.ngZone.run(() => {
            this.showWaitingHint.set(true);
            // Spoken so the user pressing with eyes down also hears it
            this.playVoice('cue_no_force.mp3');
          });
        }, 30000);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    // Welcome / orientation cue while the user is still looking at the screen.
    // Skipped if a device connects first (cue_calibrate_ready takes over).
    this.introTimer = setTimeout(() => {
      if (this.state() === 'intro') {
        this.playVoice('calibrate_intro.mp3');
      }
    }, 600);
  }

  /** Progress (0-100) toward the 5N threshold that starts the test */
  waitingProgress(): number {
    return Math.min(100, (this.ctar.currentForce() / 5.0) * 100);
  }

  backButtonLabel(): string {
    const lang = this.i18n.currentLang();
    if (this.state() === 'intro') {
      return lang === 'th' ? 'กลับไปหน้าหลัก' : 'Back to dashboard';
    }
    return lang === 'th' ? 'เริ่มการทดสอบใหม่' : 'Restart the test';
  }

  getPageStateTitle(): string {
    const lang = this.i18n.currentLang();
    const currentState = this.state();
    if (currentState === 'intro') {
      return lang === 'th' ? 'เชื่อมต่ออุปกรณ์' : 'Connect Device';
    } else if (currentState === 'waiting') {
      return lang === 'th' ? 'ทดสอบอุปกรณ์' : 'Test Device';
    } else if (currentState === 'pulling') {
      return lang === 'th' ? 'กำลังทดสอบแรงกด' : 'Testing Press Force';
    } else {
      return lang === 'th' ? 'ทดสอบสำเร็จ!' : 'Test Complete!';
    }
  }

  isDevMode(): boolean {
    // Production builds must hide the Simulate button from patients —
    // calibrating against simulated force corrupts real clinical data.
    return ngIsDevMode();
  }

  connect() {
    this.bleService.connect();
  }

  simulate() {
    this.bleService.simulateDevice();
  }

  setMockSqueezing(squeezing: boolean) {
    this.bleService.setMockSqueezing(squeezing);
  }

  friendlyError(error: string | null): string {
    if (!error) return '';
    const lower = error.toLowerCase();
    if (lower.includes('not supported') || lower.includes('bluetooth')) {
      return this.i18n.t('error.bleNotSupported');
    }
    if (lower.includes('cancel')) {
      return this.i18n.t('error.userCancelled');
    }
    return this.i18n.t('error.connectionFailed');
  }

  /**
   * Plays a localized voice cue (same asset convention as ZenBalloon).
   * Audio is the primary "test started/finished" signal here because the
   * user's eyes are on their chin movement, not the screen.
   */
  private playVoice(filename: string) {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }

    const lang = this.i18n.currentLang();
    const audio = new Audio(`/assets/audio/${lang}/${filename}`);
    this.activeAudio = audio;

    const cleanup = () => {
      if (this.activeAudio === audio) {
        this.activeAudio = null;
      }
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;

    audio.play().catch(err => {
      console.warn(`Voice playback failed for ${filename}:`, err);
      cleanup();
    });
  }

  beginCalibration() {
    console.log('CTAR: Calibration threshold met. Starting...');
    // Voice + haptics announce the start so it registers even with eyes off-screen
    this.playVoice('cue_hold.mp3');
    this.biofeedback.vibrate([80, 50, 80]);
    this.state.set('pulling');
    this.timeLeft.set(3); // Timer resets to 3s instead of 5s
    this.ctar.peakForce.set(0); 
    this.peaks = [];

    // Clear existing timer if any
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Wrap in ngZone.run() to ensure async setInterval triggers change detection
    this.timer = setInterval(() => {
      this.ngZone.run(() => {
        const time = this.timeLeft();
        console.log('CTAR: Timer tick. Remaining:', time - 1);
        if (time <= 1) {
          clearInterval(this.timer);
          this.peaks.push(this.ctar.peakForce());
          this.finishCalibration();
        } else {
          this.timeLeft.set(time - 1);
        }
      });
    }, 1000);
  }

  finishCalibration() {
    console.log('CTAR: Completing calibration...');
    // "Release, done, heading to the game" — covers stop-pressing + result +
    // what happens next, since the screen auto-advances on its own
    this.playVoice('cue_calibrate_done.mp3');
    this.biofeedback.playHoldComplete();
    this.state.set('finished');
    this.averagePeak = this.peaks.length > 0 ? this.peaks[0] : this.ctar.peakForce();
    const safeMax = Math.max(10, this.averagePeak); 
    this.ctar.setCalibration(safeMax);

    // Clear existing timer if any
    if (this.autoNavTimer) {
      clearInterval(this.autoNavTimer);
    }

    // Auto-navigate with a visible, cancellable countdown. 8 seconds gives
    // elderly users time to read their result (3s was too fast to react to).
    this.autoNavCountdown.set(8);
    this.autoNavTimer = setInterval(() => {
      this.ngZone.run(() => {
        const left = (this.autoNavCountdown() ?? 1) - 1;
        if (left <= 0) {
          clearInterval(this.autoNavTimer);
          this.autoNavTimer = null;
          this.router.navigate(['/game']);
        } else {
          this.autoNavCountdown.set(left);
        }
      });
    }, 1000);
  }

  cancelAutoNav() {
    if (this.autoNavTimer) {
      clearInterval(this.autoNavTimer);
      this.autoNavTimer = null;
    }
    this.autoNavCountdown.set(null);
  }

  goToGame() {
    this.cancelAutoNav();
    this.router.navigate(['/game']);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.autoNavTimer) {
      clearInterval(this.autoNavTimer);
    }
    if (this.waitingHintTimer) {
      clearTimeout(this.waitingHintTimer);
    }
    if (this.introTimer) {
      clearTimeout(this.introTimer);
    }
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }
  }

  goBack() {
    const currentState = this.state();
    if (currentState === 'waiting' || currentState === 'pulling' || currentState === 'finished') {
      if (this.timer) clearInterval(this.timer);
      this.cancelAutoNav();
      this.state.set(this.bleService.connectionState() === 'Connected' ? 'waiting' : 'intro');
      this.disconnectWarning = false;
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
