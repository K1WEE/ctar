import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { FINISH_FALLBACK_MS, GameComponent } from './game.component';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { DataSyncService } from '../../services/data-sync.service';
import { SupabaseService } from '../../services/supabase.service';

describe('GameComponent training session', () => {
  let repCount = signal(0);
  let resetSession: jasmine.Spy;
  let snapshot: jasmine.Spy;
  let navigate: jasmine.Spy;
  let fetchPatientProfile: jasmine.Spy;

  beforeEach(async () => {
    repCount = signal(0);
    resetSession = jasmine.createSpy('resetSession').and.callFake(() => repCount.set(0));
    snapshot = jasmine.createSpy('getSessionSnapshot').and.returnValue({ id: 'session-1' });
    fetchPatientProfile = jasmine.createSpy('fetchPatientProfile').and.resolveTo({target_reps: 3, hold_duration_ms: 4000});
    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        provideRouter([]),
        { provide: CtarLogicService, useValue: {repCount, calibrationMaxForce: signal(20), resetSession, getSessionSnapshot: snapshot, setSessionPaused: jasmine.createSpy('setSessionPaused')} },
        { provide: SupabaseService, useValue: { currentUser: signal({ id: 'patient-1' }) } },
        { provide: DataSyncService, useValue: { fetchPatientProfile } },
      ],
    }).overrideComponent(GameComponent, { set: { template: '', imports: [] } }).compileComponents();
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('uses patient settings and rejects excess rep events', async () => {
    const fixture = TestBed.createComponent(GameComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();
    expect(fetchPatientProfile).toHaveBeenCalledWith('patient-1');
    expect(component.targetReps()).toBe(3);
    expect(component.holdDurationMs()).toBe(4000);
    for (let event = 0; event < 5; event++) component.onGameRep();
    expect(repCount()).toBe(3);
    fixture.destroy();
  });

  it('captures a stable result before summary, and commits only one exit choice', () => {
    const fixture = TestBed.createComponent(GameComponent);
    fixture.componentInstance.onSessionExit('save');
    fixture.componentInstance.onSessionExit('discard');
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledOnceWith(['/summary']);
    expect(snapshot).toHaveBeenCalledBefore(navigate);
    expect(resetSession).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('discards the current results and returns to preparation without saving', () => {
    const fixture = TestBed.createComponent(GameComponent);
    repCount.set(2);
    fixture.componentInstance.onSessionExit('discard');
    expect(repCount()).toBe(0);
    expect(snapshot).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledOnceWith(['/calibrate']);
    fixture.destroy();
  });

  it('does not auto-finish behind an open save decision', fakeAsync(() => {
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();
    tick();
    repCount.set(3);
    fixture.detectChanges();
    fixture.componentInstance.onExitDialogChange(true);
    tick(4000);
    expect(navigate).not.toHaveBeenCalled();
    fixture.componentInstance.onExitDialogChange(false);
    tick(FINISH_FALLBACK_MS);
    expect(navigate).toHaveBeenCalledOnceWith(['/summary']);
    fixture.destroy();
  }));

  it('goes to the summary as soon as the final praise has been heard', fakeAsync(() => {
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();
    tick();
    repCount.set(3);
    fixture.detectChanges();
    tick(1000);
    expect(navigate).not.toHaveBeenCalled();
    fixture.componentInstance.onCelebrationDone();
    expect(navigate).toHaveBeenCalledOnceWith(['/summary']);
    tick(FINISH_FALLBACK_MS);
    expect(navigate).toHaveBeenCalledTimes(1);
    fixture.destroy();
  }));

  it('still reaches the summary if the praise never reports back', fakeAsync(() => {
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();
    tick();
    repCount.set(3);
    fixture.detectChanges();
    tick(FINISH_FALLBACK_MS - 1);
    expect(navigate).not.toHaveBeenCalled();
    tick(1);
    expect(navigate).toHaveBeenCalledOnceWith(['/summary']);
    fixture.destroy();
  }));

  it('waits for an open save decision even after the praise ends', fakeAsync(() => {
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();
    tick();
    repCount.set(3);
    fixture.detectChanges();
    fixture.componentInstance.onExitDialogChange(true);
    fixture.componentInstance.onCelebrationDone();
    tick(FINISH_FALLBACK_MS);
    expect(navigate).not.toHaveBeenCalled();
    fixture.componentInstance.onExitDialogChange(false);
    expect(navigate).toHaveBeenCalledOnceWith(['/summary']);
    fixture.destroy();
  }));
});
