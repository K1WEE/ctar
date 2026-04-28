import { Injectable, signal, NgZone } from '@angular/core';

export type ConnectionState = 'Disconnected' | 'Scanning' | 'Connected';

@Injectable({
  providedIn: 'root'
})
export class BleService {
  // Angular 17 Signals for reactive UI bindings
  public connectionState = signal<ConnectionState>('Disconnected');
  public deviceName = signal<string>('No Device');
  public error = signal<string | null>(null);

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

  constructor(private ngZone: NgZone) {}

  /**
   * Invokes the Browser Web Bluetooth prompt looking specifically for our UUIDs.
   * Throws strictly onto internal error Signals if API is unsupported or user cancels.
   */
  async connect(): Promise<void> {
    if (!('bluetooth' in navigator)) {
      this.error.set('Web Bluetooth API is not supported in this browser.');
      return;
    }

    this.error.set(null);
    this.connectionState.set('Scanning');

    try {
      // 1. Request pairing using acceptAllDevices for easier debugging
      // and specify our service as an optionalService so we can still connect to it.
      this.device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [this.SERVICE_UUID]
      });

      // 2. Add an event listener to handle out-of-range disconnects natively
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

      // 3. Connect to GATT server and retrieve handles
      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

      // 4. Begin continuous hardware subscription
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

      // 5. NgZone forces Angular change detection safely since Promises operate outside the zone
      this.ngZone.run(() => {
        this.deviceName.set(this.device.name || 'CTAR Device');
        this.connectionState.set('Connected');
      });

    } catch (err: any) {
      this.ngZone.run(() => {
        this.error.set(err.message || 'GATT Connection failed.');
        this.connectionState.set('Disconnected');
        console.error('BLE Connect Error:', err);
      });
    }
  }

  /**
   * Disconnects the GATT server forcefully returning application to base state.
   */
  async disconnect(): Promise<void> {
    if (!this.device || !this.device.gatt.connected) {
      return;
    }
    this.device.gatt.disconnect(); // Triggers the `onDisconnected` callback
  }

  /**
   * Inner hook resetting Signals securely upon disconnect
   */
  private onDisconnected(): void {
    this.ngZone.run(() => {
      this.connectionState.set('Disconnected');
      this.deviceName.set('No Device');
    });
  }

  /**
   * Extracts raw bytes from ESP32 characteristic buffer stream, parsing it strictly 
   * as a 32-bit Little Endian Unsigned Integer (Uint32), scaling it appropriately.
   */
  private handleCharacteristicValueChanged(event: any): void {
    const value: DataView = event.target.value;
    
    // We expect at minimum 4 bytes for 32-bit data
    if (value.byteLength >= 4) {
      // Critical decoding: 32-bit Float Little Endian
      const forceValue = value.getFloat32(0, true);
      
      // We don't need to divide here if ESP32 sends calibrated Float directly
      
      this.ngZone.run(() => {
        if (this.onDataReceived) {
          this.onDataReceived(forceValue);
        }
      });
    }
  }
}
