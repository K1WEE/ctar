import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { z } from 'zod';
import { SupabaseService } from '../../services/supabase.service';
import { I18nService } from '../../services/i18n.service';
import { AuthShellComponent } from '../auth/auth-shell.component';
import { AuthFieldComponent } from '../auth/auth-field.component';
import { PasswordRulesComponent } from '../auth/password-rules.component';
import { emailSchema, fieldErrors, passwordSchema } from '../auth/password-policy';

export const UserSchema = z.object({
  firstName: z.string().trim().min(1, 'register.error.firstName'),
  lastName: z.string().trim().min(1, 'register.error.lastName'),
  email: emailSchema,
  password: passwordSchema,
});
export type User = z.infer<typeof UserSchema>;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthShellComponent, AuthFieldComponent, PasswordRulesComponent],
  template: `
    <app-auth-shell [title]="confirmationSentTo ? i18n.t('register.successTitle') : i18n.t('register.title')"
      [subtitle]="confirmationSentTo ? '' : i18n.t('register.subtitle')">
      <div *ngIf="confirmationSentTo; else form" role="status" class="space-y-6 text-center">
        <div class="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          <i class="fa-solid fa-envelope-circle-check text-4xl" aria-hidden="true"></i>
          <p class="text-lg font-medium break-words">{{ successBody }}</p>
        </div>
        <a routerLink="/login" class="auth-submit">{{ i18n.t('register.goToLogin') }}</a>
      </div>

      <ng-template #form>
        <form (ngSubmit)="onSubmit()" class="space-y-5">
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
            <app-auth-field name="firstName" autocomplete="given-name" [label]="i18n.t('register.firstName')"
              [placeholder]="i18n.t('auth.placeholder.firstName')"
              [(ngModel)]="firstName" (ngModelChange)="revalidate()" [error]="errors['firstName'] || ''"></app-auth-field>
            <app-auth-field name="lastName" autocomplete="family-name" [label]="i18n.t('register.lastName')"
              [placeholder]="i18n.t('auth.placeholder.lastName')"
              [(ngModel)]="lastName" (ngModelChange)="revalidate()" [error]="errors['lastName'] || ''"></app-auth-field>
          </div>

          <app-auth-field type="email" name="email" icon="fa-regular fa-envelope" autocomplete="email"
            placeholder="name@example.com" [label]="i18n.t('login.email')"
            [(ngModel)]="email" (ngModelChange)="revalidate()" [error]="errors['email'] || ''"></app-auth-field>

          <app-auth-field type="password" name="password" icon="fa-solid fa-lock" autocomplete="new-password"
            [placeholder]="i18n.t('auth.placeholder.password')" [label]="i18n.t('login.password')"
            [(ngModel)]="password" (ngModelChange)="revalidate()" [error]="errors['password'] || ''">
            <app-password-rules [password]="password"></app-password-rules>
          </app-auth-field>

          <div *ngIf="error" role="alert" class="auth-alert">
            <i class="fa-solid fa-circle-exclamation mt-1" aria-hidden="true"></i><span>{{ error }}</span>
          </div>

          <button type="submit" [disabled]="loading" class="auth-submit">
            <i *ngIf="loading" class="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>
            {{ loading ? i18n.t('register.loading') : i18n.t('register.submit') }}
          </button>
        </form>

        <p class="mt-6 text-center text-lg text-slate-600 dark:text-slate-300">
          {{ i18n.t('register.hasAccount') }}
          <a routerLink="/login" class="auth-link inline-flex min-h-12 items-center">{{ i18n.t('register.signIn') }}</a>
        </p>
      </ng-template>
    </app-auth-shell>
  `
})
export class RegisterComponent {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  loading = false;
  error = '';
  errors: Record<string, string> = {};
  submitted = false;
  /** Set when sign-up succeeded but the email still has to be confirmed. */
  confirmationSentTo = '';
  public i18n = inject(I18nService);

  @ViewChildren(AuthFieldComponent) private fields!: QueryList<AuthFieldComponent>;

  constructor(private supabase: SupabaseService, private router: Router) {}

  get successBody(): string {
    return this.i18n.t('register.successBody').replace('{email}', this.confirmationSentTo);
  }

  revalidate(): void {
    if (this.submitted) this.validate();
  }

  private validate(): User | null {
    const result = UserSchema.safeParse({
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
    });
    this.errors = result.success ? {} : fieldErrors(result.error);
    return result.success ? result.data : null;
  }

  async onSubmit() {
    this.submitted = true;
    const user = this.validate();
    if (!user) {
      this.fields.find(field => !!this.errors[field.name])?.focus();
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      // The patients row is created by the handle_new_user trigger on
      // auth.users, so it exists even when email confirmation is required.
      const { data, error } = await this.supabase.signUp(user.email, user.password, {
        first_name: user.firstName,
        last_name: user.lastName,
      });
      if (error) throw error;

      if (!data.session) {
        this.confirmationSentTo = user.email;
        return;
      }
      this.router.navigate(['/dashboard']);
    } catch (e: unknown) {
      this.error = this.friendlyError(e);
    } finally {
      this.loading = false;
    }
  }

  private friendlyError(error: unknown): string {
    const message = String((error as { message?: string })?.message ?? '').toLowerCase();
    if (message.includes('already registered') || message.includes('already been registered')) {
      return this.i18n.t('error.emailInUse');
    }
    if (message.includes('network') || message.includes('fetch')) {
      return this.i18n.t('error.network');
    }
    return this.i18n.t('error.generic');
  }
}
