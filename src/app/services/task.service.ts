import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type TaskProvisionResult =
  | { status: 'already_exists' | 'ready'; taskCount: number }
  | {
      status:
        | 'patient_tasks_unavailable'
        | 'catalogue_unavailable'
        | 'catalogue_empty';
      message: string;
    };

/** ภารกิจที่ progress ขยับใน session ล่าสุด — ใช้แสดงผลที่หน้า summary */
export interface TaskUpdateResult {
  taskId: string;
  title: string;
  icon: string;
  target: number;
  previousProgress: number;
  progress: number;
  completedNow: boolean;
  /** ดาวที่ server ยืนยันจาก claim_task_reward (0 ถ้าเคยรับแล้วหรือ claim ไม่สำเร็จ) */
  starsAwarded: number;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  constructor(private supabase: SupabaseService) {}

  // =========================================
  // เรียกตอนเปิดแอป — ผูก catalogue task ที่ staff เตรียมไว้กับผู้ใช้
  // =========================================

  async createAdaptiveTasksIfNeeded(patientId: string): Promise<TaskProvisionResult> {
    const weekStart = this.getWeekStart();

    // เช็คว่าสัปดาห์นี้มี task แล้วหรือยัง
    const { data: existing, error: existingError } = await this.supabase.client
      .from('patient_tasks')
      .select('id')
      .eq('patient_id', patientId)
      .eq('week_start', weekStart)
      .limit(1);

    if (existingError) {
      console.error('Unable to read patient tasks:', existingError);
      return {
        status: 'patient_tasks_unavailable',
        message: 'ยังโหลดภารกิจของคุณไม่ได้ กรุณาลองใหม่อีกครั้ง',
      };
    }

    if (existing?.length) {
      return { status: 'already_exists', taskCount: existing.length };
    }

    // weekly_tasks เป็น shared catalogue ที่ staff จัดเตรียมไว้ล่วงหน้า
    // patient อ่านได้ตาม SELECT policy แต่ไม่มีสิทธิ์ INSERT/UPDATE/DELETE
    const { data: existingWeeklyTasks, error: catalogueError } = await this.supabase.client
      .from('weekly_tasks')
      .select('id, title')
      .eq('week_start', weekStart);

    if (catalogueError) {
      console.error('Unable to read weekly task catalogue:', catalogueError);
      return {
        status: 'catalogue_unavailable',
        message: 'ยังโหลดภารกิจประจำสัปดาห์ไม่ได้ กรุณาลองใหม่อีกครั้ง',
      };
    }

    if (!existingWeeklyTasks?.length) {
      return {
        status: 'catalogue_empty',
        message: 'ภารกิจประจำสัปดาห์ยังไม่พร้อม กรุณากลับมาลองใหม่ภายหลัง',
      };
    }

    // สร้าง patient_tasks ของ user นี้
    const { error: patientTasksError } = await this.supabase.client
      .from('patient_tasks')
      .insert(
        existingWeeklyTasks.map((t) => ({
        patient_id: patientId,
        task_id: t.id,
        week_start: weekStart,
        })),
      );

    if (patientTasksError) {
      console.error('Unable to assign weekly tasks:', patientTasksError);
      return {
        status: 'patient_tasks_unavailable',
        message: 'ยังเปิดภารกิจประจำสัปดาห์ไม่ได้ กรุณาลองใหม่อีกครั้ง',
      };
    }

    return { status: 'ready', taskCount: existingWeeklyTasks.length };
  }

  // =========================================
  // เรียกหลัง session เสร็จ
  // =========================================

  async updateTasksAfterSession(
    patientId: string,
    session: {
      maxForce: number;
      durationMinutes: number;
      reps: number;
    },
  ): Promise<TaskUpdateResult[]> {
    const weekStart = this.getWeekStart();

    const { data: patientTasks, error } = await this.supabase.client
      .from('patient_tasks')
      .select(
        `
      id,
      progress,
      completed,
      weekly_tasks!inner ( id, title, icon, target, reward )
    `,
      )
      .eq('patient_id', patientId)
      .eq('week_start', weekStart);

    if (error || !patientTasks) {
      console.error(error);
      return [];
    }

    // streak
    const { data: recentSessions } = await this.supabase.client
      .from('sessions')
      .select('session_date')
      .eq('patient_id', patientId)
      .order('session_date', { ascending: false })
      .limit(7);

    const streak = this.calculateStreak(recentSessions || []);

    const updates = [];

    for (const task of patientTasks as any[]) {
      if (task.completed) continue;

      const weeklyTask = task.weekly_tasks;
      let newProgress = task.progress;

      if (weeklyTask.title === 'นักฝึกต่อเนื่อง') {
        newProgress = streak;
      }

      if (weeklyTask.title === 'นักสู้ CTAR') {
        newProgress += 1;
      }

      if (weeklyTask.title === 'พลังคอสุดแกร่ง') {
        if (session.maxForce >= weeklyTask.target) {
          newProgress = weeklyTask.target;
        }
      }

      if (weeklyTask.title === 'สายอึด') {
        newProgress = Math.round(task.progress + session.durationMinutes);
      }

      if (newProgress > weeklyTask.target) {
        newProgress = weeklyTask.target;
      }

      updates.push({
        id: task.id,
        taskId: weeklyTask.id,
        title: weeklyTask.title,
        icon: weeklyTask.icon,
        target: weeklyTask.target,
        previousProgress: task.progress,
        progress: newProgress,
      });
    }

    // The DB trigger recomputes progress from sessions and derives `completed`,
    // so only send progress and read back what was actually saved.
    const saved = await Promise.all(
      updates.map(async (u) => {
        const { data, error: updateError } = await this.supabase.client
          .from('patient_tasks')
          .update({ progress: u.progress })
          .eq('id', u.id)
          .select('progress, completed')
          .single();
        if (updateError || !data) {
          console.warn('patient_tasks update error:', updateError);
          return null;
        }
        return { ...u, progress: data.progress as number, completed: data.completed as boolean };
      }),
    );
    const moved = saved.filter(
      (u): u is NonNullable<typeof u> => !!u && u.progress > u.previousProgress,
    );

    // Secure atomic stars claim via claim_task_reward RPC
    // Supabase reports RPC failures in `error` instead of throwing.
    const results: TaskUpdateResult[] = [];
    for (const u of moved) {
      // Rows loaded as completed were skipped above, so `completed` here is new.
      let starsAwarded = 0;
      if (u.completed) {
        const { data, error: claimError } = await this.supabase.client.rpc('claim_task_reward', {
          p_patient_id: patientId,
          p_task_id: u.taskId,
        });
        if (claimError) console.warn('claim_task_reward error:', claimError);
        starsAwarded = claimError ? 0 : Number(data) || 0;
      }
      results.push({
        taskId: u.taskId,
        title: u.title,
        icon: u.icon,
        target: u.target,
        previousProgress: u.previousProgress,
        progress: u.progress,
        completedNow: u.completed,
        starsAwarded,
      });
    }
    return results;
  }

  // =========================================
  // Helpers
  // =========================================

  private calculateStreak(sessions: { session_date: string }[]): number {
    if (!sessions.length) return 0;

    let streak = 1;
    for (let i = 0; i < sessions.length - 1; i++) {
      const a = new Date(sessions[i].session_date);
      const b = new Date(sessions[i + 1].session_date);
      a.setHours(0, 0, 0, 0);
      b.setHours(0, 0, 0, 0);
      const diffDays = Math.round(
        (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) streak++;
      else break;
    }
    return streak;
  }

  private getWeekStart(): string {
    return this.getMondayOf(new Date());
  }

  private getMondayOf(date: Date): string {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }
}
