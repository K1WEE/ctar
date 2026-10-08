import { I18nService } from '../../services/i18n.service';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RegisterComponent } from './register.component';
import { SupabaseService } from '../../services/supabase.service';
import { FontScaleService } from '../../services/font-scale.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let signUp: jasmine.Spy;
  let from: jasmine.Spy;

  beforeEach(async () => {
    signUp = jasmine.createSpy('signUp').and.resolveTo({ data: { user: { id: 'u1' }, session: null }, error: null });
    from = jasmine.createSpy('from');
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), { provide: SupabaseService, useValue: { signUp, client: { from } } }],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterComponent);
    TestBed.inject(I18nService).setLang('th');
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(FontScaleService).setFontScale('normal'));

  const inputs = () => Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[];
  const submit = () => (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
  const fill = (values: string[]) => inputs().forEach((input, i) => {
    input.value = values[i];
    input.dispatchEvent(new Event('input'));
  });

  it('shows every field error at once', fakeAsync(() => {
    fill(['', '', 'bad', 'abc']);
    submit();
    tick();
    fixture.detectChanges();
    expect(inputs().map(input => input.getAttribute('aria-invalid'))).toEqual(['true', 'true', 'true', 'true']);
    expect(document.activeElement).toBe(inputs()[0]);
    expect(signUp).not.toHaveBeenCalled();
  }));

  it('ticks password rules as the user types', () => {
    fill(['', '', '', 'Abcdef1']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-password-rules .fa-circle-check').length).toBe(3);
  });

  it('shows the confirmation panel without touching the patients table', fakeAsync(() => {
    fill([' สมชาย ', 'ใจดี', 'somchai@example.com', 'Ctar1234']);
    submit();
    tick();
    fixture.detectChanges();

    expect(signUp).toHaveBeenCalledWith('somchai@example.com', 'Ctar1234', { first_name: 'สมชาย', last_name: 'ใจดี' });
    expect(from).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('somchai@example.com');
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).not.toBeNull();
  }));
});
