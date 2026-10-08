import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';

// Support contact shown to patients. A link stays hidden while its value is empty.
const SUPPORT_EMAIL = 'kawin.pa@kkumail.com';
const SUPPORT_PHONE = '090-567-0114';

/** Site-wide footer: product name, support contact and copyright. */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="border-t border-slate-200 bg-white text-base text-slate-600 dark:border-slate-800 dark:bg-brand-dark dark:text-slate-300">
      <div class="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 text-center sm:px-6 lg:flex-row lg:justify-between lg:text-left">
        <div>
          <p class="font-bold text-slate-900 dark:text-white">AeroChin CTAR</p>
          <p>{{ i18n.t('footer.tagline') }}</p>
        </div>

        <ul *ngIf="email || phone" [attr.aria-label]="i18n.t('footer.contact')"
          class="flex flex-col items-center gap-x-6 sm:flex-row">
          <li *ngIf="email">
            <a [href]="'mailto:' + email" class="auth-link inline-flex min-h-11 items-center gap-2 break-all">
              <i class="fa-regular fa-envelope" aria-hidden="true"></i>
              <span class="sr-only">{{ i18n.t('footer.email') }}</span>{{ email }}
            </a>
          </li>
          <li *ngIf="phone">
            <a [href]="'tel:' + phoneHref" class="auth-link inline-flex min-h-11 items-center gap-2 whitespace-nowrap">
              <i class="fa-solid fa-phone" aria-hidden="true"></i>
              <span class="sr-only">{{ i18n.t('footer.phone') }}</span>{{ phone }}
            </a>
          </li>
        </ul>

        <p>{{ i18n.t('footer.copyright').replace('{0}', year.toString()) }}</p>
      </div>
    </footer>
  `
})
export class AppFooterComponent {
  readonly i18n = inject(I18nService);
  readonly year = new Date().getFullYear();
  readonly email = SUPPORT_EMAIL;
  readonly phone = SUPPORT_PHONE;
  readonly phoneHref = SUPPORT_PHONE.replace(/[^\d+]/g, '');
}
