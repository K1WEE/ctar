import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BiofeedbackService {
  private audioCtx: AudioContext | null = null;
  private vibrationInterval: any = null;
  public feedbackVolumeMultiplier = 1.0;

  private initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Plays a clean tone using Web Audio API oscillators.
   */
  playTone(freq: number, type: OscillatorType, durationMs: number, volume: number = 0.08) {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.value = freq;

      const now = this.audioCtx.currentTime;
      gainNode.gain.setValueAtTime(volume * this.feedbackVolumeMultiplier, now);
      // Smooth exponential decay to avoid clicking noises
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + durationMs / 1000);
    } catch (e) {
      console.warn('Audio feedback failed to play:', e);
    }
  }

  /**
   * Sound indicating the user has successfully entered the target zone.
   */
  playEnterZone() {
    // 523.25 Hz is C5, sine wave is pleasant and clean
    this.playTone(523.25, 'sine', 150, 0.1);
    this.vibrate(80);
  }

  /**
   * Sound indicating the user dropped out of the target zone prematurely.
   */
  playExitZone() {
    // 180 Hz triangle wave gives a gentle low warning buzz
    this.playTone(180, 'triangle', 200, 0.12);
    this.vibrate(250);
  }

  /**
   * Ascending arpeggio chime for successfully completing a repetition.
   */
  playSuccess() {
    this.stopVibrationLoop();
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // Ascending C Major Triad (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx!.createOscillator();
        const gainNode = this.audioCtx!.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = now + idx * 0.08;
        gainNode.gain.setValueAtTime(0.08 * this.feedbackVolumeMultiplier, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx!.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });

      // Celebratory haptic pattern: double short pulse, then hold
      this.vibrate([80, 50, 80, 50, 200]);
    } catch (e) {
      console.warn('Success arpeggio play failed:', e);
    }
  }

  /**
   * Intermediate sound played when the target hold time is met,
   * signaling the user to release all force.
   */
  playHoldComplete() {
    this.stopVibrationLoop();
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      // Double beep tone: E5 (659.25Hz) then A5 (880.00Hz)
      this.playTone(659.25, 'sine', 100, 0.08);
      setTimeout(() => {
        this.playTone(880.00, 'sine', 100, 0.08);
      }, 120);

      // Light haptic prompt
      this.vibrate([60, 40, 60]);
    } catch (e) {
      console.warn('Hold complete sound play failed:', e);
    }
  }

  /**
   * Safe wrapper for navigator.vibrate
   */
  vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignored if user gesture requirements are not met yet
      }
    }
  }

  /**
   * Starts a repetitive light haptic vibration pulse while the user holds.
   * Simulates active effort/tick feedback.
   */
  startVibrationLoop() {
    this.stopVibrationLoop();
    // Vibrate 40ms every 300ms
    this.vibrationInterval = setInterval(() => {
      this.vibrate(40);
    }, 300);
  }

  /**
   * Stops any ongoing holding vibration loops.
   */
  stopVibrationLoop() {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
  }
}
