import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ZenBalloonComponent } from './zen-balloon.component';
import { BleService } from '../../services/ble.service';
import { BiofeedbackService } from '../../services/biofeedback.service';

describe('ZenBalloonComponent target contact', () => {
  let fixture: ComponentFixture<ZenBalloonComponent>;
  let component: ZenBalloonComponent;
  let force = signal(0);
  let balloonRect: DOMRect;
  let fresh = true;
  let feedback: jasmine.SpyObj<BiofeedbackService>;

  beforeEach(async () => {
    localStorage.setItem('zen_balloon_muted', 'true');
    force = signal(10);
    fresh = true;
    feedback = jasmine.createSpyObj('BiofeedbackService', [
      'playEnterZone', 'startVibrationLoop', 'stopVibrationLoop', 'playExitZone',
      'playHoldComplete', 'playSuccess', 'playTone',
    ]);
    await TestBed.configureTestingModule({
      imports: [ZenBalloonComponent, NoopAnimationsModule],
      providers: [provideRouter([]),
        { provide: BiofeedbackService, useValue: feedback },
        { provide: BleService, useValue: {
          connectionState: signal('Connected'), lastSampleAt: signal(1),
          batteryPercent: signal(89), batteryLevel: signal('normal'),
          batteryNotice: signal(null), isSimulated: signal(false),
          dismissBatteryNotice: jasmine.createSpy('dismissBatteryNotice'),
          isSampleFresh: () => fresh,
        } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ZenBalloonComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('currentForce', force);
    fixture.componentRef.setInput('peakForce', signal(20));
    fixture.componentRef.setInput('maxForceLimit', 20);
    fixture.componentRef.setInput('targetReps', 10);
    fixture.detectChanges();
    const body = fixture.nativeElement.querySelector('.game-track > div:last-child > div');
    const target = fixture.nativeElement.querySelector('.game-track > div:first-child');
    balloonRect = new DOMRect(20, 151, 60, 80);
    spyOn(body, 'getBoundingClientRect').and.callFake(() => balloonRect);
    spyOn(target, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 100, 100, 50));
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem('zen_balloon_muted');
  });

  it('keeps the scene and stats stationary through every translated command', () => {
    component.gameFlowState.set('playing');
    const root: HTMLElement = fixture.nativeElement;
    const language = component.i18n.currentLang();
    for (const lang of ['th', 'en'] as const) {
      component.i18n.setLang(lang);
      fixture.detectChanges();
      const scene = root.querySelector<HTMLElement>('.game-main-area')!;
      const stats = root.querySelector<HTMLElement>('.game-stats')!;
      const cue = root.querySelector<HTMLElement>('.feedback-container')!;
      const baseline = [scene.offsetTop, stats.offsetTop, scene.offsetHeight];
      const keys = Object.values((component as any).feedbackMessageKeys).flat() as string[];
      for (const key of [...keys, 'game.sessionComplete']) {
        component.feedbackMessage = component.i18n.t(key);
        fixture.detectChanges();
        expect([scene.offsetTop, stats.offsetTop, scene.offsetHeight]).withContext(`${lang}: ${key}`).toEqual(baseline);
        // The cue never overlaps the scene: below it on narrow screens, beside it on desktop.
        const belowScene = cue.offsetTop > scene.offsetTop + scene.offsetHeight;
        const besideScene = cue.offsetLeft >= scene.offsetLeft + scene.offsetWidth;
        expect(belowScene || besideScene).withContext(`${lang}: ${key} cue placement`).toBeTrue();
      }
      const style = getComputedStyle(cue);
      expect(parseFloat(style.minHeight)).toBeGreaterThanOrEqual(parseFloat(style.lineHeight) * 3 - 0.1);
    }
    component.i18n.setLang(language);
  });

  it('shows a decorative praise burst after a completed rep, then clears it', fakeAsync(() => {
    component.gameFlowState.set('playing');
    (component as any).triggerSuccessAnimation();
    fixture.detectChanges();
    const burst = fixture.nativeElement.querySelector('.praise-burst');
    expect(burst).not.toBeNull();
    expect(burst.getAttribute('aria-hidden')).toBe('true');
    expect(component.praise()?.text).toMatch(/!$/);
    tick(1800);
    fixture.detectChanges();
    expect(component.praise()).toBeNull();
    expect(fixture.nativeElement.querySelector('.praise-burst')).toBeNull();
  }));

  describe('voice selection', () => {
    let clips: Array<{ src: string; play: jasmine.Spy; pause: jasmine.Spy; onerror?: () => void; onended?: () => void; onpause?: () => void }>;
    let rejectNext: boolean;
    let nextPlay: Promise<void> | undefined;
    const announce = (state: string) => (component as any).applyFeedbackState(state, undefined, true);

    beforeEach(() => {
      clips = [];
      rejectNext = false;
      nextPlay = undefined;
      component.isMuted = false;
      spyOn(component.i18n, 'voiceLanguage').and.returnValue('th');
      spyOn(window, 'Audio').and.callFake((function(src: string) {
        const fail = rejectNext;
        const pending = nextPlay;
        nextPlay = undefined;
        rejectNext = false;
        const clip = {
          src,
          play: jasmine.createSpy('play').and.callFake(() => pending ?? (fail ? Promise.reject(new Error('missing')) : Promise.resolve())),
          pause: jasmine.createSpy('pause'),
        };
        clips.push(clip);
        return clip as unknown as HTMLAudioElement;
      }) as any);
    });

    it('plays all four real squeeze files before repeating, independently of rotating text', fakeAsync(() => {
      for (let n = 0; n < 5; n++) {
        announce('squeeze');
        tick(5000);
        announce('squeeze'); // Text changes, but no new voice within the same state.
        tick(5000);
        announce('release');
        tick(5000);
      }
      expect(clips.filter(clip => clip.src.includes('game_squeeze')).map(clip => clip.src)).toEqual(
        [1, 2, 3, 4, 1].map(n => `/assets/audio/th/game_squeeze_0${n}.mp3`));
      expect(clips.length).toBe(10);
    }));

    it('does not consume a squeeze variant when muted, paused or throttled', fakeAsync(() => {
      announce('squeeze'); tick(0);
      component.isMuted = true;
      announce('hold'); announce('squeeze');
      component.isMuted = false;
      (component as any).progressionPaused = true;
      announce('hold'); announce('squeeze');
      (component as any).progressionPaused = false;
      announce('hold'); announce('squeeze');
      expect(clips.length).toBe(1);
      tick(5000);
      announce('hold'); tick(5000);
      announce('squeeze'); tick(0);
      expect(clips.at(-1)!.src).toBe('/assets/audio/th/game_squeeze_02.mp3');
    }));

    it('uses existing single-file cues for every other training state', fakeAsync(() => {
      for (const state of ['hold', 'holdAlmost', 'tooHard', 'release', 'success']) {
        announce(state); tick(5000);
      }
      expect(clips.map(clip => clip.src)).toEqual([
        'cue_hold.mp3', 'cue_hold.mp3', 'cue_too_hard.mp3', 'cue_release.mp3', 'cue_rep_success.mp3',
      ].map(file => `/assets/audio/th/${file}`));
    }));

    it('falls back only once and retries the unplayed variant on the next opportunity', fakeAsync(() => {
      rejectNext = true;
      announce('squeeze');
      clips[0].onerror?.();
      tick(0); // Both the error event and play rejection may fire.
      expect(clips.map(clip => clip.src)).toEqual(['/assets/audio/th/game_squeeze_01.mp3', '/assets/audio/th/cue_squeeze.mp3']);
      tick(5000); announce('release'); tick(5000); announce('squeeze'); tick(0);
      expect(clips.at(-1)!.src).toBe('/assets/audio/th/game_squeeze_01.mp3');
    }));

    it('does not advance a variant when an old play promise resolves after replacement', fakeAsync(() => {
      let complete!: () => void;
      nextPlay = new Promise<void>(resolve => { complete = resolve; });
      announce('squeeze'); tick(5000);
      announce('hold'); tick(0);
      complete(); tick(5000);
      announce('squeeze'); tick(0);
      expect(clips.at(-1)!.src).toBe('/assets/audio/th/game_squeeze_01.mp3');
    }));

    it('loads the actual intro file and does not request an English voice pack', fakeAsync(() => {
      component.beginSession(); tick(0);
      expect(clips[0].src).toBe('/assets/audio/th/game_intro.mp3');
      (component.i18n.voiceLanguage as jasmine.Spy).and.returnValue(null);
      tick(5000); announce('squeeze'); tick(0);
      expect(clips.length).toBe(1);
      component.ngOnDestroy();
    }));

    it('ignores a late failure from a replaced or stopped clip', fakeAsync(() => {
      announce('squeeze'); tick(5000);
      announce('hold'); tick(0);
      const count = clips.length;
      clips[0].onerror?.(); tick(0);
      expect(clips.length).toBe(count);
      (component as any).stopActiveFeedback();
      clips.at(-1)!.onerror?.(); tick(0);
      expect(clips.length).toBe(count);
    }));
  });

  it('leaves before starting without asking to save', () => {
    const exit = spyOn(component.sessionExit, 'emit');
    component.goBack();
    expect(exit).toHaveBeenCalledOnceWith('discard');
    expect(component.showExitConfirm()).toBeFalse();
  });

  it('offers save, discard, and continue in one dialog without duplicate global controls', () => {
    const root: HTMLElement = fixture.nativeElement;
    component.gameFlowState.set('playing');
    component.goBack();
    fixture.detectChanges();
    expect(root.querySelectorAll('.game-overlay').length).toBe(1);
    expect(root.querySelectorAll('[data-dialog="exit"] button').length).toBe(3);
    expect(root.querySelector('app-battery-status')).toBeNull();
    expect(root.querySelector('app-font-scale-control')).toBeNull();
    const exit = spyOn(component.sessionExit, 'emit');
    root.querySelector<HTMLButtonElement>('[data-exit-save]')!.click();
    expect(exit).toHaveBeenCalledWith('save');
    root.querySelector<HTMLButtonElement>('[data-exit-discard]')!.click();
    expect(exit).toHaveBeenCalledWith('discard');
    component.cancelExit();
    expect(component.showExitConfirm()).toBeFalse();
  });

  it('keeps the save decision open across device loss and reconnect', fakeAsync(() => {
    component.startGame();
    component.goBack();
    (component.bleService.connectionState as any).set('Disconnected');
    fixture.detectChanges();
    expect(component.activeOverlay).toBe('exit');
    expect(component.gameFlowState()).toBe('disconnected');
    (component.bleService.connectionState as any).set('Connected');
    fixture.detectChanges();
    tick(4000);
    expect(component.activeOverlay).toBe('exit');
    expect(component.gameFlowState()).toBe('disconnected');
    component.cancelExit();
    fixture.detectChanges();
    expect(component.gameFlowState()).toBe('countdown');
    component.ngOnDestroy();
  }));

  it('counts either edge or any overlap, and stops when fully outside', fakeAsync(() => {
    component.startGame();
    fixture.detectChanges();
    // Force is below the target; the rendered body's contact is what counts.
    expect(force()).toBeLessThan(component.targetMin);
    tick(50);
    expect(component.inTargetZone).toBeFalse();
    for (const top of [150, 125, 70, 20]) {
      balloonRect = new DOMRect(20, top, 60, 80);
      tick(50);
      expect(component.inTargetZone).withContext(`balloon top ${top}`).toBeTrue();
    }
    balloonRect = new DOMRect(20, 19, 60, 80);
    tick(50);
    expect(component.inTargetZone).toBeFalse();
    expect(feedback.playEnterZone).toHaveBeenCalledTimes(1);
    expect(feedback.stopVibrationLoop).toHaveBeenCalled();
    component.ngOnDestroy();
  }));

  it('preserves rendered target contact when the whole track is enlarged', () => {
    const root: HTMLElement = fixture.nativeElement;
    const track = root.querySelector<HTMLElement>('.game-track')!;
    const body = track.querySelector<HTMLElement>(':scope > div:last-child > div')!;
    const target = track.querySelector<HTMLElement>(':scope > div:first-child')!;
    (body.getBoundingClientRect as jasmine.Spy).and.callThrough();
    (target.getBoundingClientRect as jasmine.Spy).and.callThrough();
    root.querySelectorAll<HTMLElement>('*').forEach(el => el.style.transition = 'none');
    component.gameFlowState.set('playing');
    const contact = () => {
      (component as any).updateTargetContact();
      return component.inTargetZone;
    };
    // Compare real browser rectangles, not mocked intersections. Include both
    // responsive track heights and force samples below, within and above target.
    for (const height of [256, 405, 512]) {
      track.style.height = `${height}px`;
      const contacts: boolean[] = [];
      for (const sample of [0, 4, 8, 10, 12, 14, 16, 20, 24]) {
        force.set(sample);
        fixture.detectChanges();
        track.style.transform = 'scale(1)';
        const original = contact();
        contacts.push(original);
        track.style.transform = 'scale(1.2)';
        expect(contact()).withContext(`height ${height}, force ${sample}`).toBe(original);
        track.style.transform = 'scale(1)';
        expect(contact()).withContext('resize back during training').toBe(original);
      }
      expect(contacts).toContain(true);
      expect(contacts).toContain(false);
      expect(contacts[0]).withContext('zero force never contacts target').toBeFalse();
    }
  });

  it('requires two seconds of contact then two seconds of released force for a rep', fakeAsync(() => {
    const completed = spyOn(component.repCompleted, 'emit');
    balloonRect = new DOMRect(20, 150, 60, 80);
    component.startGame();
    fixture.detectChanges();
    tick(1950);
    expect(component.isReleasing).toBeFalse();
    expect(completed).not.toHaveBeenCalled();
    tick(50);
    expect(component.isReleasing).toBeTrue();
    force.set(0);
    fixture.detectChanges();
    tick(1950);
    expect(completed).not.toHaveBeenCalled();
    tick(50);
    expect(completed).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
  }));

  it('keeps the final bar full and does not start another rep before summary', fakeAsync(() => {
    fixture.componentRef.setInput('targetReps', 1);
    fixture.detectChanges();
    const completed = spyOn(component.repCompleted, 'emit');
    balloonRect = new DOMRect(20, 150, 60, 80);
    component.startGame();
    fixture.detectChanges();
    tick(2000);
    force.set(0);
    fixture.detectChanges();
    tick(1950);
    expect(completed).not.toHaveBeenCalled();
    tick(50);
    fixture.detectChanges();
    expect(component.sessionComplete).toBeTrue();
    expect(component.holdProgress).toBe(100);
    expect(completed).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('100');
    force.set(10);
    fixture.componentRef.setInput('currentRep', 1);
    fixture.detectChanges();
    tick(4000);
    expect(component.holdProgress).toBe(100);
    expect(component.feedbackMessage).toBe(component.i18n.t('game.sessionComplete'));
    expect(completed).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
  }));

  it('preserves the configured hold duration when starting a round', fakeAsync(() => {
    fixture.componentRef.setInput('requiredHoldTimeMs', 3000);
    balloonRect = new DOMRect(20, 150, 60, 80);
    component.startGame();
    fixture.detectChanges();
    tick(2000);
    expect(component.isReleasing).toBeFalse();
    tick(1000);
    expect(component.isReleasing).toBeTrue();
    component.ngOnDestroy();
  }));

  it('does not progress while paused or receiving stale sensor data', fakeAsync(() => {
    balloonRect = new DOMRect(20, 150, 60, 80);
    component.startGame();
    fixture.detectChanges();
    tick(500);
    component.goBack();
    fixture.detectChanges();
    const progress = component.holdProgress;
    tick(2500);
    expect(component.holdProgress).toBe(progress);
    expect(component.isReleasing).toBeFalse();
    component.cancelExit();
    fresh = false;
    tick(50);
    expect(component.sensorDataStale()).toBeTrue();
    expect(component.inTargetZone).toBeFalse();
    tick(2500);
    expect(component.isReleasing).toBeFalse();
    component.ngOnDestroy();
  }));
});
