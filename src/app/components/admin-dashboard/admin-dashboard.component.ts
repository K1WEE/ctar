import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { I18nService } from '../../services/i18n.service';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
}

type RoleFilter = 'all' | 'user' | 'doctor';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- KPI row -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-3" [attr.aria-busy]="loading()">
        <div *ngFor="let k of kpis()" class="cl-card cl-card-pad">
          <div class="flex items-start justify-between gap-3">
            <p class="font-semibold pp-muted">{{ k.label }}</p>
            <span class="cl-icon-tile" [ngClass]="k.tone" aria-hidden="true"><i class="fa-solid" [ngClass]="k.icon"></i></span>
          </div>
          <p class="cl-kpi-value mt-3">
            <span *ngIf="!loading(); else kpiSkeleton">{{ k.value }}</span>
          </p>
          <p class="mt-1 pp-muted">{{ k.hint }}</p>
        </div>
      </section>
      <ng-template #kpiSkeleton><span class="cl-skeleton inline-block h-9 w-16 align-middle"></span></ng-template>

      <section class="cl-card" aria-labelledby="users-heading">
        <div class="flex flex-col gap-4 border-b p-5 sm:p-6 pp-border">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="users-heading" class="text-lg font-bold pp-ink">{{ i18n.t('admin.title') }}</h2>
              <p class="pp-muted">{{ i18n.t('admin.desc') }}</p>
            </div>
            <button type="button" class="cl-btn shrink-0" (click)="fetchUsers()" [disabled]="loading()">
              <i class="fa-solid fa-rotate-right" [class.fa-spin]="loading()" aria-hidden="true"></i>
              {{ i18n.t('clinic.refresh') }}
            </button>
          </div>
          <div class="flex flex-col gap-3 md:flex-row md:items-center">
            <div class="relative flex-1">
              <label for="user-search" class="sr-only">{{ i18n.t('admin.searchLabel') }}</label>
              <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 pp-muted" aria-hidden="true"></i>
              <input id="user-search" type="search" class="cl-input" [ngModel]="query()" (ngModelChange)="query.set($event)"
                [placeholder]="i18n.t('admin.search')" autocomplete="off">
            </div>
            <div role="group" [attr.aria-label]="i18n.t('admin.filterLabel')" class="flex flex-wrap gap-2">
              <button *ngFor="let f of filters" type="button" class="cl-chip" (click)="roleFilter.set(f)" [attr.aria-pressed]="roleFilter() === f">
                {{ f === 'all' ? i18n.t('admin.filter.all') : i18n.t('clinic.role.' + f) }}
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="error()" role="alert" class="m-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <i class="fa-solid fa-triangle-exclamation mt-1" aria-hidden="true"></i> {{ error() }}
        </div>

        <div *ngIf="loading()" class="space-y-3 p-5 sm:p-6">
          <div *ngFor="let i of [1,2,3,4,5]" class="flex items-center gap-3">
            <span class="cl-skeleton h-10 w-10 rounded-full"></span>
            <span class="cl-skeleton h-5 flex-1"></span>
          </div>
        </div>

        <p *ngIf="!loading() && !error() && filteredUsers().length === 0" class="px-6 py-10 text-center text-lg pp-muted">
          {{ i18n.t('admin.empty') }}
        </p>

        <div *ngIf="!loading() && filteredUsers().length > 0" class="overflow-x-auto">
          <table class="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr class="border-b pp-border pp-muted">
                <th scope="col" class="px-6 py-3 font-semibold">{{ i18n.t('clinic.col.name') }}</th>
                <th scope="col" class="px-4 py-3 font-semibold">{{ i18n.t('admin.col.id') }}</th>
                <th scope="col" class="px-4 py-3 font-semibold">{{ i18n.t('admin.col.joined') }}</th>
                <th scope="col" class="px-4 py-3 font-semibold">{{ i18n.t('admin.col.role') }}</th>
                <th scope="col" class="px-6 py-3 text-right font-semibold">{{ i18n.t('admin.col.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsers(); trackBy: trackById" class="cl-row border-b last:border-b-0 pp-border">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <span class="cl-avatar" aria-hidden="true">{{ (u.first_name || '?')[0] }}</span>
                    <span class="font-semibold pp-ink">{{ u.first_name }} {{ u.last_name }}</span>
                  </div>
                </td>
                <td class="px-4 py-4 font-mono pp-muted" [title]="u.id">{{ u.id.substring(0, 8) }}…</td>
                <td class="px-4 py-4 tabular-nums pp-muted">{{ u.created_at | date:'d MMM y' }}</td>
                <td class="px-4 py-4">
                  <span class="cl-badge" [ngClass]="u.role === 'doctor' ? 'pp-success-soft pp-success-text' : 'pp-action-soft pp-action-text'">
                    {{ i18n.t('clinic.role.' + u.role) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button *ngIf="u.role !== 'user'" type="button" class="cl-btn" (click)="changeRole(u, 'user')" [disabled]="updatingId() === u.id">
                    <i *ngIf="updatingId() === u.id" class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                    {{ i18n.t('admin.makeUser') }}
                  </button>
                  <button *ngIf="u.role !== 'doctor'" type="button" class="cl-btn is-success" (click)="changeRole(u, 'doctor')" [disabled]="updatingId() === u.id">
                    <i *ngIf="updatingId() === u.id" class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                    {{ i18n.t('admin.makeDoctor') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly supabase = inject(SupabaseService);

  readonly users = signal<UserData[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly updatingId = signal<string | null>(null);
  readonly query = signal('');
  readonly roleFilter = signal<RoleFilter>('all');
  readonly filters: RoleFilter[] = ['all', 'user', 'doctor'];

  readonly filteredUsers = computed(() => {
    const q = this.query().toLowerCase().trim();
    const role = this.roleFilter();
    return this.users().filter(u =>
      (role === 'all' || u.role === role) &&
      (!q || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)));
  });

  readonly kpis = computed(() => {
    const list = this.users();
    return [
      { label: this.i18n.t('admin.kpi.total'), value: list.length, hint: this.i18n.t('admin.kpi.totalHint'), icon: 'fa-users', tone: '' },
      { label: this.i18n.t('admin.kpi.doctors'), value: list.filter(u => u.role === 'doctor').length, hint: this.i18n.t('admin.kpi.doctorsHint'), icon: 'fa-user-doctor', tone: 'is-success' },
      { label: this.i18n.t('admin.kpi.users'), value: list.filter(u => u.role === 'user').length, hint: this.i18n.t('admin.kpi.usersHint'), icon: 'fa-user', tone: 'is-reward' },
    ];
  });

  ngOnInit() {
    void this.fetchUsers();
  }

  async fetchUsers() {
    this.loading.set(true);
    this.error.set('');
    try {
      const { data, error } = await this.supabase.client
        .from('patients')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.users.set(data || []);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async changeRole(user: UserData, newRole: string) {
    const message = this.i18n.t('admin.confirm')
      .replace('{name}', `${user.first_name} ${user.last_name}`.trim())
      .replace('{role}', this.i18n.t('clinic.role.' + newRole));
    if (!confirm(message)) return;

    this.updatingId.set(user.id);
    try {
      const { error } = await this.supabase.adminSetUserRole(user.id, newRole);
      if (error) throw error;
      this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (e: any) {
      alert(this.i18n.t('admin.failed') + e.message);
    } finally {
      this.updatingId.set(null);
    }
  }

  trackById(_: number, u: UserData) {
    return u.id;
  }
}
