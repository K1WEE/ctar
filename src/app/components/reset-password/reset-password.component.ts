import { Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { z } from 'zod';
import { SupabaseService } from '../../services/supabase.service';
import { I18nService } from '../../services/i18n.service';
import { AuthShellComponent } from '../auth/auth-shell.component';
import { AuthFieldComponent } from '../auth/auth-field.component';
import { PasswordRulesComponent } from '../auth/password-rules.component';
import { fieldErrors, passwordSchema } from '../auth/password-policy';

export const ResetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'reset.error.confirmRequired'),
}).refine(value => value.password === value.confirmPassword, {
  message: 'reset.error.match',
  path: ['confirmPassword'],
});

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthShellComponent, AuthFieldComponent, PasswordRulesComponent],
  template: `
    <app-auth-shell [title]="i18n.t('reset.title')" [subtitle]="state === 'form' ? i18n.t('reset.subtitle') : ''">
      <div *ngIf="state === 'checking'" role="status" class="py-8 text-center">
        <i class="fa-solid fa-spinner fa-spin mb-4 text-3xl text-blue-800 dark:text-blue-300" aria-hidden="true"></i>
        <p class="text-lg text-slate-600 dark:text-slate-300">{{ i18n.t('reset.validating') }}</p>
      </div>

      <div *ngIf="state === 'invalid'" class="space-y-6">
        <div role="alert" class="auth-alert">
          <i class="fa-solid fa-circle-exclamation mt-1" aria-hidden="true"></i><span>{{ i18n.t('error.invalidResetSession') }}</span>
        </div>
        <a routerLink="/forgot-password" class="auth-submit">{{ i18n.t('reset.requestNewLink') }}</a>
      </div>

      <form *ngIf="state === 'form'" (ngSubmit)="onSubmit()" class="space-y-5">
        <app-auth-field type="password" name="password" icon="fa-solid fa-lock" autocomplete="new-password"
          [placeholder]="i18n.t('auth.placeholder.password')" [label]="i18n.t('reset.newPassword')"
          [(ngModel)]="password" (ngModelChange)="revalidate()" [error]="errors['password'] || ''">
          <app-password-rules [password]="password"></app-password-rules>
        </app-auth-field>

        <app-auth-field type="password" name="confirmPassword" icon="fa-solid fa-lock" autocomplete="new-password"
          [placeholder]="i18n.t('auth.placeholder.password')" [label]="i18n.t('reset.confirmPassword')"
          [(ngModel)]="confirmPassword" (ngModelChange)="revalidate()" [error]="errors['confirmPassword'] || ''"></app-auth-field>

        <div *ngIf="error" role="alert" class="auth-alert">
          <i class="fa-solid fa-circle-exclamation mt-1" aria-hidden="true"></i><span>{{ error }}</span>
        </div>

        <button type="submit" [disabled]="loading" class="auth-submit">
          <i *ngIf="loading" class="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>
          {{ loading ? i18n.t('login.loading') : i18n.t('reset.submit') }}
        </button>
      </form>

      <div *ngIf="state === 'success'" role="status" class="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
        <i class="fa-regular fa-circle-check text-4xl" aria-hidden="true"></i>
        <p class="text-lg font-medium">{{ i18n.t('reset.success') }}</p>
      </div>

      <p *ngIf="state === 'invalid'" class="mt-6 text-center">
        <a routerLink="/login" class="auth-link inline-flex min-h-12 items-center text-lg">
          <i class="fa-solid fa-arrow-left mr-2 text-sm" aria-hidden="true"></i>{{ i18n.t('forgot.back') }}
        </a>
      </p>
    </app-auth-shell>
  `
})
export class ResetPasswordComponent implements OnInit {
  password = '';
  confirmPassword = '';
  loading = false;
  state: 'checking' | 'invalid' | 'form' | 'success' = 'checking';
  error = '';
  errors: Record<string, string> = {};
  submitted = false;
  public i18n = inject(I18nService);

  @ViewChildren(AuthFieldComponent) private fields!: QueryList<AuthFieldComponent>;

  constructor(public supabase: SupabaseService, private router: Router) {}

  async ngOnInit() {
    await this.supabase.sessionReady;

    // Give Supabase a brief moment to parse the hash fragment if needed
    if (!this.supabase.currentUser()) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Clicking the recovery link in the email redirects here with a token
    // fragment; Supabase parses it and signs the user in. No user means the
    // link was expired or invalid.
    this.state = this.supabase.currentUser() ? 'form' : 'invalid';
  }

  revalidate(): void {
    if (this.submitted) this.validate();
  }

  private validate(): boolean {
    const result = ResetPasswordSchema.safeParse({ password: this.password, confirmPassword: this.confirmPassword });
    this.errors = result.success ? {} : fieldErrors(result.error);
    return result.success;
  }

  async onSubmit() {
    this.submitted = true;
    if (!this.validate()) {
      this.fields.find(field => !!this.errors[field.name])?.focus();
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const { error } = await this.supabase.updatePassword(this.password);
      if (error) throw error;

      this.state = 'success';
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);
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
