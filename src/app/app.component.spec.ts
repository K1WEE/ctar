import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app.component';
import { SupabaseService } from './services/supabase.service';
import { NavbarService } from './services/navbar.service';
import { FontScaleService } from './services/font-scale.service';

@Component({ standalone: true, template: '' })
class PageStub {}

describe('AppComponent shared navbar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(['login', 'register', 'patient-portal', 'game', 'calibrate', 'summary', 'clinic/records', 'clinic/patient/1', 'forgot-password', 'reset-password'].map(path => ({ path, component: PageStub }))),
        { provide: SupabaseService, useValue: { isInitialized: signal(false), currentUser: signal(null) } },
      ],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(FontScaleService).setFontScale('normal'));

  it('keeps one navbar across pages and font controls inside settings', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    for (const path of ['patient-portal', 'game', 'calibrate', 'summary', 'clinic/records', 'clinic/patient/1', 'forgot-password', 'reset-password', 'login', 'register']) {
      await router.navigateByUrl('/' + path);
      fixture.detectChanges();
      const count = ['login', 'register', 'forgot-password', 'reset-password'].includes(path) || path.startsWith('clinic/') ? 0 : 1;
      expect(fixture.nativeElement.querySelectorAll('app-navbar').length).withContext(path).toBe(count);
      expect(fixture.nativeElement.querySelectorAll('app-font-scale-control').length).withContext(path).toBe(0);
      const logoCount = count && !['game', 'calibrate'].includes(path) ? 1 : 0;
      expect(fixture.nativeElement.querySelectorAll('.brand-link').length).withContext(path).toBe(logoCount);
    }
    fixture.destroy();
  });

  it('uses ordered back navigation, delegates game actions, and preserves font choice', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/game');
    const back = jasmine.createSpy('back');
    const release = TestBed.inject(NavbarService).registerGame({back, toggleMute: () => {}, isMuted: () => true});
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-navbar-back]').click();
    expect(back).toHaveBeenCalledTimes(1);
    TestBed.inject(FontScaleService).setFontScale('xlarge');
    release();
    await router.navigateByUrl('/summary');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-navbar-back]').click();
    await fixture.whenStable();
    expect(router.url).toBe('/patient-portal');
    expect(TestBed.inject(FontScaleService).fontScale()).toBe('xlarge');
    fixture.destroy();
  });

  it('shows the home controls in one navbar and exposes mobile settings in its user menu', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/patient-portal');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('[data-home-navbar]') as HTMLElement;
    expect(nav).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-app-navbar]').length).toBe(1);
    expect(nav.querySelectorAll('app-font-scale-control').length).toBe(0);
    expect(nav.querySelector('#home-user-menu')).toBeNull();

    const toggle = nav.querySelector('[data-home-menu-toggle]') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(nav.querySelectorAll('app-font-scale-control').length).toBe(1);
    expect(nav.querySelector('#home-user-menu app-battery-status')).toBeNull();
    expect(nav.querySelector('.navbar-row app-battery-status')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(nav.querySelector('#home-user-menu')).toBeNull();
    fixture.destroy();
  });
});
