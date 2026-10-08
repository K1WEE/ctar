import { I18nService } from '../../services/i18n.service';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { SupabaseService } from '../../services/supabase.service';
import { FontScaleService } from '../../services/font-scale.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let signIn: jasmine.Spy;

  beforeEach(async () => {
    signIn = jasmine.createSpy('signIn').and.resolveTo({ error: null });
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: SupabaseService, useValue: { signIn } }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    TestBed.inject(I18nService).setLang('th');
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(FontScaleService).setFontScale('normal'));

  const inputs = () => Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[];
  const submit = () => (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('shows an error under every empty field and focuses the first one', fakeAsync(() => {
    submit();
    tick();
    fixture.detectChanges();

    const [email, password] = inputs();
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(email);
    expect(signIn).not.toHaveBeenCalled();
  }));

  it('clears field errors live after the first submit', fakeAsync(() => {
    submit();
    tick();
    fixture.detectChanges();
    type(inputs()[0], 'somchai@example.com');
    fixture.detectChanges();
    expect(inputs()[0].getAttribute('aria-invalid')).toBeNull();
    expect(inputs()[1].getAttribute('aria-invalid')).toBe('true');
  }));

  it('rejects a malformed email before calling Supabase', fakeAsync(() => {
    type(inputs()[0], 'somchai');
    type(inputs()[1], 'secret');
    submit();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('รูปแบบอีเมลไม่ถูกต้อง');
    expect(signIn).not.toHaveBeenCalled();
  }));

  it('explains an unconfirmed email', fakeAsync(() => {
    signIn.and.resolveTo({ error: { message: 'Email not confirmed' } });
    type(inputs()[0], 'somchai@example.com');
    type(inputs()[1], 'secret');
    submit();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('ยังไม่ได้ยืนยันอีเมล');
  }));

  it('signs in with a trimmed email and goes to the dashboard', fakeAsync(() => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    type(inputs()[0], ' somchai@example.com ');
    type(inputs()[1], 'secret');
    submit();
    tick();
    expect(signIn).toHaveBeenCalledWith('somchai@example.com', 'secret');
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  }));
});
