import { Injectable, signal, NgZone } from '@angular/core';

export type ConnectionState = 'Disconnected' | 'Scanning' | 'Connected';

@Injectable({
  providedIn: 'root'
})
export class BleService {
  public connectionState = signal<ConnectionState>('Disconnected');
  public deviceName = signal<string>('No Device');
  public error = signal<string | null>(null);
  public latestForce = signal<number>(0);

  private readonly SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  private readonly CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
  
  private device: any = null;
  private characteristic: any = null;
  
  // Expose an array if we need historical stream in other services, but let's keep it minimal here
  // A callback is used so that the logic service can hook exactly per-sample
  public onDataReceived: ((force: number) => void) | null = null;

  constructor(private ngZone: NgZone) {}

  async connect() {
    if (!('bluetooth' in navigator)) {
      this.error.set('Web Bluetooth API is not supported in this browser.');
      return;
    }

    this.error.set(null);
    this.connectionState.set('Scanning');

    try {
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [this.SERVICE_UUID] }]
      });

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

      this.ngZone.run(() => {
        this.deviceName.set(this.device.name || 'Unknown Device');
        this.connectionState.set('Connected');
      });
    } catch (err: any) {
      this.ngZone.run(() => {
        this.error.set(err.message || 'Connection failed.');
        this.connectionState.set('Disconnected');
        console.error('BLE Connect Error:', err);
      });
    }
  }

  async disconnect() {
    if (!this.device || !this.device.gatt.connected) {
      return;
    }
    this.device.gatt.disconnect();
  }

  private onDisconnected() {
    this.ngZone.run(() => {
      this.connectionState.set('Disconnected');
      this.deviceName.set('No Device');
      this.latestForce.set(0);
    });
  }

  private handleCharacteristicValueChanged(event: any) {
    const value: DataView = event.target.value;
    // Decode 32-bit Little Endian Uint32
    if (value.byteLength >= 4) {
      const forceValue = value.getUint32(0, true);
      this.ngZone.run(() => {
        this.latestForce.set(forceValue);
        if (this.onDataReceived) {
          this.onDataReceived(forceValue);
        }
      });
    }
  }
}
