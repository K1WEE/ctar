import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CalibrateComponent } from './components/calibrate/calibrate.component';
import { SummaryComponent } from './components/summary/summary.component';
import { GameComponent } from './components/game/game.component';
import { HomeComponent } from './components/home/home.component';
import { SupabaseService } from './services/supabase.service';

const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  await supabase.sessionReady;

  if (supabase.currentUser()) {
    return true;
  }

  return router.parseUrl('/login');
};

const doctorGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  await supabase.sessionReady;

  const user = supabase.currentUser();
  if (!user) return router.parseUrl('/login');

  const role = await supabase.getUserRole(user.id);
  if (role === 'doctor' || role === 'admin') return true;

  return router.parseUrl('/patient-portal');
};

const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  await supabase.sessionReady;

  const user = supabase.currentUser();
  if (!user) return router.parseUrl('/login');

  const role = await supabase.getUserRole(user.id);
  if (role === 'admin') return true;

  return router.parseUrl('/clinic/records');
};

// /dashboard is a pure redirect. Resolving it in a guard (instead of the
// component's ngOnInit) means every navigation to /dashboard redirects, even
// when a duplicate /dashboard navigation (login + auth-state effect) cancels
// the first redirect and the router would otherwise reuse the component.
const roleRedirectGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  await supabase.sessionReady;

  const user = supabase.currentUser();
  if (!user) return router.parseUrl('/login');

  const role = await supabase.getUserRole(user.id);
  if (role === 'admin') return router.parseUrl('/clinic/users');
  if (role === 'doctor') return router.parseUrl('/clinic/records');

  return router.parseUrl('/patient-portal');
};

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // Role-based redirect
  { path: 'dashboard', component: DashboardComponent, canActivate: [roleRedirectGuard] },

  // Patient flow
  { path: 'patient-portal', loadComponent: () => import('./components/patient-portal/patient-portal.component').then(m => m.PatientPortalComponent), canActivate: [authGuard] },
  { path: 'calibrate', component: CalibrateComponent, canActivate: [authGuard] },
  { path: 'game', component: GameComponent, canActivate: [authGuard] },
  { path: 'summary', component: SummaryComponent, canActivate: [authGuard] },

  // Clinic flow (doctor/admin) — one sidebar shell around every clinic page
  {
    path: 'clinic',
    canActivate: [authGuard, doctorGuard],
    loadComponent: () => import('./components/clinic/clinic-shell.component').then(m => m.ClinicShellComponent),
    children: [
      {
        path: 'users',
        canActivate: [adminGuard],
        data: { titleKey: 'clinic.nav.users' },
        loadComponent: () => import('./components/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'records',
        data: { titleKey: 'clinic.nav.records' },
        loadComponent: () => import('./components/clinic/clinic-dashboard.component').then(m => m.ClinicDashboardComponent)
      },
      {
        path: 'live',
        data: { titleKey: 'clinic.nav.live' },
        loadComponent: () => import('./components/classic-dashboard/classic-dashboard.component').then(m => m.ClassicDashboardComponent)
      },
      {
        path: 'patient/:id',
        data: { titleKey: 'detail.title', backTo: '/clinic/records' },
        loadComponent: () => import('./components/clinic/patient-detail/patient-detail.component').then(m => m.PatientDetailComponent)
      },
      { path: '', redirectTo: 'records', pathMatch: 'full' }
    ]
  },

  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
