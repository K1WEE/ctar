import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { z } from 'zod';
import { SupabaseService } from '../../services/supabase.service';
import { I18nService } from '../../services/i18n.service';
import { AuthShellComponent } from '../auth/auth-shell.component';
import { AuthFieldComponent } from '../auth/auth-field.component';
import { emailSchema, fieldErrors } from '../auth/password-policy';

const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'register.error.passwordRequired'),
});

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthShellComponent, AuthFieldComponent],
  template: `
    <app-auth-shell [title]="i18n.t('login.welcome')" [subtitle]="i18n.t('login.subtitle')">
      <form (ngSubmit)="onSubmit()" class="space-y-5">
        <app-auth-field type="email" name="email" icon="fa-regular fa-envelope" autocomplete="email"
          placeholder="name@example.com" [label]="i18n.t('login.email')"
          [(ngModel)]="email" (ngModelChange)="revalidate()" [error]="errors['email'] || ''"></app-auth-field>

        <div>
          <app-auth-field type="password" name="password" icon="fa-solid fa-lock" autocomplete="current-password"
            [placeholder]="i18n.t('auth.placeholder.password')" [label]="i18n.t('login.password')"
            [(ngModel)]="password" (ngModelChange)="revalidate()" [error]="errors['password'] || ''"></app-auth-field>
          <div class="flex justify-end">
            <a routerLink="/forgot-password" class="auth-link inline-flex min-h-12 items-center text-base sm:text-lg">{{ i18n.t('login.forgotPassword') }}</a>
          </div>
        </div>

        <div *ngIf="error" role="alert" class="auth-alert">
          <i class="fa-solid fa-circle-exclamation mt-1" aria-hidden="true"></i><span>{{ error }}</span>
        </div>

        <button type="submit" [disabled]="loading" class="auth-submit">
          <i *ngIf="loading" class="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>
          {{ loading ? i18n.t('login.loading') : i18n.t('login.submit') }}
        </button>
      </form>

      <p class="mt-6 text-center text-lg text-slate-600 dark:text-slate-300">
        {{ i18n.t('login.noAccount') }}
        <a routerLink="/register" class="auth-link inline-flex min-h-12 items-center">{{ i18n.t('login.createOne') }}</a>
      </p>
    </app-auth-shell>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';
  errors: Record<string, string> = {};
  submitted = false;
  public i18n = inject(I18nService);

  @ViewChildren(AuthFieldComponent) private fields!: QueryList<AuthFieldComponent>;

  constructor(private supabase: SupabaseService, private router: Router) {}

  revalidate(): void {
    if (this.submitted) this.validate();
  }

  private validate(): boolean {
    const result = LoginSchema.safeParse({ email: this.email, password: this.password });
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
      const { error } = await this.supabase.signIn(this.email.trim(), this.password);
      if (error) throw error;
      this.router.navigate(['/dashboard']);
    } catch (e: unknown) {
      this.error = this.friendlyError(e);
    } finally {
      this.loading = false;
    }
  }

  private friendlyError(error: unknown): string {
    const message = String((error as { message?: string })?.message ?? '').toLowerCase();
    if (message.includes('invalid login') || message.includes('invalid credentials')) {
      return this.i18n.t('error.invalidCredentials');
    }
    if (message.includes('email not confirmed')) {
      return this.i18n.t('error.emailNotConfirmed');
    }
    if (message.includes('network') || message.includes('fetch')) {
      return this.i18n.t('error.network');
    }
    return this.i18n.t('error.generic');
  }
}
