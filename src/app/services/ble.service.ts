import { Injectable, signal, computed, NgZone } from '@angular/core';

export type BatteryLevel = 'unknown' | 'normal' | 'low' | 'critical' | 'empty';

export type ConnectionState = 'Disconnected' | 'Scanning' | 'Connected';

// The device streams at 20Hz. Five missed frames are enough to stop using the
// last force value while still allowing a short Bluetooth scheduling hiccup.
const MAX_VALID_FORCE_NEWTONS = 200;
const SAMPLE_TIMEOUT_MS = 250;

@Injectable({
  providedIn: 'root'
})
export class BleService {
  // Angular 17 Signals for reactive UI bindings
  public connectionState = signal<ConnectionState>('Disconnected');
  public deviceName = signal<string>('No Device');
  public error = signal<string | null>(null);
  public batteryPercent = signal<number | null>(null);
  public batteryLevel = computed<BatteryLevel>(() => {
    const percent = this.batteryPercent();
    if (percent === null) return 'unknown';
    if (percent === 0) return 'empty';
    if (percent <= 10) return 'critical';
    if (percent <= 20) return 'low';
    return 'normal';
  });
  public batteryNotice = signal<BatteryLevel | null>(null);
  public isSimulated = signal(false);
  private warnedBatteryLevels = new Set<BatteryLevel>();

  private resetBattery(): void {
    this.batteryPercent.set(null);
    this.batteryNotice.set(null);
    this.warnedBatteryLevels.clear();
    this.isSimulated.set(false);
  }

  private updateBattery(percent: number | null): void {
    this.batteryPercent.set(percent);
    const level = this.batteryLevel();
    if (level === 'unknown' || level === 'normal') {
      this.batteryNotice.set(null);
    } else if (!this.warnedBatteryLevels.has(level)) {
      this.warnedBatteryLevels.add(level);
      this.batteryNotice.set(level);
    } else if (this.batteryNotice() !== level) {
      this.batteryNotice.set(null);
    }
  }

  public dismissBatteryNotice(): void {
    this.batteryNotice.set(null);
  }

  /** Change battery levels in the existing mock session without touching hardware. */
  public setMockBatteryPercent(percent: number): void {
    if (this.isSimulated() && Number.isInteger(percent) && percent >= 0 && percent <= 100) {
      this.updateBattery(percent);
    }
  }

  /** Timestamp of the most recent valid force sample, or null until one arrives. */
  public lastSampleAt = signal<number | null>(null);

  // Core ESP32 Prototype UUID bindings
  private readonly SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  private readonly CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
  
  // Generic navigator references to bypass TypeScript checking for Web Bluetooth API natively.
  private device: any = null;
  private characteristic: any = null;
  
  /**
   * Callback hook intended to be bound by higher level logic (e.g., CtarLogicService).
   * Passes the newly decoded force float instantly from the 20Hz pipeline.
   */
  public onDataReceived: ((force: number) => void) | null = null;

  private simInterval: any = null;
  private isSqueezing = false;

  private keydownListener: any = null;
  private keyupListener: any = null;
  private mousedownListener: any = null;
  private mouseupListener: any = null;
  private touchstartListener: any = null;
  private touchendListener: any = null;

  constructor(private ngZone: NgZone) {}

  /**
   * Register key & touch/mouse listeners to simulate squeezing CTAR device
   */
  private addSimulationListeners() {
    this.removeSimulationListeners(); // Safety cleanup

    this.keydownListener = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space' || e.key === 'ArrowUp') {
        // Prevent browser scrolling with space or arrow key
        e.preventDefault();
        this.isSqueezing = true;
      }
    };

    this.keyupListener = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space' || e.key === 'ArrowUp') {
        this.isSqueezing = false;
      }
    };

    // Helper to determine if target is an interactive element (to prevent click-and-hold triggers)
    const isInteractive = (target: HTMLElement | null): boolean => {
      if (!target) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === 'button' || 
             tagName === 'input' || 
             tagName === 'a' || 
             tagName === 'select' || 
             tagName === 'textarea' ||
             target.closest('button') !== null ||
             target.closest('a') !== null;
    };

    this.mousedownListener = (e: MouseEvent) => {
      if (!isInteractive(e.target as HTMLElement)) {
        this.isSqueezing = true;
      }
    };

    this.mouseupListener = () => {
      this.isSqueezing = false;
    };

    this.touchstartListener = (e: TouchEvent) => {
      if (!isInteractive(e.target as HTMLElement)) {
        this.isSqueezing = true;
      }
    };

    this.touchendListener = () => {
      this.isSqueezing = false;
    };

    window.addEventListener('keydown', this.keydownListener, { passive: false });
    window.addEventListener('keyup', this.keyupListener);
    window.addEventListener('mousedown', this.mousedownListener);
    window.addEventListener('mouseup', this.mouseupListener);
    window.addEventListener('touchstart', this.touchstartListener, { passive: true });
    window.addEventListener('touchend', this.touchendListener);
  }

  /**
   * Unregister key & touch/mouse simulation listeners
   */
  private removeSimulationListeners() {
    this.isSqueezing = false;
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }
    if (this.keyupListener) {
      window.removeEventListener('keyup', this.keyupListener);
      this.keyupListener = null;
    }
    if (this.mousedownListener) {
      window.removeEventListener('mousedown', this.mousedownListener);
      this.mousedownListener = null;
    }
    if (this.mouseupListener) {
      window.removeEventListener('mouseup', this.mouseupListener);
      this.mouseupListener = null;
    }
    if (this.touchstartListener) {
      window.removeEventListener('touchstart', this.touchstartListener);
      this.touchstartListener = null;
    }
    if (this.touchendListener) {
      window.removeEventListener('touchend', this.touchendListener);
      this.touchendListener = null;
    }
  }

  /**
   * Mock device for development without hardware.
   * Listens to keyboard/touch to smoothly simulate pressure.
   */
  simulateDevice() {
    if (this.simInterval) clearInterval(this.simInterval);
    this.ngZone.run(() => {
      this.resetBattery();
      this.isSimulated.set(true);
      this.updateBattery(100);
      this.connectionState.set('Connected');
      this.deviceName.set('Mock CTAR Device');
      this.error.set(null);
      this.lastSampleAt.set(null);
    });

    this.addSimulationListeners();

    let force = 0;
    
    // Simulate 20Hz data stream
    this.simInterval = setInterval(() => {
      if (this.isSqueezing) {
        // Smoothly ramp force up to 40.0 Newtons (covers target zones & overforce)
        if (force < 40.0) {
          force += 1.5;
          if (force > 40.0) force = 40.0;
        }
      } else {
        // Smoothly ramp force down to 0.0 Newtons
        if (force > 0.0) {
          force -= 2.0;
          if (force < 0.0) force = 0.0;
        }
      }

      this.ngZone.run(() => {
        this.lastSampleAt.set(Date.now());
        if (this.onDataReceived) {
          this.onDataReceived(Number(force.toFixed(1)));
        }
      });
    }, 50);
  }

  /**
   * Invokes the Browser Web Bluetooth prompt looking specifically for our UUIDs.
   * Throws strictly onto internal error Signals if API is unsupported or user cancels.
   */
  async connect(): Promise<void> {
    if (!('bluetooth' in navigator)) {
      this.error.set('Web Bluetooth API is not supported in this browser.');
      return;
    }

    this.resetBattery();
    this.error.set(null);
    this.connectionState.set('Scanning');
    this.lastSampleAt.set(null);

    try {
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters : [
          {namePrefix: 'CTAR'}
        ],
        optionalServices: [this.SERVICE_UUID]
      });

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

      this.ngZone.run(() => {
        this.deviceName.set(this.device.name || 'CTAR Device');
        this.connectionState.set('Connected');
      });

    } catch (err: any) {
      this.ngZone.run(() => {
        this.error.set(err.message || 'GATT Connection failed.');
        this.resetBattery();
        this.connectionState.set('Disconnected');
        console.error('BLE Connect Error:', err);
      });
    }
  }

  /**
   * Disconnects the GATT server forcefully returning application to base state.
   */
  async disconnect(): Promise<void> {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
      this.removeSimulationListeners();
      this.onDisconnected();
      return;
    }

    if (!this.device || !this.device.gatt.connected) {
      return;
    }
    this.device.gatt.disconnect();
  }

  /**
   * Inner hook resetting Signals securely upon disconnect
   */
  private onDisconnected(): void {
    this.removeSimulationListeners();
    this.ngZone.run(() => {
      this.resetBattery();
      this.connectionState.set('Disconnected');
      this.deviceName.set('No Device');
      this.lastSampleAt.set(null);
    });
  }

  /** Whether a valid force sample has arrived recently enough for game logic. */
  public isSampleFresh(now = Date.now()): boolean {
    const lastSample = this.lastSampleAt();
    if (lastSample === null) return false;
    const age = now - lastSample;
    return age >= 0 && age <= SAMPLE_TIMEOUT_MS;
  }

  public setMockSqueezing(squeezing: boolean) {
    this.isSqueezing = squeezing;
  }

  /**
   * Decode little-endian float32 force, followed by an optional uint8 battery.
   * Ignore struct padding; legacy four-byte force packets remain supported.
   */
  private handleCharacteristicValueChanged(event: any): void {
    const value: DataView = event.target.value;
    
    if (value.byteLength >= 4) {
      const battery = value.byteLength >= 5 ? value.getUint8(4) : null;
      // Battery validity does not affect the force pipeline or its freshness.
      const percent = battery !== null && battery <= 100 ? battery : null;
      if (percent !== this.batteryPercent()) {
        this.ngZone.run(() => this.updateBattery(percent));
      }
      let forceValue: number;
      try {
        forceValue = value.getFloat32(0, true);
      } catch {
        return;
      }

      // A malformed float must never become the current force. Negative,
      // non-finite, and physically implausible readings are discarded; the
      // freshness timeout then pauses the game if valid samples stop arriving.
      if (!Number.isFinite(forceValue) || forceValue < 0 || forceValue > MAX_VALID_FORCE_NEWTONS) {
        return;
      }

      this.lastSampleAt.set(Date.now());
      this.ngZone.run(() => {
        if (this.onDataReceived) {
          this.onDataReceived(forceValue);
        }
      });
    }
  }
}
