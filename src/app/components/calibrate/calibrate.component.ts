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
import { calibrationStepForState } from './calibrate-flow';

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
        </button>
      </header>

      <div class="workspace">
        <h1 id="calibration-title" role="status" aria-live="polite">{{ getPageStateTitle() }}</h1>
        <div *ngIf="state() !== 'finished'" class="device-guide" aria-hidden="true">
          <app-chin-tuck-demo size="lg" [showLabel]="false"></app-chin-tuck-demo>
        </div>
        <div class="guidance">
          <ol *ngIf="state() === 'intro' || state() === 'waiting'" class="instructions">
            <li><span>1</span><p>{{ i18n.t('onboarding.step1') }}</p></li>
            <li><span>2</span><p>{{ i18n.t('onboarding.step2') }}</p></li>
            <li><span>3</span><p>{{ i18n.t('onboarding.step3') }}</p></li>
          </ol>
          <div *ngIf="state() === 'pulling'" class="measurement">
            <p class="press-instruction">{{ i18n.currentLang() === 'th' ? 'ก้มคางกดลงค้างไว้ให้แรงที่สุด!' : 'Press and hold your chin down as hard as you can!' }}</p>
            <p>{{ i18n.currentLang() === 'th' ? 'แรงกดขณะนี้' : 'Current Force' }}</p>
            <p class="force">{{ ctar.currentForce() | number:'1.0-1' }}<span>N</span></p>
            <p class="timer"><i class="fa-regular fa-clock" aria-hidden="true"></i> {{ i18n.currentLang() === 'th' ? 'เวลาบันทึกแรง:' : 'Testing time:' }} {{ timeLeft() }}s</p>
          </div>
          <div *ngIf="state() === 'finished'" class="measurement result">
            <p>{{ i18n.currentLang() === 'th' ? 'แรงกดสูงสุดที่ทดสอบได้' : 'Peak Force Measured' }}</p>
            <p class="force">{{ averagePeak | number:'1.0-1' }}<span>N</span></p>
            <p class="success"><i class="fa-solid fa-check" aria-hidden="true"></i> {{ i18n.currentLang() === 'th' ? 'บันทึกแรงกดสำเร็จ พร้อมเริ่มเล่นเกม' : 'Force calibrated successfully' }}</p>
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
          <button type="button" class="primary" (click)="goToGame()">{{ i18n.currentLang() === 'th' ? 'เริ่มเล่นเกม →' : 'Start Game →' }}</button>
          <div *ngIf="autoNavCountdown() !== null" class="auto-start" role="status" aria-live="polite">
            <span>{{ i18n.currentLang() === 'th' ? 'เริ่มเกมอัตโนมัติใน' : 'Starting automatically in' }} {{ autoNavCountdown() }} {{ i18n.currentLang() === 'th' ? 'วินาที' : 's' }}</span>
            <button type="button" class="secondary" (click)="cancelAutoNav()">{{ i18n.currentLang() === 'th' ? 'ยกเลิก' : 'Cancel' }}</button>
          </div>
        </ng-container>
      </footer>
    </section>
  `,
  styles: [`
    :host { display:block; background:#fff; color:#1e293b; }
    .calibration { min-height:calc(100dvh - var(--app-navbar-height, 0px)); max-width:1200px; margin:auto; padding:20px 32px max(16px, env(safe-area-inset-bottom)); display:grid; grid-template-rows:auto 1fr auto; gap:16px; }
    .flow-header { display:flex; align-items:center; gap:16px; border-bottom:1px solid #e2e8f0; padding-bottom:12px; }
    nav { flex:1; }
    .progress-steps { display:flex; justify-content:space-between; gap:12px; max-width:560px; margin:auto; }
    .progress-steps li { display:flex; align-items:center; gap:8px; color:#64748b; font-size:.875rem; }
    .step-number { width:28px; height:28px; display:grid; place-items:center; border:1px solid #cbd5e1; border-radius:50%; flex-shrink:0; }
    .reached { color:#1d4ed8 !important; font-weight:700; }
    .reached .step-number { color:white; background:#1d4ed8; border-color:#1d4ed8; }
    .restart { width:44px; height:44px; flex-shrink:0; border-radius:8px; }
    .workspace { display:grid; grid-template-columns:1fr 1.2fr; grid-template-rows:auto 1fr; column-gap:48px; align-items:center; align-content:center; padding:16px 0; }
    h1 { grid-column:1 / -1; font-size:clamp(1.5rem, 3vw, 2.5rem); line-height:1.3; font-weight:700; margin-bottom:20px; }
    .device-guide { display:flex; align-items:center; justify-content:center; align-self:stretch; background:#f8fafc; border-radius:16px; }
    .instructions { display:grid; gap:24px; }
    .instructions li { display:flex; align-items:baseline; gap:16px; font-size:1.25rem; line-height:1.5; }
    .instructions li > span { color:#1d4ed8; font-weight:700; font-variant-numeric:tabular-nums; }
    .notice { margin-top:16px; padding:12px; background:#eff6ff; color:#1e40af; border-radius:8px; font-size:1rem; line-height:1.45; }
    .error { background:#fff7ed; color:#9a3412; }
    .measurement { text-align:center; }
    .press-instruction { margin-bottom:16px; font-size:1.25rem; font-weight:600; }
    .force { font-size:clamp(3rem, 8vw, 5rem); line-height:1.2; font-weight:700; font-variant-numeric:tabular-nums; color:#1d4ed8; margin:12px 0; }
    .force span { font-size:1.25rem; margin-left:8px; }
    .success { color:#047857; }
    [data-state="finished"] .guidance { grid-column:1 / -1; }
    .actions { display:flex; flex-direction:column; align-items:center; gap:4px; padding-top:16px; border-top:1px solid #e2e8f0; }
    .primary { width:100%; max-width:480px; min-height:52px; padding:12px 20px; border-radius:10px; background:#1d4ed8; color:white; font-size:1.125rem; font-weight:700; }
    .primary:hover { background:#1e40af; }
    .secondary { min-height:44px; padding:8px 12px; color:#475569; font-size:.875rem; text-decoration:underline; text-underline-offset:4px; }
    .secondary:hover, .restart:hover { background:#f1f5f9; }
    .simulate { touch-action:none; user-select:none; }
    .auto-start { display:flex; align-items:center; flex-wrap:wrap; justify-content:center; gap:8px; }
    :host-context(.dark) { background:#0f172a; color:#e2e8f0; }
    :host-context(.dark) .device-guide { background:#1e293b; }
    :host-context(.dark) .flow-header, :host-context(.dark) .actions { border-color:#334155; }
    :host-context(.dark) .secondary, :host-context(.dark) .progress-steps li { color:#cbd5e1; }
    :host-context(.dark) .reached, :host-context(.dark) .force, :host-context(.dark) .instructions li > span { color:#93c5fd !important; }
    :host-context(.dark) .success { color:#6ee7b7; }
    :host-context(.dark) .secondary:hover, :host-context(.dark) .restart:hover { background:#334155; }
    @media(max-width:639px) {
      .calibration { padding:12px 20px max(12px, env(safe-area-inset-bottom)); gap:12px; }
      .flow-header { gap:8px; padding-bottom:8px; }
      .progress-steps { gap:8px; }
      .progress-steps li { gap:4px; font-size:.8rem; }
      .step-number { width:24px; height:24px; }
      .workspace { grid-template-columns:1fr; grid-template-rows:auto minmax(80px, 1fr) auto; gap:12px; padding:0; }
      h1 { margin:0; }
      .device-guide { background:transparent; min-height:80px; }
      .device-guide ::ng-deep .chin-tuck-svg { width:auto; height:clamp(80px, 18dvh, 170px); }
      .instructions { gap:12px; }
      .instructions li { font-size:1rem; gap:12px; }
      .actions { padding-top:12px; }
      .notice { margin-top:12px; }
      [data-state="finished"] .workspace { grid-template-rows:auto 1fr; }
    }
    @media(max-height:700px) and (max-width:639px) {
      .calibration { gap:8px; padding-top:8px; }
      .workspace { grid-template-rows:auto auto; gap:8px; }
      .device-guide { display:none; }
      .instructions { gap:8px; }
      .notice { padding:8px; margin-top:4px; font-size:.875rem; }
    }
  `]
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
      if (this.state() !== 'waiting') {
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
      if (currentState === 'waiting') {
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

    // Auto-navigate with a visible, cancellable countdown (8 seconds)
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
    this.destroyed = true;
    this.invalidateCalibrationAttempt();
    this.cancelAutoNav();
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
