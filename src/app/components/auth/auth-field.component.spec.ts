import { I18nService } from '../../services/i18n.service';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthFieldComponent } from './auth-field.component';

@Component({
  standalone: true,
  imports: [NgIf, FormsModule, AuthFieldComponent],
  template: `
    <app-auth-field type="password" name="pw" label="Password" [error]="error" [(ngModel)]="value">
      <span *ngIf="withHint" class="hint">hint</span>
    </app-auth-field>`,
})
class HostComponent {
  value = 'initial';
  error = '';
  withHint = false;
}

describe('AuthFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let input: HTMLInputElement;

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    TestBed.inject(I18nService).setLang('th');
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
  }));

  it('binds two-way through ngModel and links the label', fakeAsync(() => {
    expect(input.value).toBe('initial');
    expect(fixture.nativeElement.querySelector('label').getAttribute('for')).toBe(input.id);

    input.value = 'typed';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value).toBe('typed');

    fixture.componentInstance.value = 'from model';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(input.value).toBe('from model');
  }));

  it('toggles password visibility', () => {
    const toggle = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(input.type).toBe('password');
    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('wires the error to the input for screen readers', () => {
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe(`${input.id}-hint`);

    fixture.componentInstance.error = 'register.error.passwordRequired';
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector(`#${input.id}-error`) as HTMLElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(`${errorEl.id} ${input.id}-hint`);
    expect(errorEl.textContent).toContain('กรุณากรอกรหัสผ่าน');
  });

  it('places projected hint content in the described element', () => {
    fixture.componentInstance.withHint = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(`#${input.id}-hint .hint`)).not.toBeNull();
  });
});
