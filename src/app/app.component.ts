import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { SupabaseService } from './services/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  constructor(private supabase: SupabaseService, private router: Router) {
    effect(() => {
      const user = this.supabase.currentUser();
      if (user) {
        // If logged in and on auth pages, redirect to dashboard
        if (this.router.url === '/login' || this.router.url === '/register') {
           this.router.navigate(['/dashboard']);
        }
      } else {
        // Handled mostly by authGuard, but helpful for instant logout reaction
        this.router.navigate(['/login']);
      }
    });
  }
}
