import { Injectable, signal, effect, NgZone } from '@angular/core';
import { BleService, ConnectionState } from './ble.service';

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

  public debugMockData() {
  this.resetSession();

  // จำลอง force 10 ค่า
  for (let i = 0; i < 10; i++) {
    const fakeForce = Math.random() * 60;
    this.processForce(fakeForce);
  }

  console.log(this.dataHistory); // ดูใน console
}
  
  // Need to provide the stream to the chart component. A signal of the latest datapoint is the easiest approach for Chart.js updates!
  public latestDataPoint = signal<DataPoint | null>(null);

  private readonly REP_THRESHOLD = 40;
  private readonly REP_DROP_THRESHOLD = 20;
  private isInRep = false;
  
  private dataHistory: DataPoint[] = [];
  private sessionStartTime: number = 0;

  constructor(private bleService: BleService, private ngZone: NgZone) {
    // Reset state upon successful connection
    effect(() => {
      const state = this.bleService.connectionState();
      if (state === 'Connected') {
        this.resetSession();
      }
    });

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
    this.currentForce.set(force);

    // Peak calculation
    if (force > this.peakForce()) {
      this.peakForce.set(force);
    }

    // Repetition logic
    if (force > this.REP_THRESHOLD && !this.isInRep) {
      this.isInRep = true;
    } else if (force < this.REP_DROP_THRESHOLD && this.isInRep) {
      this.isInRep = false;
      this.repCount.update(count => count + 1);
    }

    // Timestamp for plotting and export
    const now = Date.now();
    const elapsedTimeText = ((now - this.sessionStartTime) / 1000).toFixed(1) + 's';


    const thaiTime = new Date(now)
      .toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })
      .replace(',', '');
    
    const dp: DataPoint = {
      timestamp: now,
      timeLabel: elapsedTimeText, 
      thaiTime: thaiTime,         
      force: force
    };

    this.dataHistory.push(dp);
    this.latestDataPoint.set(dp);
  }

  public exportCsv() {
    if (this.dataHistory.length === 0) return;

    let csvContent = 'Timestamp,DateTime(TH),Time(s),Force\n';
    this.dataHistory.forEach(dp => {
      csvContent +=  `${dp.timestamp},${dp.thaiTime},${dp.timeLabel},${dp.force}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ctar_session_${new Date().toISOString()}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
