import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface RawDataPoint {
  timestamp: number;
  timeLabel: string;
  force: number;
}

export interface PatientSummary {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  session_count: number;
  last_session_date: string | null;
  last_max_force: number | null;
}

export interface OfflineSession {
  id: string;
  patientId: string;
  rawData: RawDataPoint[];
  maxForce: number;
  avgForce: number;
  reps: number;
  durationSeconds: number;
  timestamp: string;
}

export interface UploadSessionResult {
  success: boolean;
  isOffline?: boolean;
  error?: string;
  alreadyProcessed?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DataSyncService {
  private readonly OFFLINE_QUEUE_KEY = 'ctar_offline_sync_queue';
  private readonly SESSION_STATE_PREFIX = 'ctar_session_state:';
  private syncInFlight: Promise<number> | null = null;
  public pendingSyncCount = signal<number>(0);

  constructor(private supabaseService: SupabaseService) {
    this.updatePendingCount();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncPendingSessions();
      });
      // Initial sync attempt when service loads
      this.syncPendingSessions();
    }
  }

  private get supabase() {
    return this.supabaseService.client;
  }

  private updatePendingCount() {
    try {
      const queue = this.getOfflineQueue();
      this.pendingSyncCount.set(queue.length);
    } catch {
      this.pendingSyncCount.set(0);
    }
  }

  public getOfflineQueue(): OfflineSession[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const stored = localStorage.getItem(this.OFFLINE_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveOfflineSession(session: OfflineSession): boolean {
    try {
      const queue = this.getOfflineQueue();
      if (queue.some(item => item.id === session.id)) {
        this.pendingSyncCount.set(queue.length);
        return true;
      }
      queue.push(session);
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      this.pendingSyncCount.set(queue.length);
      return true;
    } catch (e) {
      console.error('Failed saving to offline queue:', e);
      return false;
    }
  }

  /**
   * Internal worker to perform the storage upload and DB insert.
   */
  private async performUpload(
    sessionId: string,
    patientId: string,
    rawData: ReadonlyArray<RawDataPoint>,
    maxForce: number,
    avgForce: number,
    reps: number,
    durationSeconds: number
  ): Promise<boolean> {
    const blob = new Blob([JSON.stringify(rawData)], { type: 'application/json' });
    // The queue keeps the same id across retries. Deriving the object path
    // from it prevents a DB failure from creating a new file on every retry.
    const fileName = `${patientId}/session_${sessionId}.json`;

    const { error: uploadError } = await this.supabase
      .storage
      .from('raw_clinical_data')
      .upload(fileName, blob, {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError && !this.isAlreadyUploadedError(uploadError)) {
      console.error('Storage Upload Error:', uploadError.message);
      throw uploadError;
    }

    // A previous attempt may have completed the storage step before failing
    // to write its metadata. The deterministic path means an "already
    // exists" response is evidence that we can safely continue to metadata.
    const storagePath = fileName;

    const { error: dbError } = await this.supabase
      .from('sessions')
      .upsert([{
        id: sessionId,
        patient_id: patientId,
        max_force: maxForce,
        avg_force: avgForce,
        reps: reps,
        duration_seconds: durationSeconds,
        file_url: storagePath
      }], { onConflict: 'id', ignoreDuplicates: true });

    if (dbError) {
      console.error('PostgreSQL Metadata Insert Error:', dbError.message);
      throw dbError;
    }

    return true;
  }

  private isAlreadyUploadedError(error: { message?: string; statusCode?: number | string }): boolean {
    const statusCode = Number(error.statusCode);
    return statusCode === 409 || /already exists|duplicate/i.test(error.message || '');
  }

  private getSessionStateKey(patientId: string, sessionId: string): string {
    return `${this.SESSION_STATE_PREFIX}${patientId}:${sessionId}`;
  }

  private getSessionState(patientId: string, sessionId: string): 'queued' | 'synced' | null {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      const state = sessionStorage.getItem(this.getSessionStateKey(patientId, sessionId));
      return state === 'queued' || state === 'synced' ? state : null;
    } catch {
      return null;
    }
  }

  private setSessionState(patientId: string, sessionId: string, state: 'queued' | 'synced'): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(this.getSessionStateKey(patientId, sessionId), state);
      }
    } catch {
      // Session storage is an optimization; the offline queue remains the source of truth.
    }
  }

  /**
   * Hybrid Architecture Uploader with Offline Fallback.
   * If online upload succeeds, returns { success: true }.
   * If offline or network error occurs, queues locally and reports whether the
   * queue write actually succeeded.
   */
  async uploadSessionData(
    patientId: string,
    rawData: ReadonlyArray<RawDataPoint>,
    maxForce: number,
    avgForce: number,
    reps: number,
    durationSeconds: number,
    sessionId?: string
  ): Promise<UploadSessionResult> {
    const id = sessionId || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : String(Date.now()));
    const existingState = this.getSessionState(patientId, id);
    if (existingState === 'synced') {
      return { success: true, isOffline: false, alreadyProcessed: true };
    }

    const existingQueue = this.getOfflineQueue().some(item => item.id === id);
    if (existingState === 'queued' || existingQueue) {
      this.setSessionState(patientId, id, 'queued');
      return { success: true, isOffline: true, alreadyProcessed: true };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const offlineSession: OfflineSession = {
      id,
      patientId,
      rawData: [...rawData],
      maxForce,
      avgForce,
      reps,
      durationSeconds,
      timestamp
    };

    // Check if browser is currently offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queued = this.saveOfflineSession(offlineSession);
      if (queued) this.setSessionState(patientId, id, 'queued');
      return queued
        ? { success: true, isOffline: true, alreadyProcessed: false }
        : { success: false, isOffline: true, error: 'Failed saving session to offline queue.' };
    }

    try {
      await this.performUpload(
        offlineSession.id,
        patientId,
        rawData,
        maxForce,
        avgForce,
        reps,
        durationSeconds
      );
      this.setSessionState(patientId, id, 'synced');
      console.log('Successfully synced hybrid session data & metadata.');
      return { success: true, isOffline: false, alreadyProcessed: false };
    } catch (err: any) {
      console.warn('Network or server upload failed, enqueuing session offline:', err);
      const queued = this.saveOfflineSession(offlineSession);
      if (queued) this.setSessionState(patientId, id, 'queued');
      return queued
        ? { success: true, isOffline: true, alreadyProcessed: false }
        : { success: false, isOffline: true, error: 'Failed saving session to offline queue.' };
    }
  }

  /**
   * Attempts to sync all queued offline sessions to Supabase.
   */
  async syncPendingSessions(): Promise<number> {
    if (this.syncInFlight) return this.syncInFlight;

    const syncPromise = this.syncPendingSessionsInternal();
    this.syncInFlight = syncPromise;

    try {
      return await syncPromise;
    } finally {
      if (this.syncInFlight === syncPromise) this.syncInFlight = null;
    }
  }

  private async syncPendingSessionsInternal(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return 0;

    let syncedCount = 0;
    const syncedIds = new Set<string>();

    for (const item of queue) {
      try {
        await this.performUpload(
          item.id,
          item.patientId,
          item.rawData,
          item.maxForce,
          item.avgForce,
          item.reps,
          item.durationSeconds
        );
        this.setSessionState(item.patientId, item.id, 'synced');
        syncedCount++;
        syncedIds.add(item.id);
      } catch (err) {
        // Keep failed items in the queue for a later retry.
      }
    }

    try {
      // Re-read after the awaits so sessions queued while uploads were in
      // flight are preserved. Only remove snapshot items that uploaded.
      const currentQueue = this.getOfflineQueue();
      const remaining = currentQueue.filter(item => !syncedIds.has(item.id));
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      this.pendingSyncCount.set(remaining.length);
    } catch (e) {
      console.error('Failed updating offline queue:', e);
    }

    return syncedCount;
  }

  /**
   * Retrieves all historical sessions joining patient identity details.
   */
  async fetchAllSessions(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('sessions')
        .select(`
          id, session_date, max_force, reps, duration_seconds, file_url,
          patient_id,
          patients ( first_name, last_name, dob )
        `)
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed fetching sessions:', err);
      return [];
    }
  }

  /**
   * Fetches the most recent session for a specific patient
   */
  async fetchUserPreviousSession(patientId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('session_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Failed fetching previous session:', err);
      return null;
    }
  }

  /**
   * Fetches raw blob data from storage and parses it.
   */
  async fetchRawSessionData(fileUrl: string): Promise<RawDataPoint[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from('raw_clinical_data')
        .download(fileUrl);
        
      if (error) throw error;
      if (!data) return [];

      const text = await data.text();
      return JSON.parse(text) as RawDataPoint[];
    } catch (err) {
      console.error('Failed retrieving raw blob:', err);
      return [];
    }
  }

  /**
   * Fetches patient list with aggregated session data for clinic dashboard.
   * Optimizes performance by querying the single aggregated view first,
   * with a batched 2-query fallback to completely eliminate N+1 latency.
   */
  async fetchPatientList(): Promise<PatientSummary[]> {
    try {
      // 1. Try single query using aggregated view (Instant 1-roundtrip)
      const { data: viewData, error: vError } = await this.supabase
        .from('clinic_patients_summary')
        .select('*')
        .order('first_name', { ascending: true });

      if (!vError && viewData && viewData.length > 0) {
        return viewData.map(row => ({
          id: row.id,
          first_name: row.first_name,
          last_name: row.last_name,
          role: row.role,
          session_count: Number(row.session_count || 0),
          last_session_date: row.last_session_date || null,
          last_max_force: row.last_max_force !== null ? Number(row.last_max_force) : null
        }));
      }

      // 2. Fallback: Batched 2-query fetch to eliminate N+1 loop even without the view
      const { data: patients, error: pError } = await this.supabase
        .from('patients')
        .select('id, first_name, last_name, role')
        .eq('role', 'user');

      if (pError || !patients || patients.length === 0) return [];

      const { data: allSessions } = await this.supabase
        .from('sessions')
        .select('patient_id, session_date, max_force')
        .order('session_date', { ascending: false });

      const sessionsByPatient = new Map<string, any[]>();
      (allSessions || []).forEach(s => {
        if (!sessionsByPatient.has(s.patient_id)) {
          sessionsByPatient.set(s.patient_id, []);
        }
        sessionsByPatient.get(s.patient_id)!.push(s);
      });

      return patients.map(p => {
        const pSessions = sessionsByPatient.get(p.id) || [];
        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          role: p.role,
          session_count: pSessions.length,
          last_session_date: pSessions.length > 0 ? pSessions[0].session_date : null,
          last_max_force: pSessions.length > 0 ? pSessions[0].max_force : null
        };
      });
    } catch (err) {
      console.error('Failed fetching patient list:', err);
      return [];
    }
  }

  /**
   * Fetches sessions for a specific patient, newest first.
   * Pass `limit` when only recent history is needed (e.g. the patient portal
   * shows one week — fetching a year of rows there is wasted transfer).
   */
  async fetchPatientSessions(patientId: string, limit?: number): Promise<any[]> {
    try {
      let query = this.supabase
        .from('sessions')
        .select('id, session_date, max_force, avg_force, reps, duration_seconds, file_url')
        .eq('patient_id', patientId)
        .order('session_date', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed fetching patient sessions:', err);
      return [];
    }
  }

  /**
   * Fetches patient profile information.
   */
  async fetchPatientProfile(patientId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed fetching patient profile:', err);
      return null;
    }
  }

  /**
   * Updates target reps and hold duration settings for a specific patient.
   */
  async updatePatientSettings(patientId: string, targetReps: number, holdDurationMs: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('patients')
        .update({
          target_reps: targetReps,
          hold_duration_ms: holdDurationMs
        })
        .eq('id', patientId)
        .select('id')
        .single();

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update patient settings:', err);
      return false;
    }
  }
}
