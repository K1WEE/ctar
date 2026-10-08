import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Placeholder for the /dashboard route; roleRedirectGuard in app.routes.ts
// always redirects before this renders.
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
export class DashboardComponent {}
