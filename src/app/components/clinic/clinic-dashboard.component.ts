import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataSyncService, PatientSummary } from '../../services/data-sync.service';
import { I18nService } from '../../services/i18n.service';

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Clinical Records: patient directory rendered inside the clinic shell. */
@Component({
  selector: 'app-clinic-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- KPI row -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" [attr.aria-busy]="isLoading()">
        <div *ngFor="let k of kpis()" class="cl-card cl-card-pad">
          <div class="flex items-start justify-between gap-3">
            <p class="font-semibold pp-muted">{{ k.label }}</p>
            <span class="cl-icon-tile" [ngClass]="k.tone" aria-hidden="true"><i class="fa-solid" [ngClass]="k.icon"></i></span>
          </div>
          <p class="cl-kpi-value mt-3">
            <span *ngIf="!isLoading(); else kpiSkeleton">{{ k.value }}</span>
          </p>
          <p class="mt-1 pp-muted">{{ k.hint }}</p>
        </div>
      </section>
      <ng-template #kpiSkeleton><span class="cl-skeleton inline-block h-9 w-16 align-middle"></span></ng-template>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <!-- Patients -->
        <section class="cl-card lg:col-span-2" aria-labelledby="patients-heading">
          <div class="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6 pp-border">
            <div>
              <h2 id="patients-heading" class="text-lg font-bold pp-ink">{{ i18n.t('clinic.patients') }}</h2>
              <p class="pp-muted">{{ i18n.t('clinic.patientsDesc') }}</p>
            </div>
            <button type="button" class="cl-btn shrink-0" (click)="loadPatients()" [disabled]="isLoading()">
              <i class="fa-solid fa-rotate-right" [class.fa-spin]="isLoading()" aria-hidden="true"></i>
              {{ i18n.t('clinic.refresh') }}
            </button>
          </div>

          <div class="p-5 sm:px-6">
            <label for="patient-search" class="sr-only">{{ i18n.t('clinic.searchLabel') }}</label>
            <div class="relative">
              <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 pp-muted" aria-hidden="true"></i>
              <input id="patient-search" type="search" class="cl-input" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
                [placeholder]="i18n.t('clinic.search')" autocomplete="off">
            </div>
          </div>

          <!-- Loading -->
          <div *ngIf="isLoading()" class="space-y-3 px-5 pb-6 sm:px-6">
            <div *ngFor="let i of [1,2,3,4]" class="flex items-center gap-3">
              <span class="cl-skeleton h-10 w-10 rounded-full"></span>
              <span class="cl-skeleton h-5 flex-1"></span>
            </div>
          </div>

          <!-- Empty -->
          <div *ngIf="!isLoading() && filteredPatients().length === 0" class="px-5 pb-10 pt-6 text-center sm:px-6">
            <i class="fa-solid fa-users-slash mb-3 text-4xl pp-muted" aria-hidden="true"></i>
            <p class="text-lg pp-muted">{{ i18n.t('clinic.noPatients') }}</p>
          </div>

          <!-- List -->
          <div *ngIf="!isLoading() && filteredPatients().length > 0">
            <div class="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_32px] gap-4 border-y px-6 py-3 font-semibold md:grid pp-border pp-muted">
              <span>{{ i18n.t('clinic.col.name') }}</span>
              <span>{{ i18n.t('clinic.col.sessions') }}</span>
              <span>{{ i18n.t('clinic.col.last') }}</span>
              <span>{{ i18n.t('clinic.col.force') }}</span>
              <span></span>
            </div>
            <ul>
              <li *ngFor="let p of filteredPatients(); trackBy: trackById" class="border-b last:border-b-0 pp-border">
                <a [routerLink]="['/clinic/patient', p.id]" class="cl-row grid grid-cols-[minmax(0,1fr)_32px] items-center gap-x-4 gap-y-1 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_32px]">
                  <span class="flex min-w-0 items-center gap-3">
                    <span class="cl-avatar" aria-hidden="true">{{ (p.first_name || '?')[0] }}</span>
                    <span class="min-w-0">
                      <span class="block truncate font-semibold pp-ink">{{ p.first_name }} {{ p.last_name }}</span>
                      <span class="block pp-muted md:hidden">
                        {{ p.session_count }} {{ i18n.t('clinic.sessions') }}
                        <ng-container *ngIf="p.last_session_date"> · {{ p.last_session_date | date:'d MMM y' }}</ng-container>
                      </span>
                    </span>
                  </span>
                  <span class="hidden tabular-nums md:block pp-ink">{{ p.session_count }}</span>
                  <span class="hidden md:block" [ngClass]="p.last_session_date ? 'pp-ink' : 'pp-muted italic'">
                    {{ p.last_session_date ? (p.last_session_date | date:'d MMM y') : i18n.t('clinic.noSessions') }}
                  </span>
                  <span class="hidden tabular-nums md:block" [ngClass]="p.last_max_force ? 'pp-success-text font-semibold' : 'pp-muted'">
                    {{ p.last_max_force ? (p.last_max_force | number:'1.0-1') + ' N' : '—' }}
                  </span>
                  <span class="row-start-1 col-start-2 flex justify-end pp-muted md:col-start-auto md:row-start-auto" aria-hidden="true">
                    <i class="fa-solid fa-chevron-right"></i>
                  </span>
                  <span class="sr-only">{{ i18n.t('clinic.viewDetails') }}</span>
                </a>
              </li>
            </ul>
          </div>
        </section>

        <!-- Recent activity -->
        <section class="cl-card cl-card-pad self-start" aria-labelledby="recent-heading">
          <h2 id="recent-heading" class="text-lg font-bold pp-ink">{{ i18n.t('clinic.recent') }}</h2>
          <p class="pp-muted">{{ i18n.t('clinic.recentDesc') }}</p>
          <ul *ngIf="!isLoading() && recentActivity().length > 0" class="mt-5 space-y-4">
            <li *ngFor="let p of recentActivity()" class="flex items-start gap-3">
              <span class="cl-avatar" aria-hidden="true">{{ (p.first_name || '?')[0] }}</span>
              <div class="min-w-0">
                <p class="pp-ink">
                  <a [routerLink]="['/clinic/patient', p.id]" class="font-semibold hover:underline">{{ p.first_name }} {{ p.last_name }}</a>
                  <span class="pp-muted"> {{ i18n.t('clinic.recentTrained') }}</span>
                </p>
                <p class="pp-muted">{{ p.last_session_date | date:'d MMM y, HH:mm' }}</p>
              </div>
            </li>
          </ul>
          <p *ngIf="!isLoading() && recentActivity().length === 0" class="mt-5 pp-muted">{{ i18n.t('clinic.recentEmpty') }}</p>
          <div *ngIf="isLoading()" class="mt-5 space-y-4">
            <div *ngFor="let i of [1,2,3]" class="flex items-center gap-3">
              <span class="cl-skeleton h-10 w-10 rounded-full"></span>
              <span class="cl-skeleton h-5 flex-1"></span>
            </div>
          </div>
        </section>
      </div>
    </div>
  `
})
export class ClinicDashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly dataSync = inject(DataSyncService);

  readonly patients = signal<PatientSummary[]>([]);
  readonly isLoading = signal(false);
  readonly searchQuery = signal('');

  readonly filteredPatients = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.patients();
    return this.patients().filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q));
  });

  readonly recentActivity = computed(() =>
    this.patients()
      .filter(p => !!p.last_session_date)
      .sort((a, b) => new Date(b.last_session_date!).getTime() - new Date(a.last_session_date!).getTime())
      .slice(0, 6));

  readonly kpis = computed(() => {
    const list = this.patients();
    const now = Date.now();
    const sessions = list.reduce((sum, p) => sum + (p.session_count || 0), 0);
    const active = list.filter(p => p.last_session_date && now - new Date(p.last_session_date).getTime() <= ACTIVE_WINDOW_MS).length;
    const forces = list.map(p => p.last_max_force).filter((f): f is number => typeof f === 'number' && f > 0);
    const avgForce = forces.length ? (forces.reduce((a, b) => a + b, 0) / forces.length).toFixed(1) + ' N' : '—';
    return [
      { label: this.i18n.t('clinic.totalPatients'), value: list.length, hint: this.i18n.t('clinic.kpi.patientsHint'), icon: 'fa-users', tone: '' },
      { label: this.i18n.t('clinic.totalSessions'), value: sessions, hint: this.i18n.t('clinic.kpi.sessionsHint'), icon: 'fa-chart-column', tone: '' },
      { label: this.i18n.t('clinic.kpi.active'), value: active, hint: this.i18n.t('clinic.kpi.activeHint').replace('{total}', String(list.length)), icon: 'fa-person-running', tone: 'is-success' },
      { label: this.i18n.t('clinic.kpi.avgForce'), value: avgForce, hint: this.i18n.t('clinic.kpi.avgForceHint'), icon: 'fa-bolt', tone: 'is-reward' },
    ];
  });

  ngOnInit() {
    void this.loadPatients();
  }

  async loadPatients() {
    this.isLoading.set(true);
    try {
      this.patients.set(await this.dataSync.fetchPatientList());
    } finally {
      this.isLoading.set(false);
    }
  }

  trackById(_: number, p: PatientSummary) {
    return p.id;
  }
}
