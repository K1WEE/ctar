import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SupabaseService } from '../../services/supabase.service';
import { DataSyncService } from '../../services/data-sync.service';
import { I18nService } from '../../services/i18n.service';
import { BleService } from '../../services/ble.service';

@Component({
  selector: 'app-patient-portal',
  standalone: true,
  imports: [CommonModule, HeaderComponent, RouterLink],
  template: `
    <div class="min-h-screen pb-10 relative z-10 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div class="max-w-md md:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        <div class="mb-6 block w-full">
           <app-header [connectionState]="bleService.connectionState" (onLogout)="logout()"></app-header>
        </div>

        <main class="animate-fade-in space-y-6">
          
          <!-- Welcome Section -->
          <div class="bg-white/80 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-brand-accent/20 rounded-full blur-[80px] group-hover:bg-brand-accent/30 transition-all duration-700"></div>
            
            <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {{ i18n.t('portal.welcome') }}, {{ patientName() || '...' }} 👋
            </h2>
            <p class="text-slate-500 dark:text-slate-400 text-lg">
              {{ i18n.t('portal.ready') }}
            </p>
          </div>

          <!-- Main Actions -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- Play Button Card -->
            <div class="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-8 shadow-lg shadow-indigo-500/30 text-white relative overflow-hidden flex flex-col justify-between min-h-[200px]">
              <div class="absolute -bottom-10 -right-10 opacity-20">
                <i class="fa-solid fa-gamepad text-9xl"></i>
              </div>
              <div class="relative z-10">
                <h3 class="text-2xl font-bold mb-2">{{ i18n.t('portal.startSession') }}</h3>
                <p class="text-blue-100 mb-6">{{ i18n.t('portal.startDesc') }}</p>
              </div>
              <button 
                routerLink="/connect"
                class="relative z-10 w-full min-h-[56px] bg-white text-indigo-600 hover:bg-slate-50 font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl flex items-center justify-center transform hover:scale-[1.02] active:scale-[0.98]">
                <i class="fa-solid fa-play mr-2"></i> {{ i18n.t('portal.startBtn') }}
              </button>
            </div>

            <!-- Stats Card -->
            <div class="bg-white/80 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl flex flex-col justify-between min-h-[200px]">
              <div>
                <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <i class="fa-solid fa-chart-simple text-brand-accent mr-3"></i> {{ i18n.t('portal.statsTitle') }}
                </h3>
                
                <div *ngIf="isLoading()" class="flex justify-center py-4">
                  <i class="fa-solid fa-spinner fa-spin text-2xl text-brand-accent"></i>
                </div>

                <div *ngIf="!isLoading() && !lastSession()" class="text-center py-4 text-slate-500 dark:text-slate-400">
                  <i class="fa-solid fa-box-open text-3xl mb-2 opacity-50"></i>
                  <p>{{ i18n.t('portal.noStats') }}</p>
                </div>

                <div *ngIf="!isLoading() && lastSession()" class="space-y-4">
                  <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">{{ i18n.t('detail.maxForce') }}</span>
                    <span class="text-xl font-bold text-emerald-600 dark:text-emerald-400">{{ lastSession().max_force | number:'1.0-1' }} N</span>
                  </div>
                  <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">{{ i18n.t('detail.reps') }}</span>
                    <span class="text-xl font-bold text-amber-600 dark:text-amber-400">{{ lastSession().reps }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  `
})
export class PatientPortalComponent implements OnInit {
  public patientName = signal<string>('');
  public lastSession = signal<any>(null);
  public isLoading = signal(true);

  public i18n = inject(I18nService);
  public bleService = inject(BleService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private dataSync = inject(DataSyncService);

  async ngOnInit() {
    const user = this.supabase.currentUser();
    if (user) {
      // Get basic profile
      try {
        const { data } = await this.supabase.client.from('patients').select('first_name').eq('id', user.id).single();
        if (data) this.patientName.set(data.first_name);
        
        // Get last session
        const session = await this.dataSync.fetchUserPreviousSession(user.id);
        this.lastSession.set(session);
      } catch(e) {
        console.error(e);
      }
    }
    this.isLoading.set(false);
  }

  async logout() {
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/login']);
  }
}
