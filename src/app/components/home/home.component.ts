import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../services/i18n.service';
import { FontScaleControlComponent } from '../font-scale-control/font-scale-control.component';

/** Public landing page: introduces AeroChin CTAR and leads to sign-in. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FontScaleControlComponent],
  template: `
    <div class="min-h-screen text-slate-800 dark:text-slate-200">
      <header class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <span class="logo-frame inline-flex">
          <img src="assets/aerochin-logo.png" alt="AeroChin CTAR PRO" class="h-auto w-36 sm:w-44">
        </span>
        <div class="relative z-30 flex flex-wrap items-center gap-2">
          <app-font-scale-control [inline]="true"></app-font-scale-control>
          <div role="group" [attr.aria-label]="i18n.currentLang() === 'th' ? 'ภาษา' : 'Language'"
            class="flex rounded-lg border border-slate-300 p-1 dark:border-slate-600">
            <button type="button" lang="th" (click)="i18n.setLang('th')" [attr.aria-pressed]="i18n.currentLang() === 'th'" class="lang-choice">ไทย</button>
            <button type="button" lang="en" (click)="i18n.setLang('en')" [attr.aria-pressed]="i18n.currentLang() === 'en'" class="lang-choice">English</button>
          </div>
        </div>
      </header>

      <section class="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-4 sm:px-6 sm:pt-8 md:gap-12 md:pb-16 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pb-20 lg:pt-12">
        <div class="animate-fade-in md:mx-auto md:max-w-2xl md:text-center lg:mx-0 lg:max-w-none lg:text-left">
          <p class="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-base font-semibold text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
            <i class="fa-solid fa-heart-pulse" aria-hidden="true"></i>{{ i18n.t('home.eyebrow') }}
          </p>
          <h1 class="mb-5 text-[1.75rem] font-extrabold leading-tight tracking-tight text-slate-900 xs:text-4xl sm:text-5xl xl:text-6xl dark:text-white">
            <span class="block">{{ i18n.t('home.titleLine1') }}</span>
            <span class="block text-blue-800 dark:text-blue-300">{{ i18n.t('home.titleLine2') }}</span>
          </h1>
          <p class="mb-8 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl md:mx-auto lg:mx-0 dark:text-slate-300">
            {{ i18n.t('home.subtitle') }}
          </p>

          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:justify-center lg:justify-start">
            <a routerLink="/login" class="auth-submit cursor-pointer px-6 text-center sm:w-auto sm:whitespace-nowrap sm:px-8">
              {{ i18n.t('home.cta') }}
              <i class="fa-solid fa-arrow-right ml-3" aria-hidden="true"></i>
            </a>
            <a routerLink="/register" class="secondary-cta">{{ i18n.t('login.createOne') }}</a>
          </div>
        </div>

        <figure class="relative mx-auto w-full max-w-sm animate-scale-up sm:max-w-md lg:max-w-lg">
          <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-brand-card">
            <img src="assets/videos/press-guide.jpg" [alt]="i18n.t('home.imageAlt')"
              width="480" height="480" class="aspect-[4/3] w-full object-cover object-[50%_35%] sm:aspect-square">
          </div>
          <figcaption class="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-md sm:left-auto sm:right-6 sm:max-w-xs sm:p-4 dark:border-slate-700 dark:bg-brand-card">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <i class="fa-brands fa-bluetooth-b" aria-hidden="true"></i>
            </span>
            <span class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ i18n.t('home.badge') }}</span>
          </figcaption>
        </figure>
      </section>

      <section class="border-t border-slate-200 bg-white py-12 sm:py-16 dark:border-slate-800 dark:bg-brand-card/40" aria-labelledby="home-steps">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="home-steps" class="mb-8 text-center text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">
            {{ i18n.t('home.stepsTitle') }}
          </h2>
          <ol class="mx-auto grid max-w-2xl gap-4 sm:gap-5 lg:max-w-none lg:grid-cols-3">
            <li *ngFor="let step of steps; let i = index"
              class="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 lg:flex-col dark:border-slate-700 dark:bg-brand-card">
              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-xl text-white">
                <i [class]="step.icon" aria-hidden="true"></i>
              </span>
              <div class="min-w-0">
                <p class="mb-1 text-base font-bold text-blue-800 dark:text-blue-300">{{ i18n.t('home.step') }} {{ i + 1 }}</p>
                <h3 class="mb-2 text-xl font-bold text-slate-900 dark:text-white">{{ i18n.t(step.title) }}</h3>
                <p class="text-lg leading-relaxed text-slate-600 dark:text-slate-300">{{ i18n.t(step.body) }}</p>
              </div>
            </li>
          </ol>

          <div class="mt-10 text-center">
            <a routerLink="/login" class="auth-submit mx-auto cursor-pointer px-6 text-center sm:inline-flex sm:w-auto sm:whitespace-nowrap sm:px-8">
              {{ i18n.t('home.cta') }}
            </a>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .lang-choice { min-height: 44px; min-width: 64px; padding: 4px 12px; border-radius: 6px; font-weight: 600; color: #475569; cursor: pointer; }
    .lang-choice:hover { background: #f1f5f9; }
    .lang-choice[aria-pressed="true"] { background: #1e40af; color: white; }
    :host-context(.dark) .lang-choice { color: #cbd5e1; }
    :host-context(.dark) .lang-choice:hover { background: #334155; }
    :host-context(.dark) .lang-choice[aria-pressed="true"] { background: #1e40af; color: white; }
    .lang-choice:focus-visible { outline: 2px solid #1e40af; outline-offset: 2px; }
    :host-context(.dark) .logo-frame { background: white; border-radius: 10px; padding: 6px 10px; }
    .secondary-cta {
      display: inline-flex; align-items: center; justify-content: center; min-height: 58px; padding: 0.5rem 1.5rem; text-align: center;
      border-radius: 0.75rem; border: 2px solid #1e40af; color: #1e40af; font-size: 1.25rem; font-weight: 700;
      cursor: pointer; transition: background-color 200ms, color 200ms;
    }
    @media (min-width: 640px) { .secondary-cta { padding: 0 2rem; white-space: nowrap; } }
    .secondary-cta:hover { background: #eff6ff; }
    .secondary-cta:focus-visible { outline: 2px solid #1e40af; outline-offset: 2px; }
    :host-context(.dark) .secondary-cta { border-color: #93c5fd; color: #bfdbfe; }
    :host-context(.dark) .secondary-cta:hover { background: #1e293b; }
  `]
})
export class HomeComponent {
  readonly i18n = inject(I18nService);

  readonly steps = [
    { icon: 'fa-brands fa-bluetooth-b', title: 'home.step1.title', body: 'home.step1.body' },
    { icon: 'fa-solid fa-sliders', title: 'home.step2.title', body: 'home.step2.body' },
    { icon: 'fa-solid fa-gamepad', title: 'home.step3.title', body: 'home.step3.body' },
  ];
}
