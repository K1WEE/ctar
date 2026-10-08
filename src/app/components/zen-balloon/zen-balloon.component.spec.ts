import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { REST_MS, SILENT_CELEBRATION_MS, ZenBalloonComponent } from './zen-balloon.component';
import { VOICE_LINES, ZenBalloonVoiceCoach } from './zen-balloon-voice';
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
    // ngOnInit starts the practice round on a real timer; tests drive their own
    (component as any).stopGameLoop();
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
      const keys = [
        ...Object.values((component as any).feedbackMessageKeys).flat() as string[],
        ...Object.values(VOICE_LINES).flat().map(line => line.textKey),
      ];
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

  describe('voice playback', () => {
    let clips: Array<{ src: string; play: jasmine.Spy; pause: jasmine.Spy; onerror?: () => void; onended?: () => void; onpause?: () => void }>;
    let rejectNext: boolean;
    // The mock never fires media events; simulate the speaking clip ending naturally.
    const finish = () => clips.at(-1)?.onended?.();
    const coach = () => (component as any).voice;

    beforeEach(() => {
      clips = [];
      rejectNext = false;
      component.isMuted = false;
      // ngOnInit's practice round already advanced the line rotation; start fresh
      (component as any).voice = new ZenBalloonVoiceCoach((line: any, cue: any) => (component as any).speakLine(line, cue));
      (component as any).feedbackIndices.squeeze = -1;
      spyOn(component.i18n, 'voiceLanguage').and.returnValue('th');
      spyOn(window, 'Audio').and.callFake((function(src: string) {
        const fail = rejectNext;
        rejectNext = false;
        const clip = {
          src,
          play: jasmine.createSpy('play').and.callFake(() => fail ? Promise.reject(new Error('missing')) : Promise.resolve()),
          pause: jasmine.createSpy('pause'),
        };
        clips.push(clip);
        return clip as unknown as HTMLAudioElement;
      }) as any);
    });

    it('starts the first rep with a squeeze instruction and shows the same sentence', fakeAsync(() => {
      component.startGame(); tick(0);
      expect(clips.map(clip => clip.src)).toEqual(['/assets/audio/th/game_squeeze_01.mp3']);
      expect(component.feedbackMessage).toBe(component.i18n.t('game.feedback.squeeze1'));
      component.ngOnDestroy();
    }));

    it('keeps the spoken sentence on screen until the clip ends', fakeAsync(() => {
      component.startGame(); tick(0);
      (component as any).applyFeedbackState('tooHard');
      expect(component.feedbackMessage).toBe(component.i18n.t('game.feedback.squeeze1'));
      finish();
      expect(component.feedbackMessage).not.toBe(component.i18n.t('game.feedback.squeeze1'));
      component.ngOnDestroy();
    }));

    it('shows the praise star, cue text and voice from the same line', fakeAsync(() => {
      for (let n = 1; n <= 4; n++) {
        (component as any).triggerSuccessAnimation(); tick(0);
        expect(clips.at(-1)!.src).toBe(`/assets/audio/th/cue_rep_success_0${n}.mp3`);
        expect(component.feedbackMessage).toBe(component.i18n.t(`game.feedback.success${n}`));
        expect(component.praise()?.text).toBe(component.i18n.t(`game.praise.${n}`));
        finish();
      }
      tick(1800);
    }));

    it('falls back once and still releases the queue when the clip is missing', fakeAsync(() => {
      component.beginSession(); tick(0);
      finish();
      rejectNext = true;
      coach().beginRep(true);
      clips.at(-1)!.onerror?.();
      tick(0); // Both the error event and play rejection may fire.
      expect(clips.slice(1).map(clip => clip.src)).toEqual(['/assets/audio/th/game_squeeze_01.mp3', '/assets/audio/th/cue_squeeze.mp3']);
      component.ngOnDestroy();
    }));

    it('loads the actual intro file and does not request an English voice pack', fakeAsync(() => {
      component.beginSession(); tick(0);
      expect(clips[0].src).toBe('/assets/audio/th/game_intro.mp3');
      (component.i18n.voiceLanguage as jasmine.Spy).and.returnValue(null);
      finish(); coach().beginRep(true); tick(0);
      expect(clips.length).toBe(1);
      component.ngOnDestroy();
    }));

    it('ignores a late failure from a replaced or stopped clip', fakeAsync(() => {
      coach().beginRep(true);
      coach().enteredZone(); tick(0);
      const count = clips.length;
      clips[0].onerror?.(); tick(0);
      expect(clips.length).toBe(count);
      (component as any).stopActiveFeedback();
      clips.at(-1)!.onerror?.(); tick(0);
      expect(clips.length).toBe(count);
    }));

    it('plays the fanfare before the praise voice so the voice cannot duck it', fakeAsync(() => {
      (component as any).triggerSuccessAnimation(); tick(0);
      expect(feedback.playSuccess).toHaveBeenCalledBefore(window.Audio as unknown as jasmine.Spy);
      tick(1800);
    }));

    it('reports the celebration done when the final praise finishes speaking', fakeAsync(() => {
      const done = spyOn(component.celebrationDone, 'emit');
      fixture.componentRef.setInput('targetReps', 1);
      balloonRect = new DOMRect(20, 150, 60, 80);
      component.startGame(); tick(2000);
      force.set(0); fixture.detectChanges();
      tick(REST_MS);
      expect(component.sessionComplete).toBeTrue();
      expect(clips.at(-1)!.src).toContain('cue_rep_success_');
      tick(SILENT_CELEBRATION_MS * 2);
      expect(done).not.toHaveBeenCalled();
      finish();
      expect(done).toHaveBeenCalledTimes(1);
      component.ngOnDestroy();
    }));

    it('reports the celebration done after a short pause when muted', fakeAsync(() => {
      const done = spyOn(component.celebrationDone, 'emit');
      component.isMuted = true;
      fixture.componentRef.setInput('targetReps', 1);
      balloonRect = new DOMRect(20, 150, 60, 80);
      component.startGame(); tick(2000);
      force.set(0); fixture.detectChanges();
      tick(REST_MS);
      tick(SILENT_CELEBRATION_MS - 1);
      expect(done).not.toHaveBeenCalled();
      tick(1);
      expect(done).toHaveBeenCalledTimes(1);
      component.ngOnDestroy();
    }));

    it('stays silent when muted but still rotates the praise', fakeAsync(() => {
      component.isMuted = true;
      (component as any).triggerSuccessAnimation();
      (component as any).triggerSuccessAnimation();
      expect(clips.length).toBe(0);
      expect(component.praise()?.text).toBe(component.i18n.t('game.praise.2'));
      expect(component.feedbackMessage).toBe(component.i18n.t('game.feedback.success2'));
      tick(1800);
    }));
  });

  it('leaves before starting without asking to save', () => {
    const exit = spyOn(component.sessionExit, 'emit');
    component.goBack();
    expect(exit).toHaveBeenCalledOnceWith('leave');
    expect(component.showExitConfirm()).toBeFalse();
  });

  it('offers save, discard, and continue in one dialog without duplicate global controls', () => {
    const root: HTMLElement = fixture.nativeElement;
    component.startGame();
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

  it('requires two seconds of contact then REST_MS of released force for a rep', fakeAsync(() => {
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
    tick(REST_MS - 50);
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
    tick(REST_MS - 50);
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

  it('plays one uncounted practice rep, then waits for the patient to start', fakeAsync(() => {
    const reps = spyOn(component.repCompleted, 'emit');
    component.enterPractice();
    expect(component.practiceRound()).toBeTrue();
    expect(component.activeOverlay).toBeNull();
    balloonRect = new DOMRect(20, 120, 60, 80);
    tick(component.requiredHoldTimeMs + 50);
    expect(component.isReleasing).withContext('hold completed').toBeTrue();
    force.set(0);
    tick(REST_MS + 50);
    expect(component.practiceRound()).toBeFalse();
    expect(reps).not.toHaveBeenCalled();
    expect(component.activeOverlay).withContext('waits on the ready screen').toBe('ready');
    tick(5000);
    expect(component.gameFlowState()).toBe('ready');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.ready-start').click();
    expect(component.gameFlowState()).toBe('countdown');
    component.ngOnDestroy();
  }));

  it('lets the patient skip the practice', fakeAsync(() => {
    component.enterPractice();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.practice-skip').click();
    expect(component.practiceRound()).toBeFalse();
    expect(component.gameFlowState()).toBe('countdown');
    component.ngOnDestroy();
  }));
});
