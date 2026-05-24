import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { TaskService } from '../../services/task.service';

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

@Component({
  selector: 'app-reward-tasks',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">

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

      <div
        class="flex items-center gap-2 bg-yellow-400/20
               text-yellow-500 px-4 py-2 rounded-2xl">

        <i class="fa-solid fa-star"></i>

        <span class="font-bold">
          {{ totalStars }}
        </span>

      </div>

    </div>

    <!-- Tasks -->
    <div class="space-y-4">

      <div
        *ngFor="let task of tasks"
        class="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-white/5 transition-all hover:scale-[1.01]"
      >

        <div class="flex items-start justify-between gap-4">

          <div class="flex gap-4 flex-1">

            <!-- Icon -->
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center
                     bg-indigo-500/20 text-indigo-400 text-xl shrink-0">

              <i class="fa-solid" [class]="task.icon"></i>

            </div>

            <!-- Content -->
            <div class="flex-1">

              <div class="flex items-center gap-2">

                <h3 class="font-bold text-slate-800 dark:text-white">
                  {{ task.title }}
                </h3>

                <div
                  *ngIf="task.completed"
                  class="text-emerald-400">

                  <i class="fa-solid fa-circle-check"></i>

                </div>

              </div>

              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {{ task.description }}
              </p>

              <!-- Progress -->
              <div class="mt-4">

                <div
                  class="w-full h-2 rounded-full bg-slate-200
                         dark:bg-slate-700 overflow-hidden">

                  <div
                    class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                    [style.width.%]="(task.progress / task.target) * 100">
                  </div>

                </div>

                <div
                  class="flex justify-between text-xs mt-2
                         text-slate-500 dark:text-slate-400">

                  <span>
                    {{ task.progress }} / {{ task.target }}
                  </span>

                  <span class="text-yellow-500 font-bold">
                    ⭐ {{ task.reward }}
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>
  `
})
export class RewardTasksComponent implements OnInit {

  tasks: RewardTask[] = [];
  totalStars = 0;

  constructor(
  private supabase: SupabaseService,
  private taskService: TaskService
) {}

  async ngOnInit() {

  const user = this.supabase.currentUser();
  if (!user) return;

  // สร้าง task adaptive ถ้าสัปดาห์นี้ยังไม่มี
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
      .eq('week_start', weekStart),  // ← filter จาก patient_tasks โดยตรง

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
}

  // คำนวณวันจันทร์ของสัปดาห์ปัจจุบัน
  private getWeekStart(): string {
    const now = new Date();
    const day = now.getDay(); // 0=อาทิตย์, 1=จันทร์...
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0]; // "2026-05-19"
  }
}