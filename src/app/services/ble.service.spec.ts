import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BleService } from './ble.service';

describe('BleService battery packets', () => {
  let service: BleService;
  function receive(force: number, battery?: number, size = battery === undefined ? 4 : 8): void {
    const value = new DataView(new ArrayBuffer(size));
    if (size >= 4) value.setFloat32(0, force, true);
    if (battery !== undefined && size >= 5) value.setUint8(4, battery);
    (service as any).handleCharacteristicValueChanged({ target: { value } });
  }
  beforeEach(() => {
    service = TestBed.inject(BleService);
  });

  it('decodes both packed and padded packets without changing force', () => {
    const callback = jasmine.createSpy('force');
    service.onDataReceived = callback;
    receive(12.5, 100, 5);
    expect(service.batteryPercent()).toBe(100);
    expect(callback).toHaveBeenCalledWith(12.5);
    receive(18.75, 20);
    expect(service.batteryPercent()).toBe(20);
    expect(callback).toHaveBeenCalledWith(18.75);
  });

  it('keeps legacy and invalid battery packets usable for force', () => {
    const callback = jasmine.createSpy('force');
    service.onDataReceived = callback;
    receive(1, 50);
    receive(2);
    expect(service.batteryPercent()).toBeNull();
    receive(3, 255);
    expect(service.batteryPercent()).toBeNull();
    expect(callback.calls.allArgs()).toEqual([[1], [2], [3]]);
    receive(0, undefined, 3);
    expect(callback.calls.count()).toBe(3);
  });

  it('does not refresh force freshness from malformed force with valid battery', () => {
    const callback = jasmine.createSpy('force');
    service.onDataReceived = callback;
    receive(NaN, 20);
    receive(-1, 10);
    receive(Infinity, 0);
    expect(service.batteryPercent()).toBe(0);
    expect(service.lastSampleAt()).toBeNull();
    expect(callback).not.toHaveBeenCalled();
  });

  it('uses the agreed thresholds, including empty for zero', () => {
    for (const [percent, level] of [[100, 'normal'], [21, 'normal'], [20, 'low'], [11, 'low'], [10, 'critical'], [1, 'critical'], [0, 'empty']] as const) {
      receive(0, percent);
      expect(service.batteryLevel()).toBe(level);
    }
  });

  it('warns only once per level, even with jitter or recovery', () => {
    receive(0, 20);
    expect(service.batteryNotice()).toBe('low');
    service.dismissBatteryNotice();
    receive(0, 19);
    receive(0, 21);
    receive(0, 20);
    expect(service.batteryNotice()).toBeNull();
    receive(0, 10);
    expect(service.batteryNotice()).toBe('critical');
    receive(0, 0);
    expect(service.batteryNotice()).toBe('empty');
  });

  it('clears readings and rearms notices after disconnect', () => {
    receive(0, 20);
    service.dismissBatteryNotice();
    (service as any).onDisconnected();
    expect(service.batteryPercent()).toBeNull();
    expect(service.batteryNotice()).toBeNull();
    receive(0, 20);
    expect(service.batteryNotice()).toBe('low');
  });

  it('supports explicit simulated levels without changing force timing', fakeAsync(() => {
    const callback = jasmine.createSpy('force');
    service.onDataReceived = callback;
    service.simulateDevice();
    expect(service.isSimulated()).toBeTrue();
    expect(service.batteryPercent()).toBe(100);
    service.setMockBatteryPercent(10);
    expect(service.batteryNotice()).toBe('critical');
    tick(50);
    expect(callback.calls.count()).toBe(1);
    service.disconnect();
    expect(service.batteryPercent()).toBeNull();
    expect(service.isSimulated()).toBeFalse();
    service.setMockBatteryPercent(50);
    expect(service.batteryPercent()).toBeNull();
  }));
});
