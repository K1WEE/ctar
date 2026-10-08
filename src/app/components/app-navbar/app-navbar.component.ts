import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FontScaleControlComponent } from '../font-scale-control/font-scale-control.component';
import { BatteryStatusComponent } from '../battery-status/battery-status.component';
import { I18nService } from '../../services/i18n.service';
import { NavbarService } from '../../services/navbar.service';
import { ThemeService } from '../../services/theme.service';
import { SupabaseService } from '../../services/supabase.service';
import { BleService } from '../../services/ble.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, FontScaleControlComponent, BatteryStatusComponent],
  template: `
    <nav data-app-navbar [attr.data-home-navbar]="path === '/patient-portal' ? '' : null"
      [attr.aria-label]="text('เมนูหลัก', 'Main navigation')"
      class="border-b border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div class="navbar-row mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex min-w-0 items-center gap-3">
          <button *ngIf="backPath" type="button" data-navbar-back (click)="goBack()"
            [attr.aria-label]="text('ย้อนกลับ', 'Go back')" class="nav-action shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14"/></svg>
          </button>
          <a *ngIf="path !== '/game' && path !== '/calibrate'" routerLink="/patient-portal" class="brand-link flex min-h-12 min-w-0 items-center" [attr.aria-label]="text('ไปหน้าหลัก', 'Go to home')">
            <img src="assets/aerochin-logo.png" alt="AeroChin CTAR PRO" class="brand-image h-auto w-40 max-w-full sm:w-48">
          </a>
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:gap-4">
          <button *ngIf="path === '/game' && navbar.gameControls() as game" type="button" (click)="game.toggleMute()"
            [attr.aria-label]="game.isMuted() ? text('เปิดเสียงพากย์', 'Unmute voice') : text('ปิดเสียงพากย์', 'Mute voice')"
            [attr.aria-pressed]="game.isMuted()" class="nav-action">
            <i class="fa-solid" [ngClass]="game.isMuted() ? 'fa-volume-xmark' : 'fa-volume-high'" aria-hidden="true"></i>
          </button>
          <app-battery-status presentation="indicator" [iconOnly]="true"></app-battery-status>

          <button type="button" data-home-menu-toggle (click)="toggleHomeMenu()"
            [attr.aria-expanded]="homeMenuOpen()" aria-controls="home-user-menu"
            class="nav-action gap-2 px-3"
            [attr.aria-label]="text('ตั้งค่าและบัญชี', 'Settings and account')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span>{{ text('ตั้งค่า', 'Settings') }}</span>
          </button>
        </div>
      </div>

      <section *ngIf="homeMenuOpen()" id="home-user-menu" [attr.aria-label]="text('ตั้งค่าและบัญชี', 'Settings and account')"
        class="settings-panel border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div class="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
          <img *ngIf="userAvatarUrl() && !avatarImgError(); else initialAvatar" [src]="userAvatarUrl()" (error)="avatarImgError.set(true)" alt="" class="h-10 w-10 rounded-full object-cover">
          <ng-template #initialAvatar><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200" aria-hidden="true">{{ userInitial }}</span></ng-template>
          <p class="min-w-0 break-words font-semibold">{{ patientName() || text('บัญชีของคุณ', 'Your account') }}</p>
        </div>
        <div class="settings-group">
          <p class="mb-2 font-semibold">{{ i18n.t('accessibility.fontSize') }}</p>
          <app-font-scale-control [inline]="true"></app-font-scale-control>
        </div>
        <fieldset class="settings-group">
          <legend class="font-semibold">{{ text('ภาษา', 'Language') }}</legend>
          <div class="mt-2 flex gap-2">
            <button type="button" (click)="setLang('th')" [attr.aria-pressed]="i18n.currentLang() === 'th'" class="language-choice" lang="th">ไทย</button>
            <button type="button" (click)="setLang('en')" [attr.aria-pressed]="i18n.currentLang() === 'en'" class="language-choice" lang="en">English</button>
          </div>
        </fieldset>
        <button type="button" (click)="theme.toggleTheme()" [attr.aria-pressed]="theme.isDarkMode()" class="nav-action w-full justify-between gap-3 px-2">
          <span>{{ text('โหมดมืด', 'Dark mode') }}</span>
          <span class="text-sm">{{ theme.isDarkMode() ? text('เปิด', 'On') : text('ปิด', 'Off') }}</span>
        </button>
        <button *ngIf="ble.connectionState() === 'Connected'" type="button" data-disconnect-device (click)="disconnectDevice()"
          class="nav-action disconnect-action mt-2 w-full justify-start gap-3 border-t border-slate-200 px-2 dark:border-slate-700">
          <i class="fa-solid fa-link-slash" aria-hidden="true"></i>
          {{ text('ตัดการเชื่อมต่ออุปกรณ์', 'Disconnect device') }}
        </button>
        <button type="button" (click)="requestHomeLogout()" class="nav-action mt-2 w-full justify-start gap-3 border-t border-slate-200 px-2 dark:border-slate-700">
          <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
          {{ i18n.t('header.logout') }}
        </button>
      </section>
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><app-battery-status presentation="notice"></app-battery-status></div>
    </nav>
  `,
  styles: [`
    :host { display: block; position: sticky; top: 0; z-index: var(--layer-navbar, 60); }
    .nav-action { display: flex; align-items: center; justify-content: center; min-height: 48px; min-width: 48px; border-radius: 8px; font-weight: 600; }
    .nav-action.justify-between { justify-content: space-between; }
    .nav-action.justify-start { justify-content: flex-start; }
    .nav-action:hover { background: #f1f5f9; }
    :host-context(.dark) .nav-action:hover { background: #1e293b; }
    button:focus-visible, a:focus-visible { outline: 2px solid #2563eb; outline-offset: 3px; }
    :host-context(.dark) .brand-link { background: white; border-radius: 8px; padding: 4px 8px; }
    .settings-panel { position: absolute; right: max(16px, calc((100% - 80rem) / 2 + 2rem)); top: calc(100% + 8px); width: 320px; max-width: calc(100vw - 32px); max-height: calc(100dvh - var(--app-navbar-height, 80px) - 24px); overflow-y: auto; padding: 20px; border-radius: 12px; }
    .disconnect-action { color: #be123c; }
    :host-context(.dark) .disconnect-action { color: #fb7185; }
    .settings-group { padding-top: 16px; padding-bottom: 12px; }
    .language-choice { min-height: 48px; flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; }
    .language-choice[aria-pressed="true"] { background: #1e40af; color: white; border-color: #1e40af; font-weight: 600; }
    @media (max-width: 359px) { .navbar-row { gap: 8px; padding-inline: 12px; } .brand-image { width: 128px; } }
  `]
})
export class AppNavbarComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() path = '';
  readonly navbar = inject(NavbarService);
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);
  readonly supabase = inject(SupabaseService, { optional: true });
  readonly ble = inject(BleService);
  readonly homeMenuOpen = signal(false);
  readonly patientName = signal<string>('');
  readonly userAvatarUrl = signal<string | null>(null);
  readonly avatarImgError = signal(false);

  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: ResizeObserver;

  text(th: string, en: string): string { return this.i18n.currentLang() === 'th' ? th : en; }

  get backPath(): string | null {
    if (this.path.startsWith('/clinic/patient/')) return '/clinic/records';
    switch (this.path) {
      case '/game': return '/calibrate';
      case '/calibrate': case '/summary': return '/patient-portal';
      default: return null;
    }
  }

  get userInitial(): string {
    const name = this.patientName().trim();
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    const email = this.supabase?.currentUser()?.email?.trim();
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  }

  setLang(lang: 'th' | 'en'): void {
    this.i18n.currentLang.set(lang);
  }

  goBack(): void {
    if (this.path === '/game' && this.navbar.gameControls()) {
      this.navbar.gameControls()!.back();
    } else if (this.backPath) {
      void this.router.navigateByUrl(this.backPath);
    }
  }

  disconnectDevice(): void {
    this.homeMenuOpen.set(false);
    void this.ble.disconnect();
  }

  requestHomeLogout(): void {
    this.homeMenuOpen.set(false);
    const homeLogout = this.navbar.homeLogout();
    if (homeLogout) {
      homeLogout();
      return;
    }
    void this.fallbackLogout();
  }

  private async fallbackLogout(): Promise<void> {
    const message = this.i18n.currentLang() === 'th'
      ? 'ต้องการออกจากระบบใช่หรือไม่?'
      : 'Do you want to log out?';
    if (!window.confirm(message)) return;

    if (this.supabase?.client?.auth) {
      await this.supabase.client.auth.signOut();
    }
    void this.router.navigate(['/login']);
  }

  toggleHomeMenu(): void {
    this.homeMenuOpen.update(open => !open);
  }

  @HostListener('document:click', ['$event'])
  closeHomeMenuOnOutsideClick(event: MouseEvent): void {
    if (this.homeMenuOpen() && !(event.target as HTMLElement).closest('#home-user-menu, [data-home-menu-toggle]')) {
      this.homeMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeHomeMenuOnEscape(): void {
    if (!this.homeMenuOpen()) return;
    this.homeMenuOpen.set(false);
    (this.host.nativeElement.querySelector('[data-home-menu-toggle]') as HTMLButtonElement | null)?.focus();
  }

  ngOnInit(): void {
    void this.loadUserProfile();
  }

  async loadUserProfile(): Promise<void> {
    if (!this.supabase) return;
    try {
      await this.supabase.sessionReady;
      const user = this.supabase.currentUser();
      if (!user) return;

      const role = this.supabase.userRole?.() || 'user';
      if (role === 'doctor' || role === 'admin') {
        this.userAvatarUrl.set('assets/doctor-avatar.png');
      }

      const metaName = user.user_metadata?.['first_name'] || user.user_metadata?.['full_name'] || user.user_metadata?.['name'];
      if (metaName) this.patientName.set(metaName);

      const metaAvatar = user.user_metadata?.['avatar_url'] || user.user_metadata?.['picture'];
      if (metaAvatar && !this.userAvatarUrl()) this.userAvatarUrl.set(metaAvatar);

      if (this.supabase.client) {
        const { data } = await this.supabase.client
          .from('patients')
          .select('first_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          if (data.first_name) this.patientName.set(data.first_name);
          if (data.avatar_url) this.userAvatarUrl.set(data.avatar_url);
        }
      }
    } catch {
      // Offline or mock
    }
  }

  ngOnChanges(): void {
    this.homeMenuOpen.set(false);
  }

  ngAfterViewInit(): void {
    const updateHeight = () => document.documentElement.style.setProperty(
      '--app-navbar-height', `${this.host.nativeElement.getBoundingClientRect().height}px`);
    updateHeight();
    this.observer = new ResizeObserver(updateHeight);
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    document.documentElement.style.setProperty('--app-navbar-height', '0px');
  }
}
