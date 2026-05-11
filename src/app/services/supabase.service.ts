import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public client: SupabaseClient;
  public currentUser = signal<User | null>(null);

  constructor() {
    this.client = createClient(environment.supabase.url, environment.supabase.key);
    
    // Check initial session
    this.client.auth.getSession().then(({ data }) => {
      this.currentUser.set(data.session?.user || null);
    });

    // Listen to auth changes
    this.client.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user || null);
    });
  }

  async signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string, metadata: any) {
    return this.client.auth.signUp({ 
      email, 
      password,
      options: {
        data: metadata
      }
    });
  }

  async getUserRole(userId: string): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('patients')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error("Error fetching user role:", error);
        return 'user';
      }
      return data?.role || 'user';
    } catch (e) {
      return 'user';
    }
  }
}
