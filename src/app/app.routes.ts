import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CalibrateComponent } from './components/calibrate/calibrate.component';
import { GameComponent } from './components/game/game.component';
import { SummaryComponent } from './components/summary/summary.component';
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

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Role-based redirect
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  // Patient flow
  { path: 'patient-portal', loadComponent: () => import('./components/patient-portal/patient-portal.component').then(m => m.PatientPortalComponent), canActivate: [authGuard] },
  { path: 'calibrate', component: CalibrateComponent, canActivate: [authGuard] },
  { path: 'game', component: GameComponent, canActivate: [authGuard] },
  { path: 'summary', component: SummaryComponent, canActivate: [authGuard] },

  // Clinic flow (doctor only)
  {
    path: 'clinic',
    canActivate: [authGuard, doctorGuard],
    children: [
      {
        path: 'records',
        loadComponent: () => import('./components/clinic/clinic-dashboard.component').then(m => m.ClinicDashboardComponent)
      },
      {
        path: 'patient/:id',
        loadComponent: () => import('./components/clinic/patient-detail/patient-detail.component').then(m => m.PatientDetailComponent)
      },
      { path: '', redirectTo: 'records', pathMatch: 'full' }
    ]
  },

  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
