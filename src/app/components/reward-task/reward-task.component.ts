import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { TaskService } from '../../services/task.service';
import { I18nService } from '../../services/i18n.service';

interface RewardTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  first_name: string;
  last_name: string;
  stars: number;
  isMe: boolean;
}

@Component({
  selector: 'app-reward-tasks',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl h-full flex flex-col justify-between">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">

      <div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white">
          ภารกิจประจำสัปดาห์
        </h2>

        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">
          ฝึกฝนอย่างต่อเนื่องเพื่อรับดาว ⭐
        </p>
      </div>

      <div class="flex items-center gap-2">

        <!-- Stars badge -->
        <div class="flex items-center gap-2 bg-yellow-400/20 text-yellow-500 px-4 py-2 rounded-2xl">
          <i class="fa-solid fa-star"></i>
          <span class="font-bold">{{ totalStars }}</span>
        </div>

        <!-- Leaderboard button -->
        <button
          (click)="openLeaderboard()"
          class="w-10 h-10 rounded-2xl border border-slate-200 dark:border-white/10
                 bg-white/50 dark:bg-white/5 flex items-center justify-center
                 text-slate-400 hover:text-yellow-400 hover:border-yellow-400/30
                 transition-all duration-200"
          aria-label="ดูอันดับผู้เล่น">
          <i class="fa-solid fa-trophy"></i>
        </button>

      </div>

    </div>

    <!-- Weekly Overall Progress Card -->
    <div class="mb-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10 border border-emerald-500/25 dark:border-emerald-500/15 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute -top-12 -right-12 w-24 h-24 bg-teal-400/20 rounded-full blur-xl pointer-events-none"></div>
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 relative z-10">
        <div>
          <span class="text-2xs sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
            {{ i18n.currentLang() === 'th' ? 'ภาพรวมความก้าวหน้า' : 'Overall Progress' }}
          </span>
          <h3 class="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
            {{ i18n.currentLang() === 'th' ? 'พัฒนาการสัปดาห์นี้:' : 'Weekly Progress:' }} <span class="text-emerald-500">{{ weeklyCompletionRate }}%</span>
          </h3>
        </div>
        <div class="text-slate-500 dark:text-slate-400 text-xs font-medium bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-3 py-1 rounded-full self-start sm:self-auto shadow-sm">
          {{ tasks.length }} {{ i18n.currentLang() === 'th' ? 'ภารกิจที่ต้องทำ' : 'tasks active' }}
        </div>
      </div>
      
      <!-- Big Progress Bar -->
      <div class="w-full h-3 rounded-full bg-slate-200/70 dark:bg-slate-700/50 overflow-hidden relative z-10 shadow-inner">
        <div
          class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 ease-out"
          [style.width.%]="weeklyCompletionRate">
        </div>
      </div>
      
      <!-- Motivation Message -->
      <p class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-emerald-300/90 mt-3 sm:mt-4 flex items-center gap-2 relative z-10">
        <i class="fa-solid fa-circle-check text-emerald-500 animate-pulse text-sm sm:text-base"></i>
        <span>{{ getWeeklyProgressMessage() }}</span>
      </p>
    </div>

    <!-- Tasks Carousel -->
    <div class="relative z-10 select-none">
      <div *ngIf="tasks.length > 0; else noTasks"
           (touchstart)="onTouchStart($event)"
           (touchend)="onTouchEnd($event)"
           class="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/5 transition-all duration-300 min-h-[145px] flex flex-col justify-between cursor-grab active:cursor-grabbing shadow-sm overflow-hidden">
        
        <div *ngFor="let task of tasks; let i = index">
          <div *ngIf="i === currentTaskIndex" class="animate-fade-in flex items-start gap-4">
            
            <!-- Icon -->
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              [class]="task.completed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-indigo-500/20 text-indigo-400'">
              <i class="fa-solid text-xl" [class]="task.icon"></i>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-base text-slate-800 dark:text-white truncate">
                  {{ task.title }}
                </h3>
                <span *ngIf="task.completed" class="text-emerald-500 text-sm">
                  <i class="fa-solid fa-circle-check"></i>
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {{ task.description }}
              </p>

              <!-- Progress Bar -->
              <div class="mt-4">
                <div class="w-full h-2 rounded-full bg-slate-200/70 dark:bg-slate-700/50 overflow-hidden shadow-inner">
                  <div
                    class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    [style.width.%]="(task.progress / task.target) * 100">
                  </div>
                </div>
                <div class="flex justify-between text-xs mt-2 text-slate-500 dark:text-slate-400 font-semibold">
                  <span>{{ task.progress }} / {{ task.target }}</span>
                  <span class="text-yellow-500 flex items-center gap-1">
                    <span>⭐</span>
                    <span>{{ task.reward }}</span>
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      <ng-template #noTasks>
        <div class="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200 dark:border-white/5 text-center text-slate-400">
          <i class="fa-solid fa-clipboard-list text-2xl mb-2 opacity-50"></i>
          <p class="text-sm">ไม่มีภารกิจในขณะนี้</p>
        </div>
      </ng-template>

      <!-- Carousel Indicator Dots -->
      <div *ngIf="tasks.length > 1" class="flex justify-center gap-2 mt-4">
        <button
          *ngFor="let task of tasks; let i = index"
          (click)="setTaskIndex(i)"
          class="w-2.5 h-2.5 rounded-full transition-all duration-300 hover:scale-125 focus:outline-none"
          [class]="i === currentTaskIndex ? 'bg-emerald-500 w-5' : 'bg-slate-300 dark:bg-slate-600'"
          [attr.aria-label]="'ไปยังภารกิจที่ ' + (i + 1)">
        </button>
      </div>

    </div>

  </div>

  <!-- ===================== Leaderboard Modal ===================== -->
<div
  *ngIf="showLeaderboard"
  class="fixed inset-0 z-50 flex items-center justify-center
         bg-black/50 backdrop-blur-sm p-4"
  (click)="showLeaderboard = false">

  <div
    class="bg-white dark:bg-brand-card
           rounded-[2rem]
           w-full max-w-md
           overflow-hidden
           shadow-2xl"
    (click)="$event.stopPropagation()">

    <!-- ===================== Header ===================== -->
    <div class="px-6 py-5 border-b border-slate-200 dark:border-white/10">

      <div class="flex items-center justify-between">

        <div class="flex items-center gap-4">

          <!-- Trophy Icon -->
          <div
            class="w-14 h-14 rounded-2xl
                   bg-yellow-400/20
                   text-yellow-500
                   flex items-center justify-center
                   text-2xl shrink-0">

            <i class="fa-solid fa-trophy"></i>

          </div>

          <!-- Title -->
          <div>

            <h2 class="text-xl font-bold text-slate-800 dark:text-white">
              อันดับผู้เล่น
            </h2>

            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
              ผู้ที่สะสมดาวได้สูงสุด
            </p>

          </div>

        </div>

        <!-- Close -->
        <button
          (click)="showLeaderboard = false"
          class="w-10 h-10 rounded-2xl
                 flex items-center justify-center
                 text-slate-400
                 hover:bg-slate-100
                 dark:hover:bg-white/10
                 transition-all">

          <i class="fa-solid fa-xmark text-lg"></i>

        </button>

      </div>

    </div>

    <!-- ===================== Loading ===================== -->
    <div
      *ngIf="leaderboardLoading"
      class="flex flex-col items-center justify-center py-16">

      <i class="fa-solid fa-spinner fa-spin text-indigo-400 text-3xl"></i>

      <p class="mt-4 text-slate-500 dark:text-slate-400">
        กำลังโหลดข้อมูล...
      </p>

    </div>

    <!-- ===================== Leaderboard List ===================== -->
    <div
      *ngIf="!leaderboardLoading"
      class="p-4 space-y-3 max-h-[420px] overflow-y-auto">

      <!-- Row -->
      <div
        *ngFor="let entry of topLeaderboard"
        class="flex items-center gap-4
               px-4 py-4 rounded-2xl
               border transition-all"

        [class.bg-indigo-50]="entry.isMe"
        [class.border-indigo-200]="entry.isMe"
        [class.dark:bg-indigo-500]="entry.isMe"
        [class.dark:bg-opacity-10]="entry.isMe"
        [class.dark:border-indigo-500]="entry.isMe"
        [class.dark:border-opacity-30]="entry.isMe"

        [class.bg-slate-50]="!entry.isMe"
        [class.border-slate-200]="!entry.isMe"
        [class.dark:bg-white]="!entry.isMe"
        [class.dark:bg-opacity-5]="!entry.isMe"
        [class.dark:border-white]="!entry.isMe"
        [class.dark:border-opacity-5]="!entry.isMe">

        <!-- ===================== Rank ===================== -->
        <div class="w-10 text-center shrink-0">

          <div
            class="text-lg font-bold"

            [class.text-yellow-500]="entry.rank === 1"
            [class.text-slate-400]="entry.rank === 2"
            [class.text-orange-400]="entry.rank === 3"
            [class.text-slate-500]="entry.rank > 3 && !entry.isMe"
            [class.text-indigo-500]="entry.rank > 3 && entry.isMe">

            <ng-container [ngSwitch]="entry.rank">

              <span *ngSwitchCase="1">🥇</span>
              <span *ngSwitchCase="2">🥈</span>
              <span *ngSwitchCase="3">🥉</span>

              <span *ngSwitchDefault>
                #{{ entry.rank }}
              </span>

            </ng-container>

          </div>

        </div>

        <!-- ===================== Avatar ===================== -->
        <div
          class="w-12 h-12 rounded-full
                 flex items-center justify-center
                 font-bold text-base shrink-0"

          [class.bg-indigo-500]="entry.isMe"
          [class.bg-opacity-20]="entry.isMe"
          [class.text-indigo-500]="entry.isMe"

          [class.bg-slate-200]="!entry.isMe"
          [class.dark:bg-white]="!entry.isMe"
          [class.dark:bg-opacity-10]="!entry.isMe"
          [class.text-slate-600]="!entry.isMe"
          [class.dark:text-slate-300]="!entry.isMe">

          {{ entry.first_name[0] }}{{ entry.last_name[0] }}

        </div>

        <!-- ===================== Name ===================== -->
        <div class="flex-1 min-w-0">

          <div
            class="text-base font-semibold truncate"

            [class.text-indigo-600]="entry.isMe"
            [class.dark:text-indigo-300]="entry.isMe"

            [class.text-slate-800]="!entry.isMe"
            [class.dark:text-white]="!entry.isMe">

            {{ entry.first_name }} {{ entry.last_name }}

            <span
              *ngIf="entry.isMe"
              class="text-sm font-normal opacity-70 ml-1">

              (คุณ)

            </span>

          </div>

        </div>

        <!-- ===================== Stars ===================== -->
        <div class="shrink-0 text-right">

          <div class="text-lg font-bold text-yellow-500">
            ⭐ {{ entry.stars }}
          </div>

        </div>

      </div>

      <!-- ===================== Empty State ===================== -->
      <div
        *ngIf="topLeaderboard.length === 0"
        class="py-12 text-center">

        <div
          class="w-16 h-16 mx-auto rounded-full
                 bg-slate-100 dark:bg-white/5
                 flex items-center justify-center
                 text-slate-400 text-2xl">

          <i class="fa-solid fa-users"></i>

        </div>

        <p class="mt-4 text-slate-500 dark:text-slate-400">
          ยังไม่มีข้อมูลผู้เล่น
        </p>

      </div>

    </div>

    <!-- ===================== My Rank ===================== -->
    <div
      *ngIf="!leaderboardLoading && myEntry"
      class="m-4 mt-0 rounded-2xl
             border-2 border-indigo-200
             dark:border-indigo-500/30
             bg-indigo-50 dark:bg-indigo-500/10
             px-5 py-4">

      <div class="text-sm font-medium text-indigo-500 mb-3">
        อันดับของคุณ
      </div>

      <div class="flex items-center gap-4">

        <!-- Rank -->
        <div class="text-2xl font-bold text-indigo-500 shrink-0">
          #{{ myEntry.rank }}
        </div>

        <!-- Avatar -->
        <div
          class="w-12 h-12 rounded-full
                 bg-indigo-500/20
                 text-indigo-500
                 flex items-center justify-center
                 font-bold">

          {{ myEntry.first_name[0] }}{{ myEntry.last_name[0] }}

        </div>

        <!-- Name -->
        <div class="flex-1">

          <div class="font-bold text-slate-800 dark:text-white">
            {{ myEntry.first_name }} {{ myEntry.last_name }}
          </div>

        </div>

        <!-- Stars -->
        <div class="text-xl font-bold text-yellow-500">
          ⭐ {{ myEntry.stars }}
        </div>

      </div>

    </div>

  </div>

  </div>
  `
})
export class RewardTasksComponent implements OnInit, OnDestroy {

  public i18n = inject(I18nService);
  public currentTaskIndex = 0;
  private autoPlayInterval: any;
  private touchStartX = 0;

  get weeklyCompletionRate(): number {
    if (!this.tasks || this.tasks.length === 0) return 0;
    const sum = this.tasks.reduce((acc, t) => {
      const progressPercent = Math.min(100, (t.progress / t.target) * 100);
      return acc + progressPercent;
    }, 0);
    return Math.round(sum / this.tasks.length);
  }

  getWeeklyProgressMessage(): string {
    const rate = this.weeklyCompletionRate;
    const lang = this.i18n.currentLang();
    if (lang === 'th') {
      if (rate === 0) return 'ยังไม่ได้เริ่มภารกิจของสัปดาห์นี้ มาเริ่มฝึกซ้อมกันเลย! 🚀';
      if (rate < 50) return `ทำภารกิจสำเร็จแล้ว ${rate}%! เริ่มต้นได้ดีมากครับคุณตาคุณยาย 👏`;
      if (rate < 100) return `ทำภารกิจสำเร็จแล้ว ${rate}%! อีกนิดเดียวจะครบ 100% แล้ว สู้ๆ ครับ! 💪`;
      return 'ยอดเยี่ยมที่สุด! 🎉 คุณทำภารกิจประจำสัปดาห์ครบ 100% แล้ว!';
    } else {
      if (rate === 0) return 'No tasks started yet this week. Let\'s begin training! 🚀';
      if (rate < 50) return `Weekly tasks ${rate}% completed! Great start! 👏`;
      if (rate < 100) return `Weekly tasks ${rate}% completed! Almost there, keep it up! 💪`;
      return 'Outstanding! 🎉 You have completed 100% of your weekly tasks!';
    }
  }

  startAutoPlay() {
    this.stopAutoPlay();
    if (this.tasks.length <= 1) return;
    this.autoPlayInterval = setInterval(() => {
      this.nextTask();
    }, 7000);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  nextTask() {
    if (this.tasks.length === 0) return;
    this.currentTaskIndex = (this.currentTaskIndex + 1) % this.tasks.length;
  }

  prevTask() {
    if (this.tasks.length === 0) return;
    this.currentTaskIndex = (this.currentTaskIndex - 1 + this.tasks.length) % this.tasks.length;
  }

  setTaskIndex(index: number) {
    this.currentTaskIndex = index;
    this.startAutoPlay();
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].clientX;
    const diff = this.touchStartX - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        this.nextTask();
      } else {
        this.prevTask();
      }
      this.startAutoPlay();
    }
  }

  tasks: RewardTask[] = [];
  totalStars = 0;

  showLeaderboard = false;
  leaderboardLoading = false;
  leaderboard: LeaderboardEntry[] = [];
  myRank = 0;

  constructor(
    private supabase: SupabaseService,
    private taskService: TaskService
  ) {}

  async ngOnInit() {
    const user = this.supabase.currentUser();
    if (!user) return;

    await this.taskService.createAdaptiveTasksIfNeeded(user.id);

    const weekStart = this.getWeekStart();

    const [tasksResult, patientResult] = await Promise.all([
      this.supabase.client
        .from('patient_tasks')
        .select(`
          id,
          progress,
          completed,
          weekly_tasks!inner (
            title, description, icon, target, reward
          )
        `)
        .eq('patient_id', user.id)
        .eq('week_start', weekStart),

      this.supabase.client
        .from('patients')
        .select('stars')
        .eq('id', user.id)
        .single()
    ]);

    if (tasksResult.error) {
      console.error(tasksResult.error);
      return;
    }

    this.tasks = (tasksResult.data || []).map((pt: any) => ({
      id:          pt.id,
      title:       pt.weekly_tasks.title,
      description: pt.weekly_tasks.description,
      icon:        pt.weekly_tasks.icon,
      target:      pt.weekly_tasks.target,
      reward:      pt.weekly_tasks.reward,
      progress:    pt.progress,
      completed:   pt.completed
    }));

    this.totalStars = patientResult.data?.stars || 0;
    this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  async openLeaderboard() {
    this.showLeaderboard = true;
    if (this.leaderboard.length) return; // cache ไว้แล้ว ไม่ต้อง fetch ซ้ำ

    this.leaderboardLoading = true;

    const user = this.supabase.currentUser();
    const { data } = await this.supabase.client
      .from('patients')
      .select('id, first_name, last_name, stars')
      .order('stars', { ascending: false })
      .limit(50);

    this.leaderboardLoading = false;

    if (!data) return;

    this.leaderboard = data.map((p, i) => ({
      rank:       i + 1,
      id:         p.id,
      first_name: p.first_name,
      last_name:  p.last_name,
      stars:      p.stars ?? 0,
      isMe:       p.id === user?.id,
    }));

    this.myRank = this.leaderboard.find(p => p.isMe)?.rank ?? 0;
  }

  // top 6 รวม user ด้วย (ถ้าอยู่ใน top 6)
  get topLeaderboard(): LeaderboardEntry[] {
    return this.leaderboard.slice(0, 6);
  }

  // แสดง sticky row ก็ต่อเมื่อ user อยู่นอก top 6
  get myEntry(): LeaderboardEntry | null {
    const me = this.leaderboard.find(p => p.isMe);
    if (!me || me.rank <= 6) return null;
    return me;
  }

  private getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }
}