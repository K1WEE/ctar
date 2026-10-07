import { Injectable, signal, effect, NgZone } from '@angular/core';
import { BleService } from './ble.service';

export interface DataPoint {
  timestamp: number;
  timeLabel: string;
  thaiTime: string;
  force: number;
}

export interface SessionSnapshot {
  readonly id: string;
  readonly rawData: ReadonlyArray<DataPoint>;
  readonly durationSeconds: number;
  readonly reps: number;
  readonly maxForce: number;
  readonly avgForce: number;
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
  return Math.round(this.recordedDurationMs / 1000);
}

  /** Keep live force available, but exclude decision time from the training result. */
  public setSessionPaused(paused: boolean): void {
    if (this.sessionPaused === paused) return;
    this.sessionPaused = paused;
    this.lastRecordedAt = null;
  }

  private sessionPaused = false;
  private lastRecordedAt: number | null = null;
  private recordedDurationMs = 0;

  private dataHistory: DataPoint[] = [];
  private sessionStartTime: number = 0;
  private sessionId = this.createSessionId();
  private finalizedSnapshot: SessionSnapshot | null = null;
  private sessionSnapshotSaved = false;
  private readonly SESSION_SAVED_STORAGE_PREFIX = 'ctar_session_snapshot_saved:';

  constructor(private bleService: BleService, private ngZone: NgZone) {

    // Preserve session and calibration during temporary BLE dropouts / reconnects
    effect(() => {
      const state = this.bleService.connectionState();
      if (state === 'Disconnected') {
        // Drop instantaneous live force to 0 for UI safety, but preserve session history & calibration
        this.currentForce.set(0);
      } else if (state === 'Connected') {
        // Only start session timer if it hasn't started yet
        if (this.sessionStartTime === 0) {
          this.sessionStartTime = Date.now();
        }
      }
    }, { allowSignalWrites: true });

    // รับค่า force จาก BLE
    this.bleService.onDataReceived = (force: number) => {
      this.ngZone.run(() => this.processForce(force));
    };
  }

  public resetSession() {
    this.sessionPaused = false;
    this.lastRecordedAt = null;
    this.recordedDurationMs = 0;
    this.sessionId = this.createSessionId();
    this.finalizedSnapshot = null;
    this.sessionSnapshotSaved = false;
    this.currentForce.set(0);
    this.peakForce.set(0);
    this.repCount.set(0);
    this.dataHistory = [];
    this.sessionStartTime = Date.now();
  }

  /**
   * Captures one stable view of the completed session for comparison and
   * persistence. A repeated summary navigation receives the same snapshot,
   * even if a BLE callback arrives while the page is loading.
   */
  public getSessionSnapshot(): SessionSnapshot {
    if (this.finalizedSnapshot) return this.finalizedSnapshot;

    const rawData = Object.freeze(
      this.dataHistory.map((dataPoint) => Object.freeze({ ...dataPoint }))
    );
    const avgForce = rawData.length > 0
      ? rawData.reduce((total, dataPoint) => total + dataPoint.force, 0) / rawData.length
      : 0;

    this.finalizedSnapshot = Object.freeze({
      id: this.sessionId,
      rawData,
      durationSeconds: this.getSessionDurationSeconds(),
      reps: this.repCount(),
      maxForce: this.peakForce(),
      avgForce
    });

    return this.finalizedSnapshot;
  }

  /**
   * Kept as a compatibility alias for callers that used the original API.
   */
  public finalizeSession(): SessionSnapshot {
    return this.getSessionSnapshot();
  }

  /**
   * Marks the immutable snapshot as persisted. This is intentionally called
   * only after the uploader reports success, including an offline queue write.
   */
  public markSessionFinalized(): void {
    this.sessionSnapshotSaved = true;

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          `${this.SESSION_SAVED_STORAGE_PREFIX}${this.sessionId}`,
          'true'
        );
      }
    } catch {
      // In-memory state still protects this app lifecycle if storage is unavailable.
    }
  }

  public hasSessionSnapshotSaved(): boolean {
    if (this.sessionSnapshotSaved) return true;

    try {
      if (typeof sessionStorage !== 'undefined') {
        this.sessionSnapshotSaved = sessionStorage.getItem(
          `${this.SESSION_SAVED_STORAGE_PREFIX}${this.sessionId}`
        ) === 'true';
      }
    } catch {
      // Session storage is an optimization; the in-memory state is authoritative.
    }

    return this.sessionSnapshotSaved;
  }

  private createSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private processForce(force: number) {

    // กัน sessionStartTime = 0
    if (this.sessionStartTime === 0) {
      this.sessionStartTime = Date.now();
    }

    this.currentForce.set(force);
    if (this.sessionPaused) return;

    // peak
    if (force > this.peakForce()) {
      this.peakForce.set(force);
    }

    const now = Date.now();
    if (this.lastRecordedAt !== null) this.recordedDurationMs += now - this.lastRecordedAt;
    this.lastRecordedAt = now;

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

    // สำคัญ: กัน Excel อ่านเพี้ยน
    const BOM = '\uFEFF';

    let csvContent = 'DateTime(TH),Time(s),Force\n';

    this.dataHistory.forEach(dp => {
      csvContent += `"${dp.thaiTime}",${dp.timeLabel},${dp.force}\n`;
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
