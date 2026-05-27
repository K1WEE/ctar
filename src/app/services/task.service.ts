import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class TaskService {
  constructor(private supabase: SupabaseService) {}

  // =========================================
  // เรียกตอนเปิดแอป — สร้าง task ถ้ายังไม่มี
  // =========================================

  async createAdaptiveTasksIfNeeded(patientId: string) {
    const weekStart = this.getWeekStart();
    const lastWeekStart = this.getLastWeekStart();

    // เช็คว่าสัปดาห์นี้มี task แล้วหรือยัง
    const { data: existing } = await this.supabase.client
      .from('patient_tasks')
      .select('id')
      .eq('patient_id', patientId)
      .eq('week_start', weekStart)
      .limit(1);

    if (existing?.length) return;

    // ดึง sessions สัปดาห์ที่แล้ว
    const { data: lastSessions } = await this.supabase.client
      .from('sessions')
      .select('max_force, duration_seconds')
      .eq('patient_id', patientId)
      .gte('session_date', lastWeekStart)
      .lt('session_date', weekStart);

    // ดึง task targets สัปดาห์ที่แล้ว
    const { data: lastWeekTasks } = await this.supabase.client
      .from('patient_tasks')
      .select(
        `
        progress,
        weekly_tasks ( title, target )
      `,
      )
      .eq('patient_id', patientId)
      .eq('week_start', lastWeekStart);

    const lastTask = (title: string) =>
      (lastWeekTasks as any[])?.find((t) => t.weekly_tasks.title === title);

    const isFirstWeek = !lastWeekTasks?.length;

    // performance สัปดาห์ที่แล้ว
    const sessionCount = lastSessions?.length || 0;
    const maxForce = lastSessions?.length
      ? Math.max(...lastSessions.map((s) => s.max_force))
      : 30;
    const totalMinutes = lastSessions?.length
      ? lastSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60
      : 10;

    // คำนวณ target ใหม่
    const newSessionTarget = isFirstWeek
      ? 3
      : this.calculateAdaptiveTarget(
          lastTask('นักสู้ CTAR')?.weekly_tasks.target ?? 3,
          sessionCount,
          1,
          7,
        );

    const newForceTarget = isFirstWeek
      ? 30
      : this.calculateAdaptiveTarget(
          lastTask('พลังคอสุดแกร่ง')?.weekly_tasks.target ?? 30,
          maxForce,
          10,
          80,
        );

    const newDurationTarget = isFirstWeek
      ? 10
      : this.calculateAdaptiveTarget(
          lastTask('สายอึด')?.weekly_tasks.target ?? 10,
          totalMinutes,
          5,
          60,
        );

    // สร้าง weekly_tasks
    let tasksForWeek: any[] = [];

// เช็ค weekly_tasks ของสัปดาห์นี้
const { data: existingWeeklyTasks } = await this.supabase.client
  .from('weekly_tasks')
  .select('id, title')
  .eq('week_start', weekStart);

// ถ้ายังไม่มี → สร้างใหม่
if (!existingWeeklyTasks?.length) {

  const { data: createdTasks } = await this.supabase.client
    .from('weekly_tasks')
    .insert([
      {
        week_start: weekStart,
        title: 'นักสู้ CTAR',
        description: `ฝึกให้ครบ ${newSessionTarget} sessions`,
        icon: 'fa-medal',
        target: newSessionTarget,
        reward: 4,
      },
      {
        week_start: weekStart,
        title: 'พลังคอสุดแกร่ง',
        description: `ทำแรงกดให้ถึง ${newForceTarget}N`,
        icon: 'fa-dumbbell',
        target: newForceTarget,
        reward: 3,
      },
      {
        week_start: weekStart,
        title: 'สายอึด',
        description: `ฝึกครบ ${newDurationTarget} นาที`,
        icon: 'fa-clock',
        target: newDurationTarget,
        reward: 2,
      },
      {
        week_start: weekStart,
        title: 'นักฝึกต่อเนื่อง',
        description: 'ฝึกติดต่อกัน 3 วัน',
        icon: 'fa-fire',
        target: 3,
        reward: 5,
      },
    ])
    .select('id');

  tasksForWeek = createdTasks || [];

} else {

  // มีอยู่แล้ว → ใช้อันเดิม
  tasksForWeek = existingWeeklyTasks;

}

// ไม่มี task จริง ๆ
if (!tasksForWeek.length) return;

// สร้าง patient_tasks ของ user นี้
await this.supabase.client
  .from('patient_tasks')
  .insert(
    tasksForWeek.map((t) => ({
      patient_id: patientId,
      task_id: t.id,
      week_start: weekStart,
    }))
  );
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
  ) {
    const weekStart = this.getWeekStart();

    const { data: patientTasks, error } = await this.supabase.client
  .from('patient_tasks')
  .select(
    `
      id,
      progress,
      completed,
      weekly_tasks!inner ( id, title, target, reward )
    `,
  )
  .eq('patient_id', patientId)
  .eq('week_start', weekStart);

    if (error || !patientTasks) {
      console.error(error);
      return;
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
    const starRewards = [];

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
        newProgress += session.durationMinutes;
      }

      if (newProgress > weeklyTask.target) {
        newProgress = weeklyTask.target;
      }

      const completed = newProgress >= weeklyTask.target;

      updates.push({ id: task.id, progress: newProgress, completed });

      if (completed && !task.completed) {
        starRewards.push(weeklyTask.reward);
      }
    }

    // Batch update
    await Promise.all(
      updates.map((u) =>
        this.supabase.client
          .from('patient_tasks')
          .update({ progress: u.progress, completed: u.completed })
          .eq('id', u.id),
      ),
    );

    // Atomic stars
    const totalNewStars = starRewards.reduce((sum, r) => sum + r, 0);
    if (totalNewStars > 0) {
      await this.supabase.client.rpc('add_stars', {
        patient_id: patientId,
        amount: totalNewStars,
      });
    }
  }

  // =========================================
  // Helpers
  // =========================================

  private calculateAdaptiveTarget(
    lastTarget: number,
    lastActual: number,
    min: number,
    max: number,
  ): number {
    const performance = lastActual / lastTarget;
    let newTarget: number;

    if (performance >= 1.0) newTarget = Math.round(lastTarget * 1.1);
    else if (performance >= 0.8) newTarget = lastTarget;
    else newTarget = Math.round(lastTarget * 0.9);

    return Math.min(Math.max(newTarget, min), max);
  }

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

  private getLastWeekStart(): string {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return this.getMondayOf(d);
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
