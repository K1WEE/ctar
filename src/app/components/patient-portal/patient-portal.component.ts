import { BatteryStatusComponent } from '../battery-status/battery-status.component';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { DataSyncService } from '../../services/data-sync.service';
import { I18nService } from '../../services/i18n.service';
import { BleService } from '../../services/ble.service';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { RewardTasksComponent } from '../reward-task/reward-task.component';
import { NavbarService } from '../../services/navbar.service';

interface SessionRecord {
  session_date: string;
  max_force: number;
  reps: number;
  duration_seconds: number;
}

@Component({
  selector: 'app-patient-portal',
  standalone: true,
  imports: [CommonModule, BatteryStatusComponent, RouterLink, RewardTasksComponent],
  templateUrl: './patient-portal.component.html',

})
export class PatientPortalComponent implements OnInit, OnDestroy {
  public patientName = signal<string>('');
  public lastSession = signal<SessionRecord | null>(null);
  public isLoading = signal(true);
  public loadError = signal(false);
  public sessionsList = signal<SessionRecord[]>([]);

  public i18n = inject(I18nService);
  public bleService = inject(BleService);
  public ctar = inject(CtarLogicService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  public dataSync = inject(DataSyncService);
  private navbar = inject(NavbarService);
  private releaseHomeLogout = this.navbar.registerHomeLogout(() => void this.logout());

  // Compute weekly streak days (Monday to Sunday) based on language and user sessions
  public weekDays = computed(() => {
    const sessions = this.sessionsList();
    const lang = this.i18n.currentLang();
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const dayIndex = currentDay === 0 ? 7 : currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayIndex - 1));
    monday.setHours(0, 0, 0, 0);

    const weekDaysList: any[] = [];
    const dayLabelsTH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    const dayLabelsEN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);

      const completed = sessions.some(s => {
        const sDate = new Date(s.session_date);
        return sDate.getFullYear() === dayDate.getFullYear() &&
          sDate.getMonth() === dayDate.getMonth() &&
          sDate.getDate() === dayDate.getDate();
      });

      const label = lang === 'th' ? dayLabelsTH[i] : dayLabelsEN[i];

      const isToday = dayDate.getFullYear() === today.getFullYear() &&
        dayDate.getMonth() === today.getMonth() &&
        dayDate.getDate() === today.getDate();

      weekDaysList.push({
        date: dayDate,
        completed,
        label,
        dayName: isToday ? (lang === 'th' ? 'วันนี้' : 'Today') : ''
      });
    }

    return weekDaysList;
  });

  getPlayButtonText(): string {
    const isConnected = this.bleService.connectionState() === 'Connected';
    const isCalibrated = this.ctar.calibrationMaxForce() > 0;
    const lang = this.i18n.currentLang();

    if (!isConnected) {
      return lang === 'th' ? 'เชื่อมต่ออุปกรณ์' : 'Connect Device';
    } else if (!isCalibrated) {
      return lang === 'th' ? 'วัดแรงกดตั้งต้น (Calibrate)' : 'Calibrate Baseline';
    } else {
      return lang === 'th' ? 'เริ่มฝึกซ้อม (Start Game)' : 'Start Game';
    }
  }

  // Link, label and icon must derive from the same state checks — a button
  // that says "Connect Device" but routes to /game strands the user in a
  // game waiting for a device that isn't there.
  getPlayButtonLink(): string {
    // /calibrate handles device connection itself, so an unconnected user
    // goes there too — there is no separate /connect step.
    if (this.bleService.connectionState() !== 'Connected' || !this.isCalibrated()) {
      return '/calibrate';
    }
    return '/game';
  }

  getPlayButtonIcon(): string {
    if (this.bleService.connectionState() !== 'Connected') {
      return 'fa-link';
    }
    if (!this.isCalibrated()) {
      return 'fa-gauge-high';
    }
    return 'fa-play-circle';
  }

  isCalibrated(): boolean {
    return this.ctar.calibrationMaxForce() > 0;
  }

  formatDuration(totalSeconds: number): string {
    const lang = this.i18n.currentLang();
    const seconds = Math.round(totalSeconds || 0);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) {
      return lang === 'th' ? `${secs} วิ` : `${secs}s`;
    }
    return lang === 'th' ? `${mins} นาที ${secs} วิ` : `${mins}m ${secs}s`;
  }

  getDayAria(day: { label: string; completed: boolean; dayName: string }): string {
    const lang = this.i18n.currentLang();
    const dayPart = day.dayName || day.label;
    if (lang === 'th') {
      return `${dayPart} ${day.completed ? 'ฝึกแล้ว' : 'ยังไม่ได้ฝึก'}`;
    }
    return `${dayPart}: ${day.completed ? 'trained' : 'not trained yet'}`;
  }

  getWeeklyStreakMessage(): string {
    const lang = this.i18n.currentLang();
    const completedCount = this.weekDays().filter(d => d.completed).length;

    if (completedCount === 0) {
      return lang === 'th'
        ? 'เริ่มต้นการฝึกซ้อมครั้งแรกในสัปดาห์นี้เลย! ทุกก้าวเล็กๆ มีความหมาย'
        : 'Start your first training session of the week! Every small step counts';
    }

    if (completedCount >= 7) {
      return lang === 'th'
        ? 'มหัศจรรย์มาก! คุณฝึกครบถ้วนในสัปดาห์นี้ รักษาสุขภาพกล้ามเนื้ออย่างสมบูรณ์แบบ!'
        : 'Amazing! You trained every single day this week. Perfect dedication!';
    }

    return lang === 'th'
      ? `สัปดาห์นี้คุณฝึกสำเร็จแล้ว ${completedCount} วัน! ทำต่อไปเพื่อสุขภาพที่ดีนะ`
      : `You've completed ${completedCount} days of training this week! Keep it up for your health`;
  }

  async ngOnInit() {
    const user = this.supabase.currentUser();
    if (user) {
      try {
        const { data } = await this.supabase.client.from('patients').select('first_name').eq('id', user.id).single();
        if (data) this.patientName.set(data.first_name);

        // Recent sessions are enough for the weekly streak + latest stats
        const sessions = await this.dataSync.fetchPatientSessions(user.id, 50);
        this.sessionsList.set(sessions || []);

        if (sessions && sessions.length > 0) {
          this.lastSession.set(sessions[0]);
        } else {
          this.lastSession.set(null);
        }
      } catch (e) {
        console.error(e);
        this.loadError.set(true);
        this.sessionsList.set([]);
        this.lastSession.set(null);
      }
    }
    this.isLoading.set(false);
  }

  scrollToTasks() {
    document.getElementById('weekly-tasks-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  async logout() {
    // Guard against accidental taps — on mobile the header logout is icon-only
    const message = this.i18n.currentLang() === 'th'
      ? 'ต้องการออกจากระบบใช่หรือไม่?'
      : 'Do you want to log out?';
    if (!window.confirm(message)) return;

    await this.supabase.client.auth.signOut();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.releaseHomeLogout();
  }
}
