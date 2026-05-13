import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataSyncService, PatientSummary } from '../../services/data-sync.service';
import { SupabaseService } from '../../services/supabase.service';
import { I18nService } from '../../services/i18n.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-clinic-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen pb-10 relative z-10 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        <!-- Header -->
        <header class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between items-center rounded-2xl shadow-lg mb-6 gap-4">
          <div class="flex items-center space-x-4">
            <div class="relative group flex-shrink-0">
              <div class="absolute -inset-1 bg-gradient-to-r from-brand-accent to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div class="relative w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-inner">
                <i class="fa-solid fa-user-doctor text-2xl text-brand-accent"></i>
              </div>
            </div>
            <div>
              <h1 class="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ i18n.t('clinic.title') }}</h1>
              <p class="text-xs text-brand-accent font-medium tracking-widest uppercase">{{ i18n.t('clinic.subtitle') }}</p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <!-- Language Toggle -->
            <button (click)="i18n.toggleLang()" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-brand-accent border border-slate-200 dark:border-white/10 transition-all text-sm font-bold">
              {{ i18n.currentLang() === 'th' ? 'EN' : 'TH' }}
            </button>
            <!-- Theme -->
            <button (click)="themeService.toggleTheme()" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-accent border border-slate-200 dark:border-white/10 transition-all">
              <i class="fa-solid" [ngClass]="themeService.isDarkMode() ? 'fa-sun' : 'fa-moon'"></i>
            </button>
            <!-- Refresh -->
            <button (click)="loadPatients()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-600 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-white text-sm font-medium transition-all flex items-center">
              <i class="fa-solid fa-rotate-right mr-2" [class.fa-spin]="isLoading()"></i> {{ i18n.t('clinic.refresh') }}
            </button>
            <!-- Logout -->
            <button (click)="logout()" class="px-3 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-white/10 hover:border-rose-300 rounded-xl transition-all text-sm font-medium">
              <i class="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </header>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-lg">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <i class="fa-solid fa-users text-xl text-indigo-600 dark:text-indigo-400"></i>
              </div>
              <div>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ i18n.t('clinic.totalPatients') }}</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ patients().length }}</p>
              </div>
            </div>
          </div>
          <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-lg">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <i class="fa-solid fa-chart-bar text-xl text-emerald-600 dark:text-emerald-400"></i>
              </div>
              <div>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ i18n.t('clinic.totalSessions') }}</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ totalSessions() }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Search -->
        <div class="mb-6">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <i class="fa-solid fa-search text-slate-400"></i>
            </div>
            <input type="text" [(ngModel)]="searchQuery" 
              class="w-full pl-11 pr-4 py-3 text-base bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-accent text-slate-900 dark:text-white placeholder-slate-400 outline-none backdrop-blur-xl"
              [placeholder]="i18n.t('clinic.search')">
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading()" class="text-center py-16">
          <div class="relative w-16 h-16 mx-auto mb-4">
            <div class="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
            <div class="absolute inset-2 rounded-full border-r-2 border-brand-accent animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!isLoading() && filteredPatients().length === 0" class="text-center py-16 bg-white/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
          <i class="fa-solid fa-users-slash text-5xl text-slate-300 dark:text-slate-600 mb-4"></i>
          <p class="text-lg text-slate-500">{{ i18n.t('clinic.noPatients') }}</p>
        </div>

        <!-- Patient Cards Grid -->
        <div *ngIf="!isLoading() && filteredPatients().length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let p of filteredPatients()" 
            class="bg-white/80 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-brand-accent/50 group cursor-pointer"
            (click)="viewPatient(p.id)">
            
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/30 text-lg font-bold">
                {{ (p.first_name || '?')[0] }}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-slate-900 dark:text-white truncate text-lg group-hover:text-brand-accent transition-colors">
                  {{ p.first_name }} {{ p.last_name }}
                </h3>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  {{ p.session_count }} {{ i18n.t('clinic.sessions') }}
                </p>
              </div>
            </div>

            <div *ngIf="p.last_session_date" class="text-sm text-slate-500 dark:text-slate-400 mb-3 flex items-center">
              <i class="fa-regular fa-clock mr-2 text-xs"></i>
              {{ i18n.t('clinic.lastSession') }} {{ p.last_session_date | date:'MMM d, y' }}
            </div>
            <div *ngIf="!p.last_session_date" class="text-sm text-slate-400 dark:text-slate-500 mb-3 italic">
              {{ i18n.t('clinic.noSessions') }}
            </div>

            <div *ngIf="p.last_max_force" class="flex items-center justify-between text-sm">
              <span class="text-slate-500">{{ i18n.t('detail.maxForce') }}</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ p.last_max_force | number:'1.0-1' }} N</span>
            </div>

            <button class="mt-4 w-full py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-brand-accent hover:text-white text-slate-600 dark:text-slate-300 font-medium rounded-xl transition-all duration-300 text-sm border border-slate-200 dark:border-white/5 group-hover:bg-brand-accent group-hover:text-white group-hover:border-brand-accent">
              <i class="fa-solid fa-arrow-right mr-2"></i> {{ i18n.t('clinic.viewDetails') }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class ClinicDashboardComponent implements OnInit {
  public patients = signal<PatientSummary[]>([]);
  public isLoading = signal(false);
  public searchQuery = '';
  public i18n = inject(I18nService);
  public themeService = inject(ThemeService);

  constructor(
    private dataSync: DataSyncService,
    private supabase: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPatients();
  }

  async loadPatients() {
    this.isLoading.set(true);
    const data = await this.dataSync.fetchPatientList();
    this.patients.set(data);
    this.isLoading.set(false);
  }

  totalSessions() {
    return this.patients().reduce((sum, p) => sum + p.session_count, 0);
  }

  filteredPatients(): PatientSummary[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.patients();
    return this.patients().filter(p => 
      (p.first_name + ' ' + p.last_name).toLowerCase().includes(q)
    );
  }

  viewPatient(id: string) {
    this.router.navigate(['/clinic/patient', id]);
  }

  async logout() {
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/login']);
  }
}
