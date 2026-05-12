import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg animate-fade-in">
      <div class="flex items-center mb-6">
        <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mr-4">
          <i class="fa-solid fa-users-gear text-lg"></i>
        </div>
        <div>
          <h2 class="text-xl font-bold text-slate-800 dark:text-white">User Management</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">Change roles and manage accounts</p>
        </div>
      </div>

      <div *ngIf="loading" class="flex justify-center py-8">
        <i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-500"></i>
      </div>

      <div *ngIf="error" class="bg-rose-50 text-rose-500 p-4 rounded-xl mb-4">
        <i class="fa-solid fa-triangle-exclamation mr-2"></i> {{ error }}
      </div>

      <div *ngIf="!loading && users.length > 0" class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-sm">
              <th class="pb-3 font-medium px-4">Name</th>
              <th class="pb-3 font-medium px-4">ID</th>
              <th class="pb-3 font-medium px-4">Joined</th>
              <th class="pb-3 font-medium px-4 text-center">Current Role</th>
              <th class="pb-3 font-medium px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users" class="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td class="py-4 px-4 font-medium text-slate-800 dark:text-white">
                {{ u.first_name }} {{ u.last_name }}
              </td>
              <td class="py-4 px-4 text-sm text-slate-500 font-mono">
                {{ u.id.substring(0, 8) }}...
              </td>
              <td class="py-4 px-4 text-sm text-slate-500">
                {{ u.created_at | date:'shortDate' }}
              </td>
              <td class="py-4 px-4 text-center">
                <span 
                  [class.bg-blue-100]="u.role === 'user'" [class.text-blue-700]="u.role === 'user'"
                  [class.bg-emerald-100]="u.role === 'doctor'" [class.text-emerald-700]="u.role === 'doctor'"
                  [class.bg-amber-100]="u.role === 'admin'" [class.text-amber-700]="u.role === 'admin'"
                  class="px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider">
                  {{ u.role }}
                </span>
              </td>
              <td class="py-4 px-4 text-center">
                <div class="flex justify-center gap-2">
                  <button 
                    *ngIf="u.role !== 'user'"
                    (click)="changeRole(u.id, 'user')"
                    [disabled]="updatingId === u.id"
                    class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors">
                    Make User
                  </button>
                  <button 
                    *ngIf="u.role !== 'doctor'"
                    (click)="changeRole(u.id, 'doctor')"
                    [disabled]="updatingId === u.id"
                    class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold rounded-lg transition-colors">
                    Make Doctor
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  users: UserData[] = [];
  loading = true;
  error = '';
  updatingId: string | null = null;

  constructor(private supabase: SupabaseService) {}

  ngOnInit() {
    this.fetchUsers();
  }

  async fetchUsers() {
    this.loading = true;
    this.error = '';
    try {
      const { data, error } = await this.supabase.client
        .from('patients')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      this.users = data || [];
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loading = false;
    }
  }

  async changeRole(userId: string, newRole: string) {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    this.updatingId = userId;
    try {
      const { error } = await this.supabase.client
        .from('patients')
        .update({ role: newRole })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Update local state
      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        this.users[userIndex].role = newRole;
      }
    } catch (e: any) {
      alert('Failed to update role: ' + e.message);
    } finally {
      this.updatingId = null;
    }
  }
}
