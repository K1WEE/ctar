import { Component, ElementRef, Input, ViewChild, forwardRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { I18nService } from '../../services/i18n.service';

let nextId = 0;

/**
 * Labelled text input for the auth pages. Works with [(ngModel)] and renders
 * its own error text, wired to the input via aria-invalid/aria-describedby.
 * Anything projected into the field (e.g. a password checklist) is placed
 * under the input and announced as part of its description.
 */
@Component({
  selector: 'app-auth-field',
  standalone: true,
  imports: [CommonModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AuthFieldComponent), multi: true }],
  template: `
    <label [for]="inputId" class="mb-2 block text-lg font-bold text-slate-700 sm:text-xl dark:text-slate-300">{{ label }}</label>
    <div class="relative">
      <span *ngIf="icon" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5" aria-hidden="true">
        <i [class]="icon + ' text-lg text-slate-400 dark:text-slate-500'"></i>
      </span>
      <input #input
        [id]="inputId"
        [type]="type === 'password' && revealed ? 'text' : type"
        [value]="value"
        [attr.name]="name"
        [attr.autocomplete]="autocomplete"
        [attr.placeholder]="placeholder || null"
        [attr.aria-invalid]="error ? 'true' : null"
        [attr.aria-describedby]="describedBy"
        [disabled]="disabled"
        (input)="onInput($any($event.target).value)"
        (blur)="onTouched()"
        class="auth-input w-full rounded-xl border bg-white py-4 text-lg text-slate-900 shadow-sm outline-none sm:text-xl dark:bg-slate-900/50 dark:text-white dark:shadow-none"
        [ngClass]="[icon ? 'pl-11' : 'pl-4', type === 'password' ? 'pr-14' : 'pr-4',
          error ? 'border-rose-600 dark:border-rose-400' : 'border-slate-300 dark:border-white/10']">
      <button *ngIf="type === 'password'" type="button"
        (click)="revealed = !revealed"
        [attr.aria-label]="revealed ? i18n.t('accessibility.hidePassword') : i18n.t('accessibility.showPassword')"
        [attr.aria-pressed]="revealed"
        class="reveal absolute right-1 top-1/2 h-12 w-12 -translate-y-1/2 rounded-lg text-slate-500 hover:text-blue-800 dark:text-slate-400 dark:hover:text-white">
        <i class="fa-solid" [ngClass]="revealed ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true"></i>
      </button>
    </div>
    <p *ngIf="error" [id]="errorId" class="mt-2 flex items-start gap-2 text-base font-medium text-rose-700 dark:text-rose-300">
      <i class="fa-solid fa-circle-exclamation mt-1" aria-hidden="true"></i>
      <span>{{ i18n.t(error) }}</span>
    </p>
    <div [id]="hintId" class="empty:hidden"><ng-content></ng-content></div>
  `,
  styles: [`
    :host { display: block; }
    .auth-input::placeholder { color: #94a3b8; font-style: italic; }
    .auth-input:focus { border-color: #1e40af; box-shadow: 0 0 0 2px #1e40af; }
    :host-context(.dark) .auth-input:focus { border-color: #93c5fd; box-shadow: 0 0 0 2px #93c5fd; }
    .reveal:focus-visible { outline: 2px solid #1e40af; outline-offset: 2px; }
  `]
})
export class AuthFieldComponent implements ControlValueAccessor {
  @Input({ required: true }) label = '';
  @Input() type: 'text' | 'email' | 'password' = 'text';
  @Input() name = '';
  @Input() icon = '';
  @Input() placeholder = '';
  @Input() autocomplete = '';
  /** i18n key of the current error, or empty when valid. */
  @Input() error = '';

  @ViewChild('input', { static: true }) private input!: ElementRef<HTMLInputElement>;

  readonly i18n = inject(I18nService);
  readonly inputId = `auth-field-${nextId++}`;
  readonly errorId = `${this.inputId}-error`;
  readonly hintId = `${this.inputId}-hint`;

  value = '';
  disabled = false;
  revealed = false;
  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  /** The hint container is always referenced; when empty it adds nothing. */
  get describedBy(): string {
    return this.error ? `${this.errorId} ${this.hintId}` : this.hintId;
  }

  focus(): void {
    this.input.nativeElement.focus();
  }

  onInput(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }
}
