import { Component, Input, Output, EventEmitter, inject, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="relative z-40 bg-white dark:bg-brand-card border border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-center rounded-2xl shadow-sm transition-colors duration-300 gap-4 w-full">
      <div class="flex items-center space-x-4 w-full md:w-auto justify-center md:justify-start">
        <!-- Logo Icon -->
        <div class="flex-shrink-0">
          <div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <i class="fa-solid fa-staff-snake text-2xl text-brand-accent"></i>
          </div>
        </div>
        
        <!-- Title -->
        <div class="flex-shrink-0">
          <h1 class="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-300">{{ i18n.t('header.title') }}</h1>
          <p class="text-xs md:text-sm text-brand-accent font-semibold tracking-wide">{{ i18n.t('header.subtitle') }}</p>
        </div>
      </div>
      
      <div class="relative flex items-center space-x-2 md:space-x-4 w-full md:w-auto justify-center md:justify-end">
        <!-- Keep language and font size visible on every screen size. -->

        <!-- Language Toggle -->
        <button (click)="i18n.toggleLang()" class="flex-shrink-0 min-h-12 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-brand-accent dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all duration-300 shadow-sm text-base font-bold">
          {{ i18n.currentLang() === 'th' ? 'EN' : 'TH' }}
        </button>

        <!-- Secondary controls collapse into a mobile menu. -->
        <button
          type="button"
          (click)="toggleMobileMenu()"
          [attr.aria-expanded]="mobileMenuOpen()"
          aria-controls="header-secondary-menu"
          [attr.aria-label]="mobileMenuOpen() ? i18n.t('header.closeMenu') : i18n.t('header.openMenu')"
          class="md:hidden flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-sm">
          <i class="fa-solid" [ngClass]="mobileMenuOpen() ? 'fa-xmark' : 'fa-bars'" aria-hidden="true"></i>
        </button>

        <div class="hidden md:flex items-center space-x-4">
          <!-- Theme Toggle -->
          <button (click)="themeService.toggleTheme()" [attr.aria-label]="themeService.isDarkMode() ? i18n.t('header.lightMode') : i18n.t('header.darkMode')" class="flex-shrink-0 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-brand-accent dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50">
            <i class="fa-solid" [ngClass]="themeService.isDarkMode() ? 'fa-sun' : 'fa-moon'" aria-hidden="true"></i>
          </button>

          <!-- Status Indicator -->
          <div *ngIf="showConnectionStatus" class="flex-shrink-0 flex items-center px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <div class="relative flex h-3 w-3 mr-2 md:mr-3">
              <span class="relative inline-flex rounded-full h-3 w-3"
                    [ngClass]="{
                      'bg-emerald-500': connectionState() === 'Connected',
                      'bg-amber-500': connectionState() === 'Scanning',
                      'bg-rose-500': connectionState() === 'Disconnected'
                    }">
              </span>
            </div>
            <span class="text-sm font-semibold tracking-wide"
                  [ngClass]="{
                    'text-emerald-600 dark:text-emerald-400': connectionState() === 'Connected',
                    'text-amber-600 dark:text-amber-400': connectionState() === 'Scanning',
                    'text-rose-600 dark:text-rose-400': connectionState() === 'Disconnected'
                  }">
              {{ connectionState() }}
            </span>
          </div>

          <!-- Logout Button -->
          <button (click)="onLogout.emit()" class="flex-shrink-0 px-3 py-2 md:px-4 min-h-12 bg-slate-100 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/50 rounded-xl transition-all shadow-sm text-base font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-rose-500/50">
            <i class="fa-solid fa-right-from-bracket md:mr-2" aria-hidden="true"></i> <span>{{ i18n.t('header.logout') }}</span>
          </button>
        </div>

        <!-- Mobile secondary controls -->
        <div *ngIf="mobileMenuOpen()" id="header-secondary-menu" class="absolute right-0 top-14 z-40 flex min-w-[220px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 md:hidden">
          <button (click)="themeService.toggleTheme()" [attr.aria-label]="themeService.isDarkMode() ? i18n.t('header.lightMode') : i18n.t('header.darkMode')" class="min-h-12 rounded-xl bg-slate-100 px-3 py-2 text-left text-label font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <i class="fa-solid mr-2" [ngClass]="themeService.isDarkMode() ? 'fa-sun' : 'fa-moon'" aria-hidden="true"></i>
            {{ themeService.isDarkMode() ? i18n.t('header.lightMode') : i18n.t('header.darkMode') }}
          </button>
          <div *ngIf="showConnectionStatus" class="rounded-xl bg-slate-100 px-3 py-2 text-label font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <span class="mr-2 inline-block h-3 w-3 rounded-full"
                  [ngClass]="{
                    'bg-emerald-500': connectionState() === 'Connected',
                    'bg-amber-500': connectionState() === 'Scanning',
                    'bg-rose-500': connectionState() === 'Disconnected'
                  }"></span>
            {{ connectionState() }}
          </div>
          <button (click)="onLogout.emit()" class="min-h-12 rounded-xl bg-slate-100 px-3 py-2 text-left text-label font-bold text-rose-600 dark:bg-slate-800 dark:text-rose-400">
            <i class="fa-solid fa-right-from-bracket mr-2" aria-hidden="true"></i>{{ i18n.t('header.logout') }}
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class HeaderComponent {
  @Input() showConnectionStatus = true;
  @Input({required: true}) connectionState!: Signal<string>;
  @Output() onLogout = new EventEmitter<void>();
  public themeService = inject(ThemeService);
  public i18n = inject(I18nService);
  public mobileMenuOpen = signal(false);

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }
}
