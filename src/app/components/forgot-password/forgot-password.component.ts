import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { I18nService } from '../../services/i18n.service';
import { AuthShellComponent } from '../auth/auth-shell.component';
import { AuthFieldComponent } from '../auth/auth-field.component';
import { emailSchema } from '../auth/password-policy';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthShellComponent, AuthFieldComponent],
  template: `
    <app-auth-shell [title]="i18n.t('forgot.title')" [subtitle]="success ? '' : i18n.t('forgot.subtitle')">
      <form *ngIf="!success" (ngSubmit)="onSubmit()" class="space-y-5">
        <app-auth-field type="email" name="email" icon="fa-regular fa-envelope" autocomplete="email"
          placeholder="name@example.com" [label]="i18n.t('login.email')"
          [(ngModel)]="email" (ngModelChange)="revalidate()" [error]="emailError"></app-auth-field>

        <div *ngIf="error" role="alert" class="auth-alert">
          <i class="fa-solid fa-circle-exclamation mt-1" aria-hidden="true"></i><span>{{ error }}</span>
        </div>

        <button type="submit" [disabled]="loading" class="auth-submit">
          <i *ngIf="loading" class="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>
          {{ loading ? i18n.t('login.loading') : i18n.t('forgot.submit') }}
        </button>
      </form>

      <div *ngIf="success" role="status" class="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
        <i class="fa-solid fa-envelope-circle-check text-4xl" aria-hidden="true"></i>
        <p class="text-lg font-medium">{{ i18n.t('forgot.success') }}</p>
      </div>

      <p class="mt-6 text-center">
        <a routerLink="/login" class="auth-link inline-flex min-h-12 items-center text-lg">
          <i class="fa-solid fa-arrow-left mr-2 text-sm" aria-hidden="true"></i>{{ i18n.t('forgot.back') }}
        </a>
      </p>
    </app-auth-shell>
  `
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  success = false;
  error = '';
  emailError = '';
  submitted = false;
  public i18n = inject(I18nService);

  @ViewChild(AuthFieldComponent) private field?: AuthFieldComponent;

  constructor(private supabase: SupabaseService) {}

  revalidate(): void {
    if (this.submitted) this.validate();
  }

  private validate(): string | null {
    const result = emailSchema.safeParse(this.email);
    this.emailError = result.success ? '' : result.error.issues[0].message;
    return result.success ? result.data : null;
  }

  async onSubmit() {
    this.submitted = true;
    const email = this.validate();
    if (!email) {
      this.field?.focus();
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const resetRedirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await this.supabase.sendPasswordResetEmail(email, resetRedirectUrl);
      if (error) throw error;
      this.success = true;
    } catch (e: unknown) {
      this.error = this.friendlyError(e);
    } finally {
      this.loading = false;
    }
  }

  private friendlyError(error: unknown): string {
    const message = String((error as { message?: string })?.message ?? '').toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      return this.i18n.t('error.network');
    }
    return this.i18n.t('error.generic');
  }
}
