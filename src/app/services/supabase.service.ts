import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public client: SupabaseClient;
  public currentUser = signal<User | null>(null);
  public userRole = signal<string>('user');

  constructor() {
    this.client = createClient(environment.supabase.url, environment.supabase.key);
    
    // Check initial session
    this.client.auth.getSession().then(({ data }) => {
      const user = data.session?.user || null;
      this.currentUser.set(user);
      if (user) {
        this.fetchAndSetRole(user.id);
      }
    });

    // Listen to auth changes
    this.client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      this.currentUser.set(user);
      if (user) {
        this.fetchAndSetRole(user.id);
      } else {
        this.userRole.set('user');
      }
    });
  }

  private async fetchAndSetRole(userId: string) {
    const role = await this.getUserRole(userId);
    this.userRole.set(role);
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
