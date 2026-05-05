import { Injectable, signal, effect, NgZone } from '@angular/core';
import { BleService } from './ble.service';

export interface DataPoint {
  timestamp: number;
  timeLabel: string;
  thaiTime: string;
  force: number;
}

@Injectable({
  providedIn: 'root'
})
export class CtarLogicService {

  public currentForce = signal<number>(0);
  public peakForce = signal<number>(0);
  public repCount = signal<number>(0);
  public latestDataPoint = signal<DataPoint | null>(null);
  public calibrationMaxForce = signal<number>(0);

public setCalibration(maxForce: number) {
  this.calibrationMaxForce.set(maxForce);
}
public getDataHistory() {
  return [...this.dataHistory];
}
public getSessionDurationSeconds() {
  if (this.dataHistory.length === 0) return 0;

  const start = this.dataHistory[0].timestamp;
  const end = this.dataHistory[this.dataHistory.length - 1].timestamp;

  return Math.round((end - start) / 1000);
}

  private readonly REP_THRESHOLD = 40;
  private readonly REP_DROP_THRESHOLD = 20;
  private isInRep = false;

  private dataHistory: DataPoint[] = [];
  private sessionStartTime: number = 0;

  constructor(private bleService: BleService, private ngZone: NgZone) {

    // reset เมื่อ connect
    effect(() => {
      const state = this.bleService.connectionState();
      if (state === 'Connected') {
        this.resetSession();
      }
    });

    // รับค่า force จาก BLE
    this.bleService.onDataReceived = (force: number) => {
      this.ngZone.run(() => this.processForce(force));
    };
  }

  private resetSession() {
    this.currentForce.set(0);
    this.peakForce.set(0);
    this.repCount.set(0);
    this.dataHistory = [];
    this.isInRep = false;
    this.sessionStartTime = Date.now();
  }

  private processForce(force: number) {

    // กัน sessionStartTime = 0
    if (this.sessionStartTime === 0) {
      this.sessionStartTime = Date.now();
    }

    this.currentForce.set(force);

    // peak
    if (force > this.peakForce()) {
      this.peakForce.set(force);
    }

    // rep logic
    if (force > this.REP_THRESHOLD && !this.isInRep) {
      this.isInRep = true;
    } else if (force < this.REP_DROP_THRESHOLD && this.isInRep) {
      this.isInRep = false;
      this.repCount.update(c => c + 1);
    }

    const now = Date.now();

    const elapsedTimeText =
      ((now - this.sessionStartTime) / 1000).toFixed(1) + 's';

    const thaiTime = new Date(now)
      .toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })
      .replace(',', '');

    const dp: DataPoint = {
      timestamp: now,
      timeLabel: elapsedTimeText,
      thaiTime: thaiTime,
      force: Number(force.toFixed(2))
    };

    this.dataHistory.push(dp);

    // กัน data โตเกิน
    if (this.dataHistory.length > 10000) {
      this.dataHistory.shift();
    }

    this.latestDataPoint.set(dp);
  }

  public exportCsv() {
    if (this.dataHistory.length === 0) {
      console.warn('No data to export');
      return;
    }

    // ✅ สำคัญ: กัน Excel อ่านเพี้ยน
    const BOM = '\uFEFF';

    let csvContent = 'Timestamp,DateTime(TH),Time(s),Force\n';

    this.dataHistory.forEach(dp => {
      csvContent += `${dp.timestamp},"${dp.thaiTime}",${dp.timeLabel},${dp.force}\n`;
    });

    // DEBUG (ถ้ายังสงสัย)
    console.log(csvContent);

    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;

    // ชื่อไฟล์อ่านง่าย
    link.download = `ctar_session_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, '-')}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}