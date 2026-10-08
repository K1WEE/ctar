import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';
import { FontScaleControlComponent } from '../font-scale-control/font-scale-control.component';

/** Shared page frame for the pre-login pages (login, register, forgot, reset). */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CommonModule, FontScaleControlComponent],
  template: `
    <main class="min-h-screen flex items-center justify-center p-4 relative z-10 text-slate-800 dark:text-slate-200">
      <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-md sm:p-8 dark:border-slate-700 dark:bg-brand-card">
        <div class="relative z-30 mb-6 flex flex-wrap items-center justify-end gap-2">
          <app-font-scale-control [inline]="true"></app-font-scale-control>
          <div role="group" [attr.aria-label]="i18n.currentLang() === 'th' ? 'ภาษา' : 'Language'"
            class="flex rounded-lg border border-slate-300 p-1 dark:border-slate-600">
            <button type="button" lang="th" (click)="i18n.setLang('th')" [attr.aria-pressed]="i18n.currentLang() === 'th'" class="lang-choice">ไทย</button>
            <button type="button" lang="en" (click)="i18n.setLang('en')" [attr.aria-pressed]="i18n.currentLang() === 'en'" class="lang-choice">English</button>
          </div>
        </div>

        <div class="mb-8 text-center">
          <span class="logo-frame mx-auto mb-5 inline-flex">
            <img src="assets/aerochin-logo.png" alt="AeroChin CTAR PRO" class="h-auto w-48 sm:w-56">
          </span>
          <h1 class="mb-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{{ title }}</h1>
          <p *ngIf="subtitle" class="text-lg text-slate-600 dark:text-slate-300">{{ subtitle }}</p>
        </div>

        <ng-content></ng-content>
      </div>
    </main>
  `,
  styles: [`
    .lang-choice { min-height: 44px; min-width: 64px; padding: 4px 12px; border-radius: 6px; font-weight: 600; color: #475569; }
    .lang-choice:hover { background: #f1f5f9; }
    .lang-choice[aria-pressed="true"] { background: #1e40af; color: white; }
    :host-context(.dark) .lang-choice { color: #cbd5e1; }
    :host-context(.dark) .lang-choice:hover { background: #334155; }
    :host-context(.dark) .lang-choice[aria-pressed="true"] { background: #1e40af; color: white; }
    .lang-choice:focus-visible { outline: 2px solid #1e40af; outline-offset: 2px; }
    :host-context(.dark) .logo-frame { background: white; border-radius: 10px; padding: 6px 10px; }
  `]
})
export class AuthShellComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  readonly i18n = inject(I18nService);
}
