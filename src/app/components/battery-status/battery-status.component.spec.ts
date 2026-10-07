import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BatteryStatusComponent } from './battery-status.component';
import { BleService } from '../../services/ble.service';
import { I18nService } from '../../services/i18n.service';

describe('BatteryStatusComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatteryStatusComponent],
      providers: [{ provide: I18nService, useValue: { currentLang: signal('th') } }],
    }).compileComponents();
  });

  it('shows distinct SVG levels at every boundary without percentages or stale readings', () => {
    const fixture = TestBed.createComponent(BatteryStatusComponent);
    fixture.componentRef.setInput('presentation', 'indicator');
    const service = TestBed.inject(BleService);
    service.connectionState.set('Connected');
    const element: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();
    expect(element.querySelector('svg text')?.textContent).toBe('?');
    for (const [percent, bars, tone] of [[0, 0, 'red'], [1, 1, 'red'], [20, 1, 'red'], [21, 2, 'yellow'], [60, 2, 'yellow'], [61, 3, 'emerald'], [100, 3, 'emerald']] as const) {
      service.batteryPercent.set(percent);
      fixture.detectChanges();
      expect(element.querySelectorAll('svg rect[fill="currentColor"]').length).withContext(`${percent}`).toBe(bars);
      expect(element.querySelector('[role="img"]')?.className).toContain(tone);
      expect(element.textContent).not.toContain('%');
      expect(element.querySelector('svg text')).toBeNull();
    }
    service.connectionState.set('Disconnected');
    fixture.detectChanges();
    expect(element.textContent).toContain('ไม่ได้เชื่อมต่อ');
    expect(element.querySelectorAll('svg rect[fill="currentColor"]').length).toBe(0);
    expect(element.querySelector('[role="img"]')?.className).toContain('slate');
  });

  it('keeps battery warnings after acknowledgment and clears them on disconnect', () => {
    const fixture = TestBed.createComponent(BatteryStatusComponent);
    const service = TestBed.inject(BleService);
    service.connectionState.set('Connected');
    const element: HTMLElement = fixture.nativeElement;
    element.style.display = 'block';
    element.style.width = '280px';
    const value = new DataView(new ArrayBuffer(8));
    value.setFloat32(0, 12.5, true);
    value.setUint8(4, 0);
    (service as any).handleCharacteristicValueChanged({ target: { value } });
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('แบตเตอรี่หมด');
    expect(element.scrollWidth).toBeLessThanOrEqual(280);
    element.querySelector('button')!.click();
    fixture.detectChanges();
    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('p')?.textContent).toContain('กรุณาชาร์จหรือตรวจสอบแบตเตอรี่');
    (service as any).onDisconnected();
    fixture.detectChanges();
    expect(element.textContent).toContain('ไม่ได้เชื่อมต่อ');
    expect(element.querySelector('p')).toBeNull();
  });
});
