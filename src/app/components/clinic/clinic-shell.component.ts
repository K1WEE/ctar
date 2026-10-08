import { Component, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { I18nService } from '../../services/i18n.service';
import { ThemeService } from '../../services/theme.service';
import { SupabaseService } from '../../services/supabase.service';
import { FontScaleControlComponent } from '../font-scale-control/font-scale-control.component';
import { BatteryStatusComponent } from '../battery-status/battery-status.component';

interface ClinicNavItem {
  path: string;
  labelKey: string;
  icon: 'users' | 'records' | 'live';
  adminOnly?: boolean;
  /** Extra URL prefixes that should also highlight this item. */
  alsoActive?: string;
}

/** Sidebar layout shared by every /clinic/* page (admin and doctor). */
@Component({
  selector: 'app-clinic-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FontScaleControlComponent, BatteryStatusComponent],
  template: `
    <div class="patient-palette clinic-page min-h-screen lg:pl-[272px]">

      <!-- Mobile drawer backdrop -->
      <div *ngIf="drawerOpen()" class="fixed inset-0 z-[70] bg-slate-900/50 lg:hidden" (click)="closeDrawer()" aria-hidden="true"></div>

      <!-- Sidebar -->
      <aside id="clinic-sidebar" class="sidebar fixed inset-y-0 left-0 z-[80] flex w-[272px] flex-col border-r"
        [class.is-open]="drawerOpen()" [attr.aria-label]="i18n.t('clinic.nav.label')">
        <div class="flex items-center justify-between gap-2 px-5 pb-4 pt-5">
          <a routerLink="/clinic" class="brand-link flex min-h-12 items-center" [attr.aria-label]="i18n.t('clinic.brand')">
            <img src="assets/aerochin-logo.png" alt="AeroChin CTAR PRO" class="h-auto w-40">
          </a>
          <button type="button" class="icon-btn mobile-only" (click)="closeDrawer()" [attr.aria-label]="i18n.t('clinic.nav.close')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3" [attr.aria-label]="i18n.t('clinic.nav.label')">
          <p class="section-label px-3 pb-2">{{ i18n.t('clinic.brand') }}</p>
          <ul class="space-y-1">
            <ng-container *ngFor="let item of navItems">
              <li *ngIf="!item.adminOnly || supabase.userRole() === 'admin'">
                <a [routerLink]="item.path" routerLinkActive #rla="routerLinkActive"
                  class="nav-item" [class.is-active]="rla.isActive || isAlsoActive(item)"
                  [attr.aria-current]="rla.isActive || isAlsoActive(item) ? 'page' : null"
                  (click)="closeDrawer()">
                  <ng-container [ngSwitch]="item.icon">
                    <svg *ngSwitchCase="'users'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <svg *ngSwitchCase="'records'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/></svg>
                    <svg *ngSwitchCase="'live'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  </ng-container>
                  <span>{{ i18n.t(item.labelKey) }}</span>
                </a>
              </li>
            </ng-container>
            <li>
              <a routerLink="/patient-portal" class="nav-item" data-patient-portal-link (click)="closeDrawer()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/></svg>
                <span>{{ i18n.t('clinic.nav.portal') }}</span>
              </a>
            </li>
          </ul>

          <p class="section-label px-3 pb-2 pt-6">{{ i18n.t('clinic.preferences') }}</p>
          <div class="space-y-3 px-3">
            <div role="group" [attr.aria-label]="i18n.t('clinic.language')" class="lang-group">
              <button type="button" lang="th" (click)="i18n.setLang('th')" [attr.aria-pressed]="i18n.currentLang() === 'th'">ไทย</button>
              <button type="button" lang="en" (click)="i18n.setLang('en')" [attr.aria-pressed]="i18n.currentLang() === 'en'">English</button>
            </div>
            <button type="button" class="nav-item w-full justify-between" (click)="theme.toggleTheme()" [attr.aria-pressed]="theme.isDarkMode()">
              <span class="flex items-center gap-3">
                <svg *ngIf="!theme.isDarkMode()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                <svg *ngIf="theme.isDarkMode()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                {{ i18n.t('clinic.darkMode') }}
              </span>
              <span class="pp-muted">{{ theme.isDarkMode() ? i18n.t('clinic.on') : i18n.t('clinic.off') }}</span>
            </button>
            <app-font-scale-control [inline]="true"></app-font-scale-control>
          </div>
        </nav>

        <!-- User card -->
        <div class="flex items-center gap-3 border-t px-5 py-4 user-card">
          <span class="cl-avatar" aria-hidden="true">{{ userInitial() }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold pp-ink">{{ userName() || i18n.t('clinic.account') }}</p>
            <p class="truncate pp-muted">{{ i18n.t('clinic.role.' + supabase.userRole()) }}</p>
          </div>
          <button type="button" class="icon-btn logout" (click)="logout()" [attr.aria-label]="i18n.t('clinic.logout')" [title]="i18n.t('clinic.logout')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </aside>

      <!-- Top bar -->
      <header class="topbar sticky top-0 z-[60] border-b">
        <div class="flex min-h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" class="icon-btn mobile-only" data-clinic-menu (click)="openDrawer()"
            [attr.aria-expanded]="drawerOpen()" aria-controls="clinic-sidebar" [attr.aria-label]="i18n.t('clinic.nav.open')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <a *ngIf="backTo()" [routerLink]="backTo()" class="icon-btn" [attr.aria-label]="i18n.t('clinic.back')" [title]="i18n.t('clinic.back')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7M19 12H5"/></svg>
          </a>
          <h1 class="min-w-0 flex-1 truncate text-xl font-bold pp-ink sm:text-2xl">{{ i18n.t(titleKey()) }}</h1>
          <app-battery-status presentation="indicator" [iconOnly]="true"></app-battery-status>
        </div>
        <div class="px-4 sm:px-6 lg:px-8"><app-battery-status presentation="notice"></app-battery-status></div>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pp-ink">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .sidebar { background: var(--pp-surface); border-color: var(--pp-border); transform: translateX(-100%); transition: transform 200ms ease; }
    .sidebar.is-open { transform: none; box-shadow: 0 10px 40px rgb(15 23 42 / 25%); }
    @media (min-width: 1024px) { .sidebar { transform: none; } .sidebar.is-open { box-shadow: none; } .icon-btn.mobile-only { display: none; } }
    .topbar { background: var(--pp-surface); border-color: var(--pp-border); }
    .user-card { border-color: var(--pp-border); }
    .section-label { font-size: .875rem; font-weight: 600; color: var(--pp-muted); }
    .nav-item { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 8px 12px; border-radius: 10px; font-weight: 600; color: var(--pp-ink); transition: background-color 150ms ease, color 150ms ease; }
    .nav-item:hover { background: var(--pp-subtle); }
    .nav-item.is-active { background: var(--pp-action-soft); color: var(--pp-action); }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: 10px; color: var(--pp-ink); transition: background-color 150ms ease, color 150ms ease; }
    .icon-btn:hover { background: var(--pp-subtle); }
    .icon-btn.logout:hover { color: #be123c; background: #fff1f2; }
    :host-context(.dark) .icon-btn.logout:hover { color: #fda4af; background: rgb(244 63 94 / 15%); }
    .lang-group { display: flex; gap: 4px; padding: 4px; border-radius: 10px; border: 1px solid var(--pp-border); }
    .lang-group button { flex: 1; min-height: 40px; border-radius: 8px; font-weight: 600; color: var(--pp-muted); }
    .lang-group button:hover { background: var(--pp-subtle); }
    .lang-group button[aria-pressed="true"] { background: #1746c8; color: #fff; }
    :host-context(.dark) .brand-link { background: white; border-radius: 8px; padding: 4px 8px; }
  `]
})
export class ClinicShellComponent implements OnInit {
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);
  readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly drawerOpen = signal(false);
  readonly titleKey = signal('clinic.title');
  readonly backTo = signal<string | null>(null);
  readonly userName = signal('');
  readonly userInitial = signal('U');

  readonly navItems: ClinicNavItem[] = [
    { path: '/clinic/users', labelKey: 'clinic.nav.users', icon: 'users', adminOnly: true },
    { path: '/clinic/records', labelKey: 'clinic.nav.records', icon: 'records', alsoActive: '/clinic/patient/' },
    { path: '/clinic/live', labelKey: 'clinic.nav.live', icon: 'live' },
  ];

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => { this.syncRouteData(); this.drawerOpen.set(false); });
  }

  ngOnInit(): void {
    this.syncRouteData();
    void this.loadUser();
  }

  isAlsoActive(item: ClinicNavItem): boolean {
    return !!item.alsoActive && this.router.url.startsWith(item.alsoActive);
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
    setTimeout(() => (this.host.nativeElement.querySelector('#clinic-sidebar a, #clinic-sidebar button') as HTMLElement | null)?.focus());
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.drawerOpen()) return;
    this.drawerOpen.set(false);
    (this.host.nativeElement.querySelector('[data-clinic-menu]') as HTMLElement | null)?.focus();
  }

  async logout(): Promise<void> {
    if (!window.confirm(this.i18n.t('clinic.logoutConfirm'))) return;
    await this.supabase.client.auth.signOut();
    void this.router.navigate(['/login']);
  }

  private syncRouteData(): void {
    // Walk the snapshot tree: child ActivatedRoutes have no snapshot until activated.
    let r = this.router.routerState.snapshot.root;
    while (r.firstChild) r = r.firstChild;
    const data = r.data;
    this.titleKey.set(data['titleKey'] ?? 'clinic.title');
    this.backTo.set(data['backTo'] ?? null);
  }

  private async loadUser(): Promise<void> {
    try {
      await this.supabase.sessionReady;
      const user = this.supabase.currentUser();
      if (!user) return;
      let name: string = user.user_metadata?.['first_name'] || user.user_metadata?.['full_name'] || '';
      const { data } = await this.supabase.client
        .from('patients')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.first_name) name = `${data.first_name} ${data.last_name ?? ''}`.trim();
      this.userName.set(name);
      this.userInitial.set((name || user.email || 'U').charAt(0).toUpperCase());
    } catch {
      // Offline or mock session — keep the generic account label.
    }
  }
}
