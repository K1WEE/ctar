import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BleService } from './ble.service';
import { CtarLogicService } from './ctar-logic.service';

describe('CtarLogicService decision pause', () => {
  it('excludes paused samples and time, then resumes without losing completed work', () => {
    let now = 10000;
    spyOn(Date, 'now').and.callFake(() => now);
    const ble = { connectionState: signal('Connected'), onDataReceived: (_force: number) => {} };
    TestBed.configureTestingModule({providers: [{provide: BleService, useValue: ble}]});
    const service = TestBed.inject(CtarLogicService);
    service.resetSession();
    ble.onDataReceived(10);
    now += 2000;
    ble.onDataReceived(12);
    service.repCount.set(1);
    service.setSessionPaused(true);
    now += 10000;
    ble.onDataReceived(100);
    expect(service.currentForce()).toBe(100);
    expect(service.peakForce()).toBe(12);
    expect(service.getDataHistory().length).toBe(2);
    expect(service.getSessionDurationSeconds()).toBe(2);
    service.setSessionPaused(false);
    ble.onDataReceived(8);
    now += 1000;
    ble.onDataReceived(9);
    const saved = service.getSessionSnapshot();
    expect(saved.durationSeconds).toBe(3);
    expect(saved.reps).toBe(1);
    expect(saved.maxForce).toBe(12);
    service.resetSession();
    expect(service.getSessionDurationSeconds()).toBe(0);
    expect(service.getDataHistory()).toEqual([]);
  });
});
