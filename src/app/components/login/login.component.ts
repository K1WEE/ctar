import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 relative z-10 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div class="bg-white/80 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-md relative overflow-hidden transition-colors duration-300">
        <!-- Glow -->
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-brand-accent rounded-full blur-[80px] opacity-20"></div>
        <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>

        <!-- Language toggle -->
        <div class="flex justify-end mb-2 relative z-10">
          <button (click)="i18n.toggleLang()" class="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-brand-accent transition-colors border border-slate-200 dark:border-white/10">
            {{ i18n.currentLang() === 'th' ? 'EN' : 'TH' }}
          </button>
        </div>
        
        <div class="text-center mb-8 relative z-10">
          <div class="w-16 h-16 bg-slate-100 dark:bg-brand-dark rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/10 shadow-lg transition-colors duration-300">
            <i class="fa-solid fa-staff-snake text-3xl text-brand-accent"></i>
          </div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 transition-colors duration-300">{{ i18n.t('login.welcome') }}</h1>
          <p class="text-slate-500 dark:text-slate-400 text-base">{{ i18n.t('login.subtitle') }}</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="space-y-5 relative z-10">
          <div>
            <label class="block text-base font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors duration-300">{{ i18n.t('login.email') }}</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fa-regular fa-envelope text-slate-400 dark:text-slate-500"></i>
              </div>
              <input 
                type="email" 
                [(ngModel)]="email" 
                name="email"
                required
                class="w-full pl-10 pr-4 py-4 text-base bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none shadow-sm dark:shadow-none"
                placeholder="name@example.com">
            </div>
          </div>

          <div>
            <label class="block text-base font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors duration-300">{{ i18n.t('login.password') }}</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fa-solid fa-lock text-slate-400 dark:text-slate-500"></i>
              </div>
              <input 
                type="password" 
                [(ngModel)]="password" 
                name="password"
                required
                class="w-full pl-10 pr-4 py-4 text-base bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none shadow-sm dark:shadow-none"
                placeholder="••••••••">
            </div>
          </div>

          <div *ngIf="error" class="text-rose-500 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg border border-rose-200 dark:border-rose-500/20 flex items-center transition-colors duration-300">
            <i class="fa-solid fa-circle-exclamation mr-2"></i> {{ error }}
          </div>

          <button 
            type="submit" 
            [disabled]="loading"
            class="w-full min-h-[56px] bg-brand-accent hover:bg-brand-accent/90 text-white font-medium text-lg rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
            <i *ngIf="loading" class="fa-solid fa-spinner fa-spin mr-2"></i>
            {{ loading ? i18n.t('login.loading') : i18n.t('login.submit') }}
          </button>
        </form>

        <div class="mt-6 text-center text-base text-slate-500 dark:text-slate-400 relative z-10 transition-colors duration-300">
          {{ i18n.t('login.noAccount') }} 
          <a routerLink="/register" class="text-brand-accent hover:text-blue-700 dark:hover:text-white font-medium transition-colors">{{ i18n.t('login.createOne') }}</a>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';
  public i18n = inject(I18nService);

  constructor(private supabase: SupabaseService, private router: Router) {}

  async onSubmit() {
    if (!this.email || !this.password) return;
    
    this.loading = true;
    this.error = '';

    try {
      const { error } = await this.supabase.signIn(this.email, this.password);
      if (error) throw error;
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loading = false; 
    }
  }
}
