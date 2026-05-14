import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BleService } from '../../services/ble.service';
import { SupabaseService } from '../../services/supabase.service';
import { HeaderComponent } from '../header/header.component';
import { ResearcherDashboardComponent } from '../researcher-dashboard/researcher-dashboard.component';
import { ClassicDashboardComponent } from '../classic-dashboard/classic-dashboard.component';
import { AdminDashboardComponent } from '../admin-dashboard/admin-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, ResearcherDashboardComponent, ClassicDashboardComponent, AdminDashboardComponent],
  template: `
    <div class="min-h-screen pb-10 relative z-10 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div class="mb-6 block w-full">
           <app-header [connectionState]="bleService.connectionState" (onLogout)="logout()"></app-header>
        </div>
        
        <main *ngIf="userRole" class="animate-fade-in">
          <!-- Navigation Tabs -->
          <div class="flex flex-col sm:flex-row justify-center items-center mb-8 bg-white/70 dark:bg-brand-card backdrop-blur-xl p-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div class="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl flex space-x-1 w-full sm:w-auto">
              
              <button *ngIf="supabase.userRole() === 'admin'"
                (click)="activeTab = 'users'"
                [class.bg-white]="activeTab === 'users'"
                [class.dark:bg-slate-600]="activeTab === 'users'"
                [class.text-amber-600]="activeTab === 'users'"
                [class.dark:text-white]="activeTab === 'users'"
                [class.shadow-sm]="activeTab === 'users'"
                [class.text-slate-500]="activeTab !== 'users'"
                class="flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center space-x-2">
                <i class="fa-solid fa-users-gear"></i>
                <span>User Management</span>
              </button>

              <button *ngIf="isDoctorOrAdmin()"
                (click)="activeTab = 'records'"
                [class.bg-white]="activeTab === 'records'"
                [class.dark:bg-slate-600]="activeTab === 'records'"
                [class.text-indigo-600]="activeTab === 'records'"
                [class.dark:text-white]="activeTab === 'records'"
                [class.shadow-sm]="activeTab === 'records'"
                [class.text-slate-500]="activeTab !== 'records'"
                class="flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center space-x-2">
                <i class="fa-solid fa-microscope"></i>
                <span>Clinical Records</span>
              </button>

              <button 
                (click)="activeTab = 'classic'"
                [class.bg-white]="activeTab === 'classic'"
                [class.dark:bg-slate-600]="activeTab === 'classic'"
                [class.text-blue-600]="activeTab === 'classic'"
                [class.dark:text-white]="activeTab === 'classic'"
                [class.shadow-sm]="activeTab === 'classic'"
                [class.text-slate-500]="activeTab !== 'classic'"
                class="flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center space-x-2 hover:bg-white/50 dark:hover:bg-slate-700/50">
                <i class="fa-solid fa-chart-line"></i>
                <span>Classic Dashboard</span>
              </button>
              
              <button 
                (click)="goToGameFlow()"
                class="text-slate-500 flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center space-x-2 hover:bg-white/50 dark:hover:bg-slate-700/50">
                <i class="fa-solid fa-gamepad"></i>
                <span>Game Flow</span>
              </button>
            </div>
          </div>

          <!-- Tab Contents -->
          <div *ngIf="activeTab === 'users' && supabase.userRole() === 'admin'">
             <app-admin-dashboard></app-admin-dashboard>
          </div>

          <div *ngIf="activeTab === 'records' && isDoctorOrAdmin()">
             <app-researcher-dashboard></app-researcher-dashboard>
          </div>
          
          <div *ngIf="activeTab === 'classic'">
             <app-classic-dashboard></app-classic-dashboard>
          </div>

        </main>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  public userRole = ''; // Default until fetched
  public activeTab: 'classic' | 'game' | 'records' | 'users' = 'classic';

  constructor(
    public bleService: BleService,
    public supabase: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = this.supabase.currentUser();
    if (user) {
      this.userRole = await this.supabase.getUserRole(user.id);
      if (this.userRole === 'doctor' || this.userRole === 'admin') {
        this.activeTab = 'records';
      } else {
        this.activeTab = 'classic';
      }
    }
  }

  goToGameFlow() {
    if (this.bleService.connectionState() === 'Connected') {
      this.router.navigate(['/calibrate']);
    } else {
      this.router.navigate(['/connect']);
    }
  }

  isDoctorOrAdmin(): boolean {
    return this.userRole === 'doctor' || this.userRole === 'admin';
  }

  async logout() {
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/login']);
  }
}
