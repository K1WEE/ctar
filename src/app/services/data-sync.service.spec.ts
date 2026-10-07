import { DataSyncService } from './data-sync.service';
import { SupabaseService } from './supabase.service';

describe('DataSyncService patient settings', () => {
  let service: DataSyncService;
  let query: any;

  beforeEach(() => {
    // Keep offline syncing out of these settings persistence tests.
    spyOn(DataSyncService.prototype, 'syncPendingSessions').and.resolveTo(0);
    spyOn(window, 'addEventListener');
    query = {
      update: jasmine.createSpy('update').and.callFake(() => query),
      eq: jasmine.createSpy('eq').and.callFake(() => query),
      select: jasmine.createSpy('select').and.callFake(() => query),
      single: jasmine.createSpy('single'),
    };
    service = new DataSyncService({
      client: { from: () => query },
    } as unknown as SupabaseService);
    spyOn(console, 'error');
  });

  it('saves both settings and requires a returned patient row', async () => {
    query.single.and.resolveTo({ data: { id: 'patient-id' }, error: null });

    expect(await service.updatePatientSettings('patient-id', 12, 2500)).toBeTrue();
    expect(query.update).toHaveBeenCalledWith({ target_reps: 12, hold_duration_ms: 2500 });
    expect(query.eq).toHaveBeenCalledWith('id', 'patient-id');
    expect(query.select).toHaveBeenCalledWith('id');
    expect(query.single).toHaveBeenCalled();
  });

  it('does not report success when the database is missing a settings column', async () => {
    query.single.and.resolveTo({ data: null, error: { code: 'PGRST204' } });
    expect(await service.updatePatientSettings('patient-id', 12, 2500)).toBeFalse();
  });

  it('does not report success when RLS or a missing patient matches no rows', async () => {
    query.single.and.resolveTo({ data: null, error: { code: 'PGRST116' } });
    expect(await service.updatePatientSettings('patient-id', 12, 2500)).toBeFalse();
  });
});
