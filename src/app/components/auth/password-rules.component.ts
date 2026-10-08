import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';
import { PASSWORD_RULES } from './password-policy';

/** Live checklist of the password rules, ticked as the user types. */
@Component({
  selector: 'app-password-rules',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p class="mt-3 text-base font-semibold text-slate-600 dark:text-slate-300">{{ i18n.t('auth.rule.title') }}</p>
    <ul class="mt-1 space-y-1">
      <li *ngFor="let rule of rules" class="flex items-center gap-2 text-base"
        [ngClass]="rule.test(password) ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'">
        <i class="w-5 text-center" [ngClass]="rule.test(password) ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'" aria-hidden="true"></i>
        <span>{{ i18n.t(rule.label) }}</span>
        <span class="sr-only">{{ rule.test(password) ? i18n.t('auth.rule.met') : i18n.t('auth.rule.unmet') }}</span>
      </li>
    </ul>
  `
})
export class PasswordRulesComponent {
  @Input() password = '';
  readonly rules = PASSWORD_RULES;
  readonly i18n = inject(I18nService);
}
