import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

// The interface modeling our 20Hz continuous array blocks
export interface RawDataPoint {
  timestamp: number;
  timeLabel: string;
  force: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataSyncService {
  constructor(private supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.client;
  }

  /**
   * Hybrid Architecture Uploader
   * 
   * Bundles 1,000+ continuous data points (e.g. a 50sec session at 20Hz = 1,000 arrays)
   * into an efficient structural JSON Blob, streams it directly into our generic 
   * S3-style Supabase bucket, and instantly pairs the generated `file_url` into PostgreSQL.
   * 
   * @param patientId ID of the actively exercising patient
   * @param rawData Array object sequence collected from `CtarLogicService`
   * @param maxForce Highest peak captured
   * @param reps Repetitions completed according to the Zen Balloon logic constraints
   * @param durationSeconds Length of the test sequence
   */
  async uploadSessionData(
    patientId: string, 
    rawData: RawDataPoint[], 
    maxForce: number, 
    reps: number, 
    durationSeconds: number
  ): Promise<boolean> {
    try {
      // 1. Serialize memory array directly into a file Blob
      const blob = new Blob([JSON.stringify(rawData)], { type: 'application/json' });
      
      // Filename securely structured under patient directory to avoid collisions
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${patientId}/session_${timestamp}.json`;

      // 2. Transmit to Supabase 'raw_clinical_data' storage bucket
      const { data: uploadData, error: uploadError } = await this.supabase
        .storage
        .from('raw_clinical_data')
        .upload(fileName, blob, {
          contentType: 'application/json',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError.message);
        throw uploadError;
      }

      // The distinct bucket path (e.g., patientId/session_xxx.json)
      const storagePath = uploadData.path;

      // 3. Document the hybrid logic by creating relational row in 'sessions'
      const { error: dbError } = await this.supabase
        .from('sessions')
        .insert([{
          patient_id: patientId,
          max_force: maxForce,
          reps: reps,
          duration_seconds: durationSeconds,
          file_url: storagePath // The hybrid link pointing securely to the raw JSON Blob
        }]);

      if (dbError) {
        console.error('PostgreSQL Metadata Insert Error:', dbError.message);
        throw dbError;
      }

      console.log('Successfully synced hybrid session data & metadata.');
      return true;

    } catch (err) {
      console.error('Data Sync failed securely:', err);
      return false;
    }
  }

  /**
   * Retrieves all historical sessions joining patient identity details implicitly.
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
   * Securely grabs the massive Array raw Blob back and parses it locally for 
   * charting without locking the backend.
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
}
