import { Component, OnInit, OnDestroy, inject, effect, NgZone, signal, untracked, isDevMode as ngIsDevMode } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { I18nService } from '../../services/i18n.service';
import { ChinTuckDemoComponent } from '../chin-tuck-demo/chin-tuck-demo.component';
import { BleService } from '../../services/ble.service';
import { SupabaseService } from '../../services/supabase.service';
import { BiofeedbackService } from '../../services/biofeedback.service';
import { calibrationStepForState } from './calibrate-flow';
import { ForceLevel, forceLevel, forceRingColor } from './force-guidance';

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
    <section class="calibration" [@.disabled]="prefersReducedMotion" [attr.data-state]="state()" aria-labelledby="calibration-title">
      <header class="flow-header">
        <nav [attr.aria-label]="i18n.currentLang() === 'th' ? 'ขั้นตอนการเตรียมฝึก' : 'Training preparation'">
          <ol class="progress-steps">
            <li *ngFor="let step of [1, 2, 3]" [class.reached]="step <= currentStep" [attr.aria-current]="step === currentStep ? 'step' : null">
              <span class="step-number">{{ step }}</span><span>{{ stepLabel(step) }}</span>
            </li>
          </ol>
        </nav>
        <button *ngIf="state() !== 'intro'" type="button" class="restart" (click)="goBack()" [attr.aria-label]="backButtonLabel()" [title]="backButtonLabel()">
          <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
          <span class="restart-label" aria-hidden="true">{{ i18n.currentLang() === 'th' ? 'เริ่มใหม่' : 'Restart' }}</span>
        </button>
      </header>

      <div class="workspace">
        <p class="eyebrow">{{ i18n.currentLang() === 'th' ? 'ขั้นตอนที่' : 'Step' }} {{ currentStep }}/3</p>
        <h1 id="calibration-title" role="status" aria-live="polite">{{ getPageStateTitle() }}</h1>
        <div *ngIf="state() === 'intro'" class="device-guide connect-guide">
          <!-- Short looping walkthrough clip; muted + playsinline so it autoplays like a GIF on mobile -->
          <video *ngIf="!connectVideoFailed()" [src]="connectVideoSrc" autoplay loop muted playsinline preload="auto"
            [attr.aria-label]="i18n.t('connect.videoAlt')" (error)="connectVideoFailed.set(true)"></video>
          <i *ngIf="connectVideoFailed()" class="fa-brands fa-bluetooth-b connect-guide-fallback" aria-hidden="true"></i>
        </div>
        <div *ngIf="state() === 'waiting' || state() === 'pulling'" class="device-guide force-guide">
          <div class="device-stage" [class.active]="showLiveForce()" [class.nudge]="showIdleNudge()" [class.max-level]="peakLevel() === 4" aria-hidden="true">
            <!-- Force ring: fills from 0 to 10 N, then its colour climbs with extra force -->
            <svg class="charge-ring" viewBox="0 0 120 120">
              <circle class="charge-track" cx="60" cy="60" r="54"></circle>
              <circle class="charge-fill" cx="60" cy="60" r="54" pathLength="100" [style.stroke-dashoffset]="100 - forceRingProgress() * 100" [style.stroke]="ringColor()" [style.opacity]="forceRingProgress() > 0.01 ? 1 : 0"></circle>
            </svg>
            <!-- Real press-and-release clip, cropped to sit inside the ring; cartoon is the fallback -->
            <video *ngIf="!pressVideoFailed()" class="press-video" [src]="pressVideoSrc" [poster]="pressVideoPoster"
              [autoplay]="!prefersReducedMotion" loop muted playsinline preload="auto" (error)="pressVideoFailed.set(true)"></video>
            <app-chin-tuck-demo *ngIf="pressVideoFailed()" size="lg" [showLabel]="false"></app-chin-tuck-demo>
          </div>
          <!-- Number + level share one row; the muted "0 N" keeps the slot from reading as blank space -->
          <div class="readout">
            <p class="live-force" [class.idle]="!showLiveForce()">
              <span class="sr-only">{{ i18n.currentLang() === 'th' ? 'แรงกดขณะนี้' : 'Current Force' }}</span>
              {{ showLiveForce() ? (ctar.currentForce() | number:'1.0-1') : 0 }}<span class="unit">N</span>
            </p>
            <p class="force-level" [class.visible]="showLiveForce()" [attr.data-level]="peakLevel()">{{ i18n.t('calibrate.level' + peakLevel()) }}</p>
          </div>
        </div>
        <div class="guidance">
          <ol *ngIf="state() === 'intro'" class="instructions">
            <li><span>1</span><p>{{ i18n.t('connect.step1') }}</p></li>
            <li><span>2</span><p>{{ i18n.t('connect.step2') }}</p></li>
            <li><span>3</span><p>{{ i18n.t('connect.step3') }}</p></li>
            <li><span>4</span><p>{{ i18n.t('connect.step4') }}</p></li>
          </ol>
          <!-- The bar drains over the 3 s test via a CSS animation started when this block mounts -->
          <div *ngIf="state() === 'pulling'" class="timer-row">
            <div class="timer-bar" aria-hidden="true"><span></span></div>
            <p class="timer">{{ i18n.currentLang() === 'th' ? 'เหลือ ' + timeLeft() + ' วินาที' : timeLeft() + 's left' }}</p>
          </div>
          <div *ngIf="state() === 'finished'" class="measurement result">
            <span class="result-icon" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
            <p>{{ i18n.currentLang() === 'th' ? 'แรงกดสูงสุดที่ทดสอบได้' : 'Peak Force Measured' }}</p>
            <p class="force">{{ averagePeak | number:'1.0-1' }}<span>N</span></p>
            <p class="success">{{ i18n.currentLang() === 'th' ? 'บันทึกแรงกดแล้ว พร้อมเริ่มเล่นเกม' : 'Saved — ready to play' }}</p>
          </div>
          <p *ngIf="state() === 'waiting' && showWaitingHint()" role="alert" class="notice">
            {{ i18n.currentLang() === 'th' ? 'ยังไม่พบแรงกดจากอุปกรณ์ ลองตรวจสอบว่าสวมอุปกรณ์ถูกต้อง หรือกดคางลงอีกครั้ง' : 'No force detected yet. Check the device is positioned correctly, then press your chin down again.' }}
          </p>
          <p *ngIf="calibrationError()" role="alert" class="notice error">
            {{ i18n.currentLang() === 'th' ? 'ยังวัดแรงกดไม่ได้ กรุณากดค้างให้แรงขึ้น แล้วลองปรับตั้งค่าใหม่' : 'No usable press was measured. Press and hold harder, then try calibration again.' }}
          </p>
          <p *ngIf="state() === 'intro' && disconnectWarning" role="alert" class="notice error">
            {{ i18n.currentLang() === 'th' ? 'การเชื่อมต่ออุปกรณ์ขาดหาย! กรุณาเชื่อมต่อใหม่อีกครั้ง' : 'Device disconnected! Please connect again.' }}
          </p>
          <div *ngIf="state() === 'intro' && bleService.error()" role="alert" class="notice error">
            <p class="font-bold">{{ i18n.t('error.title') }}</p><p>{{ friendlyError(bleService.error()) }}</p>
            <button *ngIf="isUnsupportedBrowserError(bleService.error())" type="button" class="copy-link" (click)="copyPageLink()">
              <i class="fa-brands fa-chrome" aria-hidden="true"></i>
              {{ linkCopied() ? i18n.t('connect.linkCopied') : i18n.t('connect.copyLink') }}
            </button>
          </div>
        </div>
      </div>

      <footer class="actions">
        <ng-container *ngIf="state() === 'intro'">
          <button type="button" class="primary" (click)="connect()"><i class="fa-solid fa-link" aria-hidden="true"></i> {{ i18n.t('connect.btnConnect') }}</button>
          <button *ngIf="supabase.userRole() === 'admin' || isDevMode()" type="button" class="secondary" (click)="simulate()"><i class="fa-solid fa-flask" aria-hidden="true"></i> {{ i18n.t('connect.btnSimulate') }}</button>
        </ng-container>
        <button *ngIf="(state() === 'waiting' || state() === 'pulling') && bleService.deviceName() === 'Mock CTAR Device'" type="button" class="primary simulate"
          (mousedown)="setMockSqueezing(true)" (mouseup)="setMockSqueezing(false)" (mouseleave)="setMockSqueezing(false)"
          (touchstart)="setMockSqueezing(true)" (touchend)="setMockSqueezing(false)" (touchcancel)="setMockSqueezing(false)"
          (keydown.space)="$event.preventDefault(); setMockSqueezing(true)" (keyup.space)="setMockSqueezing(false)"
          (keydown.enter)="setMockSqueezing(true)" (keyup.enter)="setMockSqueezing(false)" (blur)="setMockSqueezing(false)">
          {{ state() === 'pulling' ? (i18n.currentLang() === 'th' ? 'กดค้างไว้ต่อเนื่อง...' : 'Keep holding...') : (i18n.currentLang() === 'th' ? 'กดค้างตรงนี้เพื่อกดจำลองแรง' : 'Hold here to simulate force') }}
        </button>
        <ng-container *ngIf="state() === 'finished'">
          <div *ngIf="autoNavCountdown() !== null" class="auto-start" role="status" aria-live="polite">
            <span>{{ i18n.currentLang() === 'th' ? 'กำลังไปหน้าเล่นเกมใน' : 'Starting the game in' }} {{ autoNavCountdown() }} {{ i18n.currentLang() === 'th' ? 'วินาที' : 's' }}</span>
            <div class="countdown-bar" aria-hidden="true"><span></span></div>
          </div>
          <button type="button" class="outline" (click)="remeasure()"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> {{ i18n.currentLang() === 'th' ? 'วัดแรงใหม่' : 'Measure Again' }}</button>
        </ng-container>
      </footer>
    </section>
  `,
})
export class CalibrateComponent implements OnInit, OnDestroy {
  // Use Signals to guarantee UI reactivity and change detection triggers
  public state = signal<'intro' | 'waiting' | 'pulling' | 'finished'>('intro');
  public timeLeft = signal<number>(3); // Changed from 5s to 3s based on user request
  public autoNavCountdown = signal<number | null>(null);
  public showWaitingHint = signal<boolean>(false);
  public peaks: number[] = [];
  public averagePeak = 0;
  public calibrationError = signal(false);
  public disconnectWarning = false;
  // Drop the walkthrough clip here (MP4/H.264 loops like a GIF at a fraction of the size)
  public readonly connectVideoSrc = '/assets/videos/connect-guide.mp4';
  public connectVideoFailed = signal(false);
  // Square, audio-less loop of a chin pressing the device, shown inside the force ring
  public readonly pressVideoSrc = '/assets/videos/press-guide.mp4';
  public readonly pressVideoPoster = '/assets/videos/press-guide.jpg';
  public pressVideoFailed = signal(false);
  public linkCopied = signal(false);
  // Force at which the guide ring is full
  private readonly forceRingMax = 10;
  // Highest guidance level reached in the current attempt; only climbs so
  // jittery readings can't make the label flicker
  public peakLevel = signal<ForceLevel>(0);
  // No force arrived shortly after entering 'waiting' — pulse + vibrate
  public idleNudge = signal(false);
  private idleNudgeTimer: any;

  private timer: any;
  private autoNavTimer: any;
  private waitingHintTimer: any;
  private introTimer: any;
  // Every calibration run gets its own generation. A queued interval callback
  // from an invalidated run must never be allowed to finish a later run.
  private calibrationAttempt = 0;
  private destroyed = false;
  // Timestamp when force first crossed the 5N threshold; the test only starts
  // after the press is sustained, so a brief accidental spike can't trigger it
  private thresholdHoldStart: number | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  // Angular animations run via WAAPI, so the global CSS reduced-motion rule
  // can't stop them — they must be disabled explicitly via [@.disabled]
  public prefersReducedMotion = typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  get currentStep(): 1 | 2 | 3 {
    return calibrationStepForState(this.state());
  }

  stepLabel(step: number): string {
    const labels = this.i18n.currentLang() === 'th'
      ? ['เชื่อมต่อ', 'วัดแรง', 'พร้อมเล่น']
      : ['Connect', 'Measure', 'Ready'];
    return labels[step - 1] ?? labels[0];
  }

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
          this.invalidateCalibrationAttempt();
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
    // 200ms filters out accidental spikes and gives the user a moment to
    // register that the test is about to begin.
    effect(() => {
      const force = this.ctar.currentForce();
      const level = forceLevel(force);
      const state = this.state();
      if ((state === 'waiting' || state === 'pulling') && force >= 0.5 && level > untracked(this.peakLevel)) {
        this.peakLevel.set(level);
        this.biofeedback.vibrate(40);
      }
      if (state !== 'waiting') {
        this.thresholdHoldStart = null;
        return;
      }
      if (force >= 2.0) {
        if (this.thresholdHoldStart === null) {
          this.thresholdHoldStart = Date.now();
        } else if (Date.now() - this.thresholdHoldStart >= 200) {
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
      if (this.idleNudgeTimer) {
        clearTimeout(this.idleNudgeTimer);
        this.idleNudgeTimer = null;
      }
      this.idleNudge.set(false);
      if (currentState !== 'pulling') {
        this.peakLevel.set(0);
      }
      if (currentState === 'waiting') {
        // Silent-friendly nudge well before the 10s text/voice hint
        this.idleNudgeTimer = setTimeout(() => {
          this.ngZone.run(() => {
            if (this.state() === 'waiting' && !this.showLiveForce()) {
              this.idleNudge.set(true);
              this.biofeedback.vibrate(200);
            }
          });
        }, 4000);
        this.waitingHintTimer = setTimeout(() => {
          this.ngZone.run(() => {
            this.showWaitingHint.set(true);
            // Spoken so the user pressing with eyes down also hears it
            this.playVoice('cue_no_force.mp3');
          });
        }, 10000);
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
      // The heading is the instruction itself — users skip secondary text
      return this.i18n.t('calibrate.pressPrompt');
    } else if (currentState === 'pulling') {
      return lang === 'th' ? 'กดค้างไว้ สุดแรง!' : 'Hold it — as hard as you can!';
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

  async copyPageLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2500);
    } catch {
      // Clipboard can be blocked; the message above still tells the user what to do
    }
  }

  simulate() {
    this.bleService.simulateDevice();
  }

  setMockSqueezing(squeezing: boolean) {
    this.bleService.setMockSqueezing(squeezing);
  }

  showLiveForce(): boolean {
    return this.state() === 'pulling' || this.ctar.currentForce() >= 0.5;
  }

  showIdleNudge(): boolean {
    return this.idleNudge() && this.state() === 'waiting' && !this.showLiveForce();
  }

  ringColor(): string {
    return forceRingColor(this.ctar.currentForce());
  }

  forceRingProgress(): number {
    const force = this.ctar.currentForce();
    return Number.isFinite(force) ? Math.min(1, Math.max(0, force / this.forceRingMax)) : 0;
  }

  private invalidateCalibrationAttempt(): void {
    this.calibrationAttempt += 1;
    this.thresholdHoldStart = null;
    this.peaks = [];
    this.timeLeft.set(3);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private isCalibrationAttemptActive(attempt: number): boolean {
    return !this.destroyed
      && attempt === this.calibrationAttempt
      && this.state() === 'pulling'
      && this.bleService.connectionState() === 'Connected';
  }

  isUnsupportedBrowserError(error: string | null): boolean {
    return !!error && error.toLowerCase().includes('not supported');
  }

  friendlyError(error: string | null): string {
    if (!error) return '';
    const lower = error.toLowerCase();
    if (this.isUnsupportedBrowserError(error)) {
      return this.i18n.t('error.bleNotSupported');
    }
    // Chrome reports a powered-off radio as "Bluetooth adapter not available."
    if (lower.includes('adapter') || lower.includes('bluetooth')) {
      return this.i18n.t('error.bluetoothOff');
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

    const lang = this.i18n.voiceLanguage();
    if (!lang) return;
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
    if (this.destroyed
      || this.state() !== 'waiting'
      || this.bleService.connectionState() !== 'Connected') {
      return;
    }

    const attempt = ++this.calibrationAttempt;
    console.log('CTAR: Calibration threshold met. Starting...');
    // Voice + haptics announce the start so it registers even with eyes off-screen
    this.playVoice('cue_hold.mp3');
    this.biofeedback.vibrate([80, 50, 80]);
    this.state.set('pulling');
    this.calibrationError.set(false);
    this.timeLeft.set(3); // Timer resets to 3s instead of 5s
    this.ctar.peakForce.set(0); 
    this.peaks = [];

    // Clear existing timer if any
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Wrap in ngZone.run() to ensure async setInterval triggers change detection
    const timer = setInterval(() => {
      if (!this.isCalibrationAttemptActive(attempt)) {
        clearInterval(timer);
        if (this.timer === timer) this.timer = null;
        return;
      }
      this.ngZone.run(() => {
        if (!this.isCalibrationAttemptActive(attempt)) {
          clearInterval(timer);
          if (this.timer === timer) this.timer = null;
          return;
        }
        const time = this.timeLeft();
        console.log('CTAR: Timer tick. Remaining:', time - 1);
        if (time <= 1) {
          clearInterval(timer);
          if (this.timer === timer) this.timer = null;
          this.peaks.push(this.ctar.peakForce());
          this.finishCalibration(attempt);
        } else {
          this.timeLeft.set(time - 1);
        }
      });
    }, 1000);
    this.timer = timer;
  }

  finishCalibration(attempt = this.calibrationAttempt) {
    if (!this.isCalibrationAttemptActive(attempt)) {
      return;
    }
    console.log('CTAR: Completing calibration...');
    const measuredPeak = this.peaks.length > 0 ? this.peaks[0] : this.ctar.peakForce();

    // Keep the measured value intact. A zero/non-finite peak means the sensor
    // did not produce a usable calibration sample; inventing a 10N minimum
    // would make every later game target inaccurate for a low-force patient.
    if (!Number.isFinite(measuredPeak) || measuredPeak <= 0) {
      this.averagePeak = 0;
      this.calibrationError.set(true);
      this.state.set('waiting');
      return;
    }

    // "Release, done, ready to start" gives the user control over the next step.
    this.playVoice('cue_calibrate_done.mp3');
    this.biofeedback.playHoldComplete();
    this.state.set('finished');
    this.averagePeak = measuredPeak;
    this.ctar.setCalibration(measuredPeak);

    if (this.autoNavTimer) {
      clearInterval(this.autoNavTimer);
    }

    // Auto-navigate with a visible countdown; "Measure Again" cancels it
    this.autoNavCountdown.set(3);
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

  remeasure() {
    this.cancelAutoNav();
    this.invalidateCalibrationAttempt();
    this.state.set(this.bleService.connectionState() === 'Connected' ? 'waiting' : 'intro');
    this.disconnectWarning = false;
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.invalidateCalibrationAttempt();
    this.cancelAutoNav();
    if (this.waitingHintTimer) {
      clearTimeout(this.waitingHintTimer);
    }
    if (this.idleNudgeTimer) {
      clearTimeout(this.idleNudgeTimer);
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
    this.invalidateCalibrationAttempt();
    if (currentState === 'waiting' || currentState === 'pulling' || currentState === 'finished') {
      this.cancelAutoNav();
      this.state.set(this.bleService.connectionState() === 'Connected' ? 'waiting' : 'intro');
      this.disconnectWarning = false;
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
