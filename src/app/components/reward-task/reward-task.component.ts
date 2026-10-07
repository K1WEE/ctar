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
  <div class="pp-surface border pp-border rounded-3xl p-5 sm:p-7 h-full flex flex-col justify-between">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5 border-b pp-border pb-4">

      <div>
        <h2 class="text-lg sm:text-xl font-extrabold pp-ink">
          {{ i18n.currentLang() === 'th' ? 'ภารกิจประจำสัปดาห์' : 'Weekly Missions' }}
        </h2>

        <p class="pp-muted text-sm font-medium mt-1">
          {{ i18n.currentLang() === 'th' ? 'ฝึกฝนอย่างต่อเนื่องเพื่อรับดาว' : 'Keep training to earn stars' }}
        </p>
      </div>

      <div class="flex items-center gap-2">

        <!-- Stars badge -->
        <div class="flex items-center gap-2 pp-reward-soft pp-reward-text px-3 py-2 rounded-2xl">
          <i class="fa-solid fa-star text-xl"></i>
          <span class="font-extrabold text-lg">{{ totalStars }}</span>
        </div>

        <!-- Leaderboard button -->
        <button
          (click)="openLeaderboard()"
          class="w-12 h-12 rounded-2xl border pp-border
                 pp-surface  flex items-center justify-center
                 pp-muted  pp-reward-hover
                 transition-all duration-200 text-lg"
          [attr.aria-label]="i18n.currentLang() === 'th' ? 'ดูอันดับผู้เล่น' : 'View leaderboard'">
          <i class="fa-solid fa-trophy"></i>
        </button>

      </div>

    </div>

    <!-- Weekly Overall Progress Card -->
    <div class="pp-progress-panel mb-5 pp-success-soft border pp-success-border rounded-2xl p-4 sm:p-5 relative overflow-hidden">

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 relative z-10">
        <div>
          <span class="text-sm sm:text-base font-extrabold pp-success-text block mb-0.5">
            {{ i18n.currentLang() === 'th' ? 'ภาพรวมความก้าวหน้า' : 'Overall Progress' }}
          </span>
          <h3 class="text-xl sm:text-2xl font-black pp-ink">
            {{ i18n.currentLang() === 'th' ? 'พัฒนาการสัปดาห์นี้:' : 'Weekly Progress:' }} <span class="pp-success-text">{{ weeklyCompletionRate }}%</span>
          </h3>
        </div>
        <div class="pp-muted text-base font-bold pp-surface border pp-border px-3.5 py-2 rounded-full self-start sm:self-auto">
          {{ tasks.length }} {{ i18n.currentLang() === 'th' ? 'ภารกิจที่ต้องทำ' : 'tasks active' }}
        </div>
      </div>
      
      <!-- Big Progress Bar -->
      <div class="w-full h-3.5 rounded-full pp-track overflow-hidden relative z-10">
        <div
          class="h-full pp-success-fill transition-all duration-700 ease-out"
          [style.width.%]="weeklyCompletionRate">
        </div>
      </div>
      
      <!-- Motivation Message -->
      <p class="text-base font-semibold pp-muted mt-3 sm:mt-4 flex items-center gap-2 relative z-10 text-pretty">
        <i class="fa-solid fa-circle-check pp-success-text text-base sm:text-lg"></i>
        <span>{{ getWeeklyProgressMessage() }}</span>
      </p>
    </div>

    <!-- Tasks Carousel -->
    <div class="relative z-10 select-none">
      <div *ngIf="tasks.length > 0; else noTasks"
           (touchstart)="onTouchStart($event)"
           (touchend)="onTouchEnd($event)"
           class="pp-mission-card pp-subtle rounded-2xl p-4 sm:p-5 border pp-border transition-all duration-300 min-h-[145px] flex flex-col justify-between cursor-grab active:cursor-grabbing overflow-hidden">
        
        <div *ngFor="let task of tasks; let i = index">
          <div *ngIf="i === currentTaskIndex" class="animate-fade-in flex items-start gap-4">
            
            <!-- Icon -->
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              [class]="task.completed ? 'pp-success-soft pp-success-text' : 'pp-reward-soft pp-reward-text'">
              <i class="fa-solid text-xl" [class]="task.icon"></i>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-extrabold text-lg sm:text-xl pp-ink break-words">
                  {{ task.title }}
                </h3>
                <span *ngIf="task.completed" class="pp-success-text text-sm">
                  <i class="fa-solid fa-circle-check"></i>
                </span>
              </div>
              <p class="text-base sm:text-lg pp-muted mt-1 leading-relaxed">
                {{ task.description }}
              </p>

              <!-- Progress Bar -->
              <div class="mt-4">
                <div class="w-full h-2 rounded-full pp-track overflow-hidden">
                  <div
                    class="h-full pp-success-fill transition-all duration-500"
                    [style.width.%]="(task.progress / task.target) * 100">
                  </div>
                </div>
                <div class="flex justify-between text-base mt-2 pp-muted font-bold">
                  <span>{{ task.progress }} / {{ task.target }}</span>
                  <span class="pp-reward-text flex items-center gap-1">
                    <i class="fa-solid fa-star" aria-hidden="true"></i>
                    <span>{{ task.reward }}</span>
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      <ng-template #noTasks>
        <div class="pp-subtle rounded-2xl p-6 border pp-border text-center pp-muted">
          <i class="fa-solid fa-clipboard-list text-2xl mb-2"></i>
          <p class="text-base font-semibold">{{ taskLoadMessage || (i18n.currentLang() === 'th' ? 'ไม่มีภารกิจในขณะนี้' : 'No missions right now') }}</p>
        </div>
      </ng-template>

      <!-- Carousel Indicator Dots -->
      <div *ngIf="tasks.length > 1" class="flex justify-center gap-2 mt-4">
        <button
          *ngFor="let task of tasks; let i = index"
          (click)="setTaskIndex(i)"
          class="pp-task-dot relative h-11 w-11 rounded-full transition-colors"
          [class]="i === currentTaskIndex ? 'pp-task-dot-active' : ''"
          [attr.aria-current]="i === currentTaskIndex ? 'true' : null"
          [attr.aria-label]="(i18n.currentLang() === 'th' ? 'ไปยังภารกิจที่ ' : 'Go to mission ') + (i + 1)">
        </button>
      </div>

    </div>

  </div>

  <!-- ===================== Leaderboard Modal ===================== -->
<div
  *ngIf="showLeaderboard"
  class="fixed inset-0 z-50 flex items-center justify-center
         bg-black/55 p-4"
  (click)="showLeaderboard = false">

  <div
    class="pp-leaderboard pp-surface
           rounded-3xl
           w-full max-w-md
           overflow-hidden
           "
    (click)="$event.stopPropagation()">

    <!-- ===================== Header ===================== -->
    <div class="px-6 py-5 border-b pp-border">

      <div class="flex items-center justify-between">

        <div class="flex items-center gap-4">

          <!-- Trophy Icon -->
          <div
            class="w-14 h-14 rounded-2xl
                   pp-reward-soft
                   pp-reward-text
                   flex items-center justify-center
                   text-2xl shrink-0">

            <i class="fa-solid fa-trophy"></i>

          </div>

          <!-- Title -->
          <div>

            <h2 class="text-2xl font-extrabold pp-ink">
              อันดับผู้เล่น
            </h2>

            <p class="text-base pp-muted mt-1 font-semibold">
              ผู้ที่สะสมดาวได้สูงสุด
            </p>

          </div>

        </div>

        <!-- Close -->
        <button
          (click)="showLeaderboard = false"
          [attr.aria-label]="i18n.currentLang() === 'th' ? 'ปิดอันดับผู้เล่น' : 'Close leaderboard'"
          class="w-12 h-12 shrink-0 rounded-2xl
                 flex items-center justify-center
                 pp-muted
                 pp-hover

                 transition-all">

          <i class="fa-solid fa-xmark text-lg"></i>

        </button>

      </div>

    </div>

    <!-- ===================== Loading ===================== -->
    <div
      *ngIf="leaderboardLoading"
      class="flex flex-col items-center justify-center py-16">

      <i class="fa-solid fa-spinner fa-spin pp-action-text text-3xl"></i>

      <p class="mt-4 text-lg font-bold pp-muted">
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
        class="pp-leaderboard-row flex items-center gap-4
               px-4 py-4 rounded-2xl
               border transition-all"

        [class.pp-action-soft]="entry.isMe"
        [class.pp-action-border]="entry.isMe"

        [class.pp-subtle]="!entry.isMe"
        [class.pp-border]="!entry.isMe">

        <!-- ===================== Rank ===================== -->
        <div class="w-12 text-center shrink-0">

          <div
            class="text-xl font-extrabold"

            [class.pp-reward-text]="entry.rank === 1 || entry.rank === 3"
            [class.pp-muted]="entry.rank === 2 || (entry.rank > 3 && !entry.isMe)"


            [class.pp-action-text]="entry.rank > 3 && entry.isMe">

            <ng-container [ngSwitch]="entry.rank">

              <span *ngSwitchCase="1">อันดับ 1</span>
              <span *ngSwitchCase="2">อันดับ 2</span>
              <span *ngSwitchCase="3">อันดับ 3</span>

              <span *ngSwitchDefault>
                #{{ entry.rank }}
              </span>

            </ng-container>

          </div>

        </div>

        <!-- ===================== Avatar ===================== -->
        <div
          class="pp-ranking-avatar w-12 h-12 rounded-full
                 flex items-center justify-center
                 font-bold text-base shrink-0"

          [class.pp-action-soft]="entry.isMe"
          [class.pp-action-text]="entry.isMe"

          [class.pp-track]="!entry.isMe"
          [class.pp-muted]="!entry.isMe">

          {{ entry.first_name[0] }}{{ entry.last_name[0] }}

        </div>

        <!-- ===================== Name ===================== -->
        <div class="flex-1 min-w-0">

          <div
            class="text-lg font-bold break-words"

            [class.pp-action-text]="entry.isMe"

            [class.pp-ink]="!entry.isMe">

            {{ entry.first_name }} {{ entry.last_name }}

            <span
              *ngIf="entry.isMe"
              class="text-base font-semibold ml-1">

              (คุณ)

            </span>

          </div>

        </div>

        <!-- ===================== Stars ===================== -->
        <div class="shrink-0 text-right">

          <div class="text-xl font-extrabold pp-reward-text">
            <i class="fa-solid fa-star" aria-hidden="true"></i> {{ entry.stars }}
          </div>

        </div>

      </div>

      <!-- ===================== Empty State ===================== -->
      <div
        *ngIf="topLeaderboard.length === 0"
        class="py-12 text-center">

        <div
          class="w-16 h-16 mx-auto rounded-full
                 pp-subtle
                 flex items-center justify-center
                 pp-muted text-2xl">

          <i class="fa-solid fa-users"></i>

        </div>

        <p class="mt-4 text-lg font-bold pp-muted">
          ยังไม่มีข้อมูลผู้เล่น
        </p>

      </div>

    </div>

    <!-- ===================== My Rank ===================== -->
    <div
      *ngIf="!leaderboardLoading && myEntry"
      class="m-4 mt-0 rounded-2xl
             border-2 pp-action-border

             pp-action-soft
             px-5 py-4">

      <div class="text-base font-bold pp-action-text mb-3">
        อันดับของคุณ
      </div>

      <div class="flex items-center gap-4">

        <!-- Rank -->
        <div class="text-3xl font-extrabold pp-action-text shrink-0">
          #{{ myEntry.rank }}
        </div>

        <!-- Avatar -->
        <div
          class="w-12 h-12 rounded-full
                 pp-action-soft
                 pp-action-text
                 flex items-center justify-center
                 font-extrabold text-base shrink-0">

          {{ myEntry.first_name[0] }}{{ myEntry.last_name[0] }}

        </div>

        <!-- Name -->
        <div class="flex-1">

          <div class="font-extrabold text-lg pp-ink">
            {{ myEntry.first_name }} {{ myEntry.last_name }}
          </div>

        </div>

        <!-- Stars -->
        <div class="text-2xl font-extrabold pp-reward-text">
          <i class="fa-solid fa-star" aria-hidden="true"></i> {{ myEntry.stars }}
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
      if (rate === 0) return 'ยังไม่ได้เริ่มภารกิจของสัปดาห์นี้ มาเริ่มฝึกซ้อมกันเลย!';
      if (rate < 50) return `ทำภารกิจสำเร็จแล้ว ${rate}%! เริ่มต้นได้ดีมากครับ`;
      if (rate < 100) return `ทำภารกิจสำเร็จแล้ว ${rate}%! อีกนิดเดียวจะครบ 100% แล้ว สู้ๆ ครับ!`;
      return 'ยอดเยี่ยมที่สุด! คุณทำภารกิจประจำสัปดาห์ครบ 100% แล้ว!';
    } else {
      if (rate === 0) return 'No tasks started yet this week. Let\'s begin training!';
      if (rate < 50) return `Weekly tasks ${rate}% completed! Great start!`;
      if (rate < 100) return `Weekly tasks ${rate}% completed! Almost there, keep it up!`;
      return 'Outstanding! You have completed 100% of your weekly tasks!';
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
  taskLoadMessage = '';
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

    const taskProvision = await this.taskService.createAdaptiveTasksIfNeeded(user.id);
    if ('message' in taskProvision) {
      this.taskLoadMessage = taskProvision.message;
    }

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
      this.taskLoadMessage = 'ยังโหลดภารกิจของคุณไม่ได้ กรุณาลองใหม่อีกครั้ง';
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
