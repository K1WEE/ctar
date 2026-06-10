import { Injectable } from '@angular/core';
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
   */
  async uploadSessionData(
    patientId: string, 
    rawData: RawDataPoint[], 
    maxForce: number, 
    avgForce: number,
    reps: number, 
    durationSeconds: number
  ): Promise<boolean> {
    try {
      const blob = new Blob([JSON.stringify(rawData)], { type: 'application/json' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${patientId}/session_${timestamp}.json`;

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

      const storagePath = uploadData.path;

      const { error: dbError } = await this.supabase
        .from('sessions')
        .insert([{
          patient_id: patientId,
          max_force: maxForce,
          avg_force: avgForce,
          reps: reps,
          duration_seconds: durationSeconds,
          file_url: storagePath
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
   */
  async fetchPatientList(): Promise<PatientSummary[]> {
    try {
      // Get all patients
      const { data: patients, error: pError } = await this.supabase
        .from('patients')
        .select('id, first_name, last_name, role')
        .eq('role', 'user');

      if (pError) throw pError;
      if (!patients || patients.length === 0) return [];

      // Get session counts and last sessions per patient
      const summaries: PatientSummary[] = [];

      for (const patient of patients) {
        const { data: sessions, error: sError } = await this.supabase
          .from('sessions')
          .select('session_date, max_force')
          .eq('patient_id', patient.id)
          .order('session_date', { ascending: false });

        if (sError) {
          console.error('Error fetching sessions for', patient.id, sError);
        }

        summaries.push({
          id: patient.id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          role: patient.role,
          session_count: sessions?.length || 0,
          last_session_date: sessions && sessions.length > 0 ? sessions[0].session_date : null,
          last_max_force: sessions && sessions.length > 0 ? sessions[0].max_force : null
        });
      }

      return summaries;
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
}
