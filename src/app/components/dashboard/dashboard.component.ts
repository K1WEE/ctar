import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
        <p class="text-slate-500 dark:text-slate-400 text-lg">กำลังนำทาง...</p>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = this.supabase.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const role = await this.supabase.getUserRole(user.id);
    if (role === 'doctor') {
      this.router.navigate(['/clinic/records']);
    } else {
      this.router.navigate(['/connect']);
    }
  }
}
