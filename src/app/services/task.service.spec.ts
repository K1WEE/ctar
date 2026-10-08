import { TaskService } from './task.service';
import { SupabaseService } from './supabase.service';

// Chainable query stub: every builder method returns itself and awaiting it
// resolves to the configured result, mirroring the Supabase query builder.
function queryStub(result: { data: any; error: any }) {
  const q: any = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'update', 'single']) {
    q[m] = jasmine.createSpy(m).and.callFake(() => q);
  }
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

function patientTask(id: string, title: string, progress: number, target: number, completed = false) {
  return {
    id: `pt-${id}`,
    progress,
    completed,
    weekly_tasks: { id, title, icon: `fa-${id}`, target, reward: 5 },
  };
}

describe('TaskService.updateTasksAfterSession', () => {
  let tasksResult: { data: any; error: any };
  // Row the DB returns after the trigger derives progress/completed, keyed by patient_tasks.id.
  let savedRows: Record<string, { data: any; error: any }>;
  let updatePayloads: any[];
  let rpc: jasmine.Spy;
  let service: TaskService;
  const session = { maxForce: 10, durationMinutes: 2, reps: 5 };

  beforeEach(() => {
    tasksResult = { data: [], error: null };
    savedRows = {};
    updatePayloads = [];
    rpc = jasmine.createSpy('rpc').and.resolveTo({ data: 5, error: null });
    const client = {
      from: (table: string) => {
        if (table === 'patient_tasks') {
          // The first query loads the week's tasks; later ones are per-row updates.
          const q = queryStub(tasksResult);
          q.update.and.callFake((payload: any) => {
            updatePayloads.push(payload);
            q.eq.and.callFake((_col: string, id: string) => {
              q.then = (res: any, rej: any) =>
                Promise.resolve(savedRows[id] ?? { data: null, error: { message: 'no row' } }).then(res, rej);
              return q;
            });
            return q;
          });
          return q;
        }
        if (table === 'sessions') return queryStub({ data: [], error: null });
        throw new Error(`unexpected table ${table}`);
      },
      rpc,
    };
    service = new TaskService({ client } as unknown as SupabaseService);
    spyOn(console, 'error');
    spyOn(console, 'warn');
  });

  it('returns only missions whose progress moved this session', async () => {
    tasksResult.data = [
      patientTask('fighter', 'นักสู้ CTAR', 2, 5),
      patientTask('force', 'พลังคอสุดแกร่ง', 0, 50),
      patientTask('done', 'สายอึด', 30, 30, true),
    ];
    savedRows['pt-fighter'] = { data: { progress: 3, completed: false }, error: null };
    savedRows['pt-force'] = { data: { progress: 0, completed: false }, error: null };

    const results = await service.updateTasksAfterSession('p1', session);

    expect(results).toEqual([
      {
        taskId: 'fighter',
        title: 'นักสู้ CTAR',
        icon: 'fa-fighter',
        target: 5,
        previousProgress: 2,
        progress: 3,
        completedNow: false,
        starsAwarded: 0,
      },
    ]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reports the stars the server actually awarded for a newly completed mission', async () => {
    tasksResult.data = [patientTask('fighter', 'นักสู้ CTAR', 4, 5)];
    savedRows['pt-fighter'] = { data: { progress: 5, completed: true }, error: null };

    const [result] = await service.updateTasksAfterSession('p1', session);

    expect(rpc).toHaveBeenCalledWith('claim_task_reward', { p_patient_id: 'p1', p_task_id: 'fighter' });
    expect(result.completedNow).toBeTrue();
    expect(result.starsAwarded).toBe(5);
  });

  it('awards zero stars when the claim RPC returns an error', async () => {
    tasksResult.data = [patientTask('fighter', 'นักสู้ CTAR', 4, 5)];
    savedRows['pt-fighter'] = { data: { progress: 5, completed: true }, error: null };
    rpc.and.resolveTo({ data: null, error: { message: 'denied' } });

    const [result] = await service.updateTasksAfterSession('p1', session);

    expect(result.completedNow).toBeTrue();
    expect(result.starsAwarded).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });

  it('never sends the completion flag, which the DB trigger derives itself', async () => {
    tasksResult.data = [patientTask('fighter', 'นักสู้ CTAR', 4, 5)];
    savedRows['pt-fighter'] = { data: { progress: 5, completed: true }, error: null };

    await service.updateTasksAfterSession('p1', session);

    expect(updatePayloads).toEqual([{ progress: 5 }]);
  });

  it('trusts the progress the DB saved over the client estimate', async () => {
    tasksResult.data = [patientTask('fighter', 'นักสู้ CTAR', 4, 5)];
    // Client expects 5/5, but the server only counts 4 sessions this week.
    savedRows['pt-fighter'] = { data: { progress: 4, completed: false }, error: null };

    expect(await service.updateTasksAfterSession('p1', session)).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('skips a mission whose update the DB rejected', async () => {
    tasksResult.data = [patientTask('fighter', 'นักสู้ CTAR', 4, 5)];
    savedRows['pt-fighter'] = { data: null, error: { message: 'trigger rejected' } };

    expect(await service.updateTasksAfterSession('p1', session)).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('returns an empty list when missions cannot be loaded', async () => {
    tasksResult.data = null;
    tasksResult.error = { message: 'offline' };

    expect(await service.updateTasksAfterSession('p1', session)).toEqual([]);
  });
});
