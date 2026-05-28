import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SupabaseService } from '../../services/supabase.service';
import { DataSyncService } from '../../services/data-sync.service';
import { I18nService } from '../../services/i18n.service';
import { BleService } from '../../services/ble.service';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { RewardTasksComponent } from '../reward-task/reward-task.component';

@Component({
  selector: 'app-patient-portal',
  standalone: true,
  imports: [CommonModule, HeaderComponent, RouterLink, RewardTasksComponent],
  template: `
    <div class="min-h-screen pb-10 relative z-10 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div class="max-w-md md:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        <div class="mb-6 block w-full">
           <app-header [connectionState]="bleService.connectionState" (onLogout)="logout()"></app-header>
        </div>

        <main class="animate-fade-in space-y-6">
          
          <!-- Hero Welcome & Quick Start Combined Card -->
          <div class="bg-gradient-to-br from-indigo-600 via-indigo-650 to-blue-600 rounded-3xl p-8 shadow-xl shadow-indigo-500/25 text-white relative overflow-hidden group">
            <!-- Glowing background elements -->
            <div class="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-400/20 rounded-full blur-[90px] pointer-events-none"></div>
            <div class="absolute -bottom-10 -right-10 opacity-15 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <i class="fa-solid fa-gamepad text-9xl"></i>
            </div>

            <!-- Layout Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center relative z-10">
              <!-- Welcome Text (spans 3 columns on large screens) -->
              <div class="lg:col-span-3 space-y-2.5">
                <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {{ i18n.currentLang() === 'th' ? 'สวัสดี,' : 'Hello,' }} {{ patientName() || '...' }} 👋
                </h2>
                <p class="text-indigo-100 text-base sm:text-lg font-medium max-w-lg leading-relaxed">
                  {{ i18n.currentLang() === 'th' ? 'พร้อมที่จะเริ่มฝึกกล้ามเนื้อการกลืนของคุณหรือยัง?' : 'Ready to train your swallowing muscles today?' }}
                </p>
                
                <!-- Device connection status badge -->
                <div class="pt-1.5">
                  <span 
                    [class]="bleService.connectionState() === 'Connected' 
                      ? 'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 shadow-sm' 
                      : 'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 text-indigo-100 shadow-sm'"
                  >
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" [class.bg-emerald-400]="bleService.connectionState() === 'Connected'" [class.bg-white]="bleService.connectionState() !== 'Connected'"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2" [class.bg-emerald-500]="bleService.connectionState() === 'Connected'" [class.bg-white]="bleService.connectionState() !== 'Connected'"></span>
                    </span>
                    {{ bleService.connectionState() === 'Connected' 
                      ? (i18n.currentLang() === 'th' ? 'เชื่อมต่ออุปกรณ์แล้ว' : 'Device Connected') 
                      : (i18n.currentLang() === 'th' ? 'ยังไม่ได้เชื่อมต่ออุปกรณ์' : 'Device Disconnected') }}
                  </span>
                </div>
              </div>

              <!-- Action Button Container (spans 2 columns on large screens) -->
              <div class="lg:col-span-2 flex flex-col w-full">
                <button 
                  [routerLink]="getPlayButtonLink()"
                  class="relative w-full min-h-[58px] bg-white text-indigo-600 hover:bg-slate-50 font-extrabold text-lg rounded-2xl transition-all duration-300 shadow-xl flex items-center justify-center transform hover:scale-[1.01] active:scale-[0.99]">
                  <i class="fa-solid mr-2 text-xl" [ngClass]="isCalibrated() ? 'fa-play-circle' : 'fa-link'"></i>
                  {{ getPlayButtonText() }}
                </button>
                
                <button 
                  *ngIf="isCalibrated()"
                  routerLink="/calibrate"
                  class="mt-3 w-full min-h-[44px] bg-indigo-500/20 hover:bg-indigo-500/35 text-white font-semibold text-sm rounded-xl border border-indigo-400/30 transition-all duration-300 flex items-center justify-center transform hover:scale-[1.01] active:scale-[0.99]">
                  <i class="fa-solid fa-gauge-high mr-2"></i>
                  {{ i18n.currentLang() === 'th' ? 'ปรับค่าแรงกดใหม่ (Recalibrate)' : 'Recalibrate Force' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Grid: Streak Tracker and Weekly Tasks side by side -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- Weekly Streak / Consistency Tracker -->
            <div class="bg-white/80 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-full">
              <div class="absolute -bottom-16 -left-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
              <div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <i class="fa-solid fa-calendar-check text-emerald-500 mr-2.5 text-xl"></i>
                  {{ i18n.currentLang() === 'th' ? 'การฝึกซ้อมในสัปดาห์นี้' : 'Your Training This Week' }}
                </h3>
                
                <div class="flex justify-between items-center gap-2 py-2 relative z-10">
                  <div *ngFor="let day of weekDays()" class="flex flex-col items-center flex-1">
                    <!-- Circular Indicator -->
                    <div 
                      [class]="day.completed 
                        ? 'w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 font-bold border-2 border-emerald-400 relative transition-transform duration-300 hover:scale-110' 
                        : 'w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 flex items-center justify-center font-semibold transition-colors'"
                    >
                      <i *ngIf="day.completed" class="fa-solid fa-check text-xs sm:text-sm"></i>
                      <span *ngIf="!day.completed" class="text-xs">{{ day.label }}</span>
                    </div>
                    
                    <!-- Day label bottom -->
                    <span 
                      class="text-2xs sm:text-xs mt-2 font-medium text-slate-500 dark:text-slate-400 transition-colors" 
                      [class.text-emerald-500]="day.dayName !== ''" 
                      [class.font-extrabold]="day.dayName !== ''"
                    >
                      {{ day.dayName || day.label }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Stats Row -->
              <div *ngIf="lastSession()" class="mt-6 pt-5 border-t border-slate-150 dark:border-white/5 relative z-10">
                <div class="grid grid-cols-3 gap-3">
                  <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 p-3 rounded-2xl text-center shadow-sm">
                    <span class="text-slate-400 dark:text-slate-500 font-extrabold text-[10px] uppercase tracking-wider block mb-1">
                      {{ i18n.currentLang() === 'th' ? 'แรงกดล่าสุด' : 'Latest Force' }}
                    </span>
                    <span class="text-base sm:text-lg font-black text-emerald-500 block">
                      {{ lastSession().max_force | number:'1.0-1' }}N
                    </span>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 p-3 rounded-2xl text-center shadow-sm">
                    <span class="text-slate-400 dark:text-slate-500 font-extrabold text-[10px] uppercase tracking-wider block mb-1">
                      {{ i18n.currentLang() === 'th' ? 'รอบล่าสุด' : 'Latest Reps' }}
                    </span>
                    <span class="text-base sm:text-lg font-black text-amber-500 block">
                      {{ lastSession().reps }} {{ i18n.currentLang() === 'th' ? 'ครั้ง' : 'reps' }}
                    </span>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 p-3 rounded-2xl text-center shadow-sm">
                    <span class="text-slate-400 dark:text-slate-500 font-extrabold text-[10px] uppercase tracking-wider block mb-1">
                      {{ i18n.currentLang() === 'th' ? 'เวลารวม' : 'Duration' }}
                    </span>
                    <span class="text-base sm:text-lg font-black text-sky-500 block">
                      {{ lastSession().duration_seconds }}s
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Motivating message at the bottom -->
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-4 text-center relative z-10 font-medium">
                {{ getWeeklyStreakMessage() }}
              </p>

              <!-- Mobile scroll navigation helper -->
              <div class="md:hidden mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-center relative z-10">
                <button
                  (click)="scrollToTasks()"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all duration-200"
                >
                  <span>{{ i18n.currentLang() === 'th' ? 'ดูภารกิจประจำสัปดาห์ของคุณ' : 'View your weekly tasks' }}</span>
                  <i class="fa-solid fa-arrow-down animate-bounce text-sm"></i>
                </button>
              </div>
            </div>

            <!-- Weekly Tasks Component in the right column -->
            <app-reward-tasks id="weekly-tasks-card" class="h-full block"></app-reward-tasks>

          </div>
        </main>
      </div>
    </div>
  `
})
export class PatientPortalComponent implements OnInit {
  public patientName = signal<string>('');
  public lastSession = signal<any>(null);
  public isLoading = signal(true);
  public sessionsList = signal<any[]>([]);

  public i18n = inject(I18nService);
  public bleService = inject(BleService);
  public ctar = inject(CtarLogicService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private dataSync = inject(DataSyncService);

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

  // Calculate percentage improvement in force from the minimum historical session force to latest
  public growthPercentage = computed(() => {
    const sessions = this.sessionsList();
    if (sessions.length < 2) return 0;
    
    const last = sessions[0];
    
    // Find the minimum max_force among all sessions in database
    const forces = sessions.map(s => s.max_force).filter(f => f > 0);
    if (forces.length === 0) return 0;
    const minForce = Math.min(...forces);
    
    if (minForce <= 0) return 0;
    return ((last.max_force - minForce) / minForce) * 100;
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

  getPlayButtonLink(): string {
    const isCalibrated = this.ctar.calibrationMaxForce() > 0;

    if (!isCalibrated) {
      return '/calibrate';
    } else {
      return '/game';
    }
  }

  isCalibrated(): boolean {
    return this.bleService.connectionState() === 'Connected' && this.ctar.calibrationMaxForce() > 0;
  }

  getWeeklyStreakMessage(): string {
    const lang = this.i18n.currentLang();
    const completedCount = this.weekDays().filter(d => d.completed).length;

    if (completedCount === 0) {
      return lang === 'th' 
        ? 'เริ่มต้นการฝึกซ้อมครั้งแรกในสัปดาห์นี้เลย! ทุกก้าวเล็กๆ มีความหมาย 💪'
        : 'Start your first training session of the week! Every small step counts 💪';
    }

    if (completedCount >= 7) {
      return lang === 'th'
        ? 'มหัศจรรย์มาก! คุณฝึกครบถ้วนในสัปดาห์นี้ รักษาสุขภาพกล้ามเนื้ออย่างสมบูรณ์แบบ! 🎉'
        : 'Amazing! You trained every single day this week. Perfect dedication! 🎉';
    }

    return lang === 'th'
      ? `สัปดาห์นี้คุณฝึกสำเร็จแล้ว ${completedCount} วัน! ทำต่อไปเพื่อสุขภาพที่ดีนะคุณตาคุณยาย ❤️`
      : `You've completed ${completedCount} days of training this week! Keep it up for your health ❤️`;
  }

  getGrowthMotivationalMessage(): string {
    const lang = this.i18n.currentLang();
    const pct = this.growthPercentage();
    const sessions = this.sessionsList();

    if (sessions.length < 2) {
      return lang === 'th'
        ? 'นี่คือเซสชันแรกของคุณ ยอดเยี่ยมมากครับ! มาตั้งเป้าเพิ่มความแข็งแรงในครั้งถัดไปกัน!'
        : 'This is your baseline session, great job! Let\'s aim for progress in the next one!';
    }

    if (pct > 0) {
      return lang === 'th'
        ? `แรงกดดีขึ้น ${pct.toFixed(1)}% จากครั้งที่แรงน้อยที่สุด! ร่างกายพัฒนาขึ้นเรื่อยๆ ครับ!`
        : `Press force improved by ${pct.toFixed(1)}% from your lowest recorded session! Making progress!`;
    } else {
      return lang === 'th'
        ? 'รักษาระดับการฝึกฝนไว้นะครับ ร่างกายอาจมีล้าบ้าง แต่ทำต่อไปได้ผลดีแน่นอน!'
        : 'Maintain your training rhythm! Fatigue happens, but consistency will yield results!';
    }
  }

  async ngOnInit() {
    const user = this.supabase.currentUser();
    if (user) {
      try {
        const { data } = await this.supabase.client.from('patients').select('first_name').eq('id', user.id).single();
        if (data) this.patientName.set(data.first_name);
        
        // Fetch all patient sessions
        const sessions = await this.dataSync.fetchPatientSessions(user.id);
        this.sessionsList.set(sessions || []);
        
        if (sessions && sessions.length > 0) {
          this.lastSession.set(sessions[0]);
        } else {
          this.lastSession.set(null);
        }
      } catch(e) {
        console.error(e);
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
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/login']);
  }
}
