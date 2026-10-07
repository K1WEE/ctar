import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontScale, FontScaleService } from '../../services/font-scale.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-font-scale-control',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="variant === 'segmented'; else singleButton">
      <div class="flex items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800/90"
        [title]="buttonLabel()">
        <button
          type="button"
          (click)="stepDown()"
          [attr.aria-label]="i18n.t('accessibility.fontSize') + ': A-'"
          class="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all"
          [ngClass]="fontScale.fontScale() === 'normal'
            ? 'text-slate-400 dark:text-slate-500'
            : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'">
          A-
        </button>
        <button
          type="button"
          (click)="resetScale()"
          [attr.aria-label]="i18n.t('accessibility.fontSize') + ': ' + i18n.t('accessibility.fontSizeNormal')"
          class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
          [ngClass]="fontScale.fontScale() === 'normal'
            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
            : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'">
          {{ i18n.t('accessibility.fontSizeNormal') }}
        </button>
        <button
          type="button"
          (click)="stepUp()"
          [attr.aria-label]="i18n.t('accessibility.fontSize') + ': A+'"
          class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
          [ngClass]="fontScale.fontScale() !== 'normal'
            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
            : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'">
          A+
        </button>
      </div>
    </ng-container>

    <ng-template #singleButton>
      <div [ngClass]="inline
        ? 'font-scale-control relative z-40'
        : 'font-scale-control fixed top-[12px] right-[12px] z-50 sm:top-[16px] sm:right-[16px]'">
        <button
          type="button"
          (click)="cycleScale()"
          [attr.aria-label]="buttonLabel()"
          [title]="buttonLabel()"
          [class.rounded-xl]="inline"
          [class.rounded-full]="!inline"
          class="min-h-12 min-w-12 inline-flex items-center justify-center gap-2 border border-slate-300 bg-slate-100 px-3 py-2 text-[16px] font-black text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
          <span aria-hidden="true">Aa</span>
          <span>{{ labelFor(fontScale.fontScale()) }}</span>
        </button>
      </div>
    </ng-template>
    <p role="status" aria-live="polite" class="sr-only">{{ statusMessage() }}</p>
  `,
})
export class FontScaleControlComponent {
  @Input() inline = false;
  @Input() variant: 'single' | 'segmented' = 'single';
  public readonly fontScale = inject(FontScaleService);
  public readonly i18n = inject(I18nService);
  public readonly statusMessage = signal('');
  private readonly options: FontScale[] = ['normal', 'large', 'xlarge'];

  private nextScale(): FontScale {
    return this.options[(this.options.indexOf(this.fontScale.fontScale()) + 1) % this.options.length];
  }

  buttonLabel(): string {
    return this.i18n.t('accessibility.fontSize') + ': ' + this.labelFor(this.fontScale.fontScale())
      + '. ' + this.i18n.t('accessibility.fontSizeNext').replace('{0}', this.labelFor(this.nextScale()));
  }

  cycleScale(): void {
    const scale = this.nextScale();
    this.setFontScale(scale);
  }

  stepDown(): void {
    const current = this.fontScale.fontScale();
    if (current === 'xlarge') {
      this.setFontScale('large');
    } else if (current === 'large') {
      this.setFontScale('normal');
    }
  }

  resetScale(): void {
    this.setFontScale('normal');
  }

  stepUp(): void {
    const current = this.fontScale.fontScale();
    if (current === 'normal') {
      this.setFontScale('large');
    } else if (current === 'large') {
      this.setFontScale('xlarge');
    }
  }

  private setFontScale(scale: FontScale): void {
    this.fontScale.setFontScale(scale);
    this.statusMessage.set(this.i18n.t('accessibility.fontSizeApplied').replace('{0}', this.labelFor(scale)));
  }

  labelFor(scale: FontScale): string {
    const key: Record<FontScale, string> = {
      normal: 'accessibility.fontSizeNormal',
      large: 'accessibility.fontSizeLarge',
      xlarge: 'accessibility.fontSizeXLarge',
    };
    return this.i18n.t(key[scale]);
  }
}
