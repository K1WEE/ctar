// THROWAWAY: Three structures on /patient-portal?variant=A|B|C.
// Question: can patients identify today's record and their next action immediately?
import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../../../services/i18n.service';
import { BleService } from '../../../services/ble.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-prototype.component.html',
  styleUrls: ['./portal-prototype.component.css'],
})
export class PortalPrototypeComponent {
  i18n = inject(I18nService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  ble = inject(BleService);
  variant = signal('A');
  stage = signal(0);
  recorded = signal(false);
  data = signal('normal');
  missionState = signal('zero');
  pending = signal(false);
  ranking = signal(false);
  names = ['A', 'B', 'C'];
  constructor() {
    this.route.queryParamMap.subscribe(p => {
      const v = p.get('variant') || 'A';
      this.variant.set(this.names.includes(v) ? v : 'A');
    });
  }
  t(th: string, en: string) { return this.i18n.currentLang() === 'th' ? th : en; }
  name() { return this.variant() === 'A' ? this.t('วันนี้มาก่อน', 'Today first') : this.variant() === 'B' ? this.t('ขั้นตอนพร้อมฝึก', 'Guided preparation') : this.t('สรุปกระชับ', 'Compact overview'); }
  nextLabel() { return [this.t('เชื่อมต่ออุปกรณ์', 'Connect device'), this.t('วัดแรงกดตั้งต้น', 'Calibrate baseline'), this.t('เริ่มฝึก', 'Start practice')][this.stage()]; }
  deviceLabel() { return [this.t('ยังไม่ได้เชื่อมต่ออุปกรณ์', 'Device disconnected'), this.t('เชื่อมต่อแล้ว · ยังไม่ได้วัดแรงกด', 'Connected · calibration needed'), this.t('อุปกรณ์พร้อมฝึก', 'Device ready')][this.stage()]; }
  guidance() { return [this.t('เชื่อมต่ออุปกรณ์เพื่อเตรียมฝึกวันนี้', 'Connect your device to prepare for today’s practice.'), this.t('วัดแรงกดตั้งต้นก่อนเริ่มฝึก', 'Calibrate your baseline before starting practice.'), this.t('อุปกรณ์พร้อมแล้ว เริ่มฝึกได้เมื่อคุณพร้อม', 'Your device is ready. Start when you are ready.')][this.stage()]; }
  setHistory(value: string) { this.data.set(value); if (value === 'empty') this.recorded.set(false); }
  action() {
    if (this.stage() < 2) this.setStage(this.stage() + 1);
    else { this.recorded.set(true); this.data.set('normal'); }
  }
  setStage(value: number) {
    this.stage.set(value);
    (this.ble.connectionState as any).set(value ? 'Connected' : 'Disconnected');
  }
  switch(delta: number) {
    const index = (this.names.indexOf(this.variant()) + delta + 3) % 3;
    this.router.navigate([], { queryParams: { variant: this.names[index] }, queryParamsHandling: 'merge', replaceUrl: true });
  }
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    if (e.altKey || e.ctrlKey || e.metaKey || el.closest('input,textarea,select,[contenteditable],[role="dialog"]')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); this.switch(e.key === 'ArrowLeft' ? -1 : 1); }
  }
  days() {
    const today = new Date(); const offset = (today.getDay() + 6) % 7;
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - offset + i);
      return { date: d.getDate(), label: this.i18n.currentLang() === 'th' ? ['จ','อ','พ','พฤ','ศ','ส','อา'][i] : ['M','T','W','T','F','S','S'][i], today: i === offset, done: i === offset ? this.recorded() : this.data() !== 'empty' && i === offset - 2 };
    });
  }
  tasks() {
    if (this.missionState() === 'empty') return [];
    const progress = this.missionState() === 'full' ? [3,4,10] : this.missionState() === 'partial' ? [1,4,6] : [0,0,0];
    return [
      {title: this.t('นักฝึกต่อเนื่อง', 'Consistent practice'), detail: this.t('ฝึกให้ครบ 3 วัน', 'Practice on 3 days'), target:3, progress:progress[0], reward:5, icon:'fa-fire'},
      {title: this.t('สะสมรอบฝึก', 'Practice sessions'), detail: this.t('ฝึกให้ครบ 4 รอบ', 'Record 4 sessions'), target:4, progress:progress[1], reward:10, icon:'fa-dumbbell'},
      {title: this.t('สะสมเวลาฝึก', 'Practice time'), detail: this.t('สะสมเวลาฝึก 10 นาที', 'Record 10 minutes'), target:10, progress:progress[2], reward:10, icon:'fa-clock'},
    ];
  }
  completed() { return this.tasks().filter(t => t.progress >= t.target).length; }
  percent() { return this.tasks().length ? this.completed() / this.tasks().length * 100 : 0; }
}
