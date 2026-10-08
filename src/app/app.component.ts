import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SupabaseService } from './services/supabase.service';
import { FontScaleService } from './services/font-scale.service';
import { AppNavbarComponent } from './components/app-navbar/app-navbar.component';
import { AppFooterComponent } from './components/app-footer/app-footer.component';

const AUTH_PAGES = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
// Exercise screens stay free of page chrome below the training area.
const NO_FOOTER_PAGES = ['/calibrate', '/game'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppNavbarComponent, AppFooterComponent],
  template: `
    <app-navbar *ngIf="showNavbar()" [path]="currentPath()"></app-navbar>
    <main class="app-page"><router-outlet></router-outlet></main>
    <app-footer *ngIf="showFooter()"></app-footer>
  `
})
export class AppComponent {
  public readonly showNavbar = signal(false);
  public readonly showFooter = signal(false);
  public readonly currentPath = signal('');
  // Created eagerly so the saved font size applies on load; otherwise it would
  // only apply once a font-size control first renders (e.g. opening Settings).
  private readonly fontScale = inject(FontScaleService);

  constructor(private supabase: SupabaseService, private router: Router) {
    this.updateChrome(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateChrome(event.urlAfterRedirects));

    effect(() => {
      // Only execute redirection once Supabase initialization has completed
      if (!this.supabase.isInitialized()) return;

      const user = this.supabase.currentUser();
      const currentUrl = this.router.url.split('?')[0].split('#')[0];
      const isPublicPage = AUTH_PAGES.includes(currentUrl);

      if (user) {
        // If logged in and on auth pages, redirect to dashboard
        if (currentUrl === '/' || currentUrl === '/login' || currentUrl === '/register' || currentUrl === '/forgot-password') {
           this.router.navigate(['/dashboard']);
        }
      } else {
        // Handled mostly by authGuard, but helpful for instant logout reaction
        if (!isPublicPage) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  private updateChrome(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    this.currentPath.set(path);
    // Home and auth pages carry their own language/font controls.
    this.showNavbar.set(!AUTH_PAGES.includes(path));
    this.showFooter.set(!NO_FOOTER_PAGES.includes(path));
  }
}
