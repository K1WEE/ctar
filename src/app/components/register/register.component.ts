import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 relative z-10 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div class="bg-white/80 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-md relative overflow-hidden transition-colors duration-300">
        <!-- Glow -->
        <div class="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500 rounded-full blur-[80px] opacity-20"></div>
        <div class="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>
        
        <div class="text-center mb-8 relative z-10">
          <div class="w-16 h-16 bg-slate-100 dark:bg-brand-dark rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/10 shadow-lg transition-colors duration-300">
            <i class="fa-solid fa-user-plus text-3xl text-emerald-500 dark:text-emerald-400"></i>
          </div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 transition-colors duration-300">Create Account</h1>
          <p class="text-slate-500 dark:text-slate-400">Join CTAR platform</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="space-y-4 relative z-10">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors duration-300">First Name</label>
              <input 
                type="text" 
                [(ngModel)]="firstName" 
                name="firstName"
                required
                class="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none shadow-sm dark:shadow-none"
                placeholder="John">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors duration-300">Last Name</label>
              <input 
                type="text" 
                [(ngModel)]="lastName" 
                name="lastName"
                required
                class="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none shadow-sm dark:shadow-none"
                placeholder="Doe">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors duration-300">Email Address</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fa-regular fa-envelope text-slate-400 dark:text-slate-500"></i>
              </div>
              <input 
                type="email" 
                [(ngModel)]="email" 
                name="email"
                required
                class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none shadow-sm dark:shadow-none"
                placeholder="name@example.com">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors duration-300">Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fa-solid fa-lock text-slate-400 dark:text-slate-500"></i>
              </div>
              <input 
                type="password" 
                [(ngModel)]="password" 
                name="password"
                required
                class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none shadow-sm dark:shadow-none"
                placeholder="••••••••">
            </div>
          </div>

          <div *ngIf="error" class="text-rose-500 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg border border-rose-200 dark:border-rose-500/20 flex items-center transition-colors duration-300">
            <i class="fa-solid fa-circle-exclamation mr-2"></i> {{ error }}
          </div>

          <button 
            type="submit" 
            [disabled]="loading"
            class="w-full bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white font-medium py-3 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2">
            <i *ngIf="loading" class="fa-solid fa-spinner fa-spin mr-2"></i>
            {{ loading ? 'Creating Account...' : 'Sign Up' }}
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400 relative z-10 transition-colors duration-300">
          Already have an account? 
          <a routerLink="/login" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-white font-medium transition-colors">Sign In</a>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  role: 'patient' | 'doctor' = 'patient';
  loading = false;
  error = '';

  constructor(private supabase: SupabaseService, private router: Router) {}

  async onSubmit() {
    if (!this.email || !this.password || !this.firstName || !this.lastName) return;
    
    this.loading = true;
    this.error = '';

    try {
      const { data, error } = await this.supabase.signUp(this.email, this.password, {
        first_name: this.firstName,
        last_name: this.lastName,
        role: this.role
      });
      
      if (error) throw error;
      
      // If sign up is successful, manually insert the user into the public.patients table
      // so that foreign key constraints in the sessions table will pass.
      if (data.user) {
         const { error: dbError } = await this.supabase.client
           .from('patients')
           .insert([{
             id: data.user.id,
             first_name: this.firstName,
             last_name: this.lastName,
             role: this.role
           }]);
           
         if (dbError) {
            console.error("Failed to insert into public.patients:", dbError);
            // We don't throw here because auth was successful, but we could handle it better.
         }
      }
      
      // Auto redirect to dashboard
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loading = false;
    }
  }
}
