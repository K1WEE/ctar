import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { DataSyncService } from '../../services/data-sync.service';
import { SupabaseService } from '../../services/supabase.service';
import { I18nService } from '../../services/i18n.service';
import { TaskService, TaskUpdateResult } from '../../services/task.service';
import { SkySceneComponent } from '../sky-scene/sky-scene.component';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [CommonModule, SkySceneComponent],
  template: `
    <app-sky-scene></app-sky-scene>
    <div class="summary-page">
      <section class="summary-card" aria-labelledby="summary-title">
        <header class="summary-header">
          <div class="summary-trophy" aria-hidden="true"><i class="fa-solid fa-trophy"></i></div>
          <h2 id="summary-title">{{ i18n.t('summary.title') }}</h2>
          <p>{{ i18n.t('summary.subtitle') }}</p>
        </header>

        <div *ngIf="isSaving" class="summary-saving" role="status">
          <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
          <p>{{ i18n.t('summary.saving') }}</p>
        </div>

        <div *ngIf="!isSaving" class="summary-body animate-fade-in">
          <dl class="summary-stats">
            <div class="summary-stat">
              <dt><i class="fa-solid fa-stopwatch" aria-hidden="true"></i>{{ i18n.t('summary.duration') }}</dt>
              <dd class="summary-value">{{ currentStats.duration }}<span>s</span></dd>
            </div>
            <div class="summary-stat stat-gold">
              <dt><i class="fa-solid fa-repeat" aria-hidden="true"></i>{{ i18n.t('summary.reps') }}</dt>
              <dd class="summary-value">{{ currentStats.reps }}</dd>
              <dd class="summary-delta" [ngClass]="getImprovementColor(improvement.reps)">
                <i class="fa-solid" [ngClass]="getImprovementIcon(improvement.reps)" aria-hidden="true"></i>
                {{ formatImprovement(improvement.reps) }}
              </dd>
            </div>
            <div class="summary-stat">
              <dt><i class="fa-solid fa-gauge-high" aria-hidden="true"></i>{{ i18n.t('summary.peakForce') }}</dt>
              <dd class="summary-value">{{ currentStats.maxForce | number:'1.0-1' }}<span>N</span></dd>
              <dd class="summary-delta" [ngClass]="getImprovementColor(improvement.maxForce)">
                <i class="fa-solid" [ngClass]="getImprovementIcon(improvement.maxForce)" aria-hidden="true"></i>
                {{ formatImprovement(improvement.maxForce) }} N
              </dd>
            </div>
          </dl>

          <section *ngIf="missionUpdates.length" class="summary-missions" aria-labelledby="summary-missions-title">
            <h3 id="summary-missions-title">{{ i18n.t('summary.missions') }}</h3>

            <ul *ngIf="completedMissions.length" class="mission-badges">
              <li *ngFor="let m of completedMissions; let i = index" class="mission-badge" [style.animation-delay.ms]="400 + i * 150">
                <span class="mission-badge-icon" aria-hidden="true">
                  <i class="fa-solid" [ngClass]="m.icon"></i>
                  <span class="mission-badge-check"><i class="fa-solid fa-check"></i></span>
                </span>
                <strong class="mission-badge-title">{{ m.title }}</strong>
                <span class="sr-only">{{ i18n.t('summary.missionComplete') }}</span>
                <span *ngIf="m.starsAwarded > 0" class="mission-badge-stars" [attr.aria-label]="i18n.t('summary.starsEarned').replace('{0}', m.starsAwarded.toString())">
                  <i class="fa-solid fa-star" aria-hidden="true"></i>+{{ m.starsAwarded }}
                </span>
              </li>
            </ul>

            <ul *ngIf="progressedMissions.length" class="mission-progress">
              <li *ngFor="let m of progressedMissions">
                <span class="mission-progress-icon" aria-hidden="true"><i class="fa-solid" [ngClass]="m.icon"></i></span>
                <span class="mission-progress-main">
                  <span class="mission-progress-head">
                    <strong>{{ m.title }}</strong>
                    <span class="mission-progress-count">{{ m.progress }}/{{ m.target }} <span class="delta-up">+{{ m.progress - m.previousProgress }}</span></span>
                  </span>
                  <span class="mission-progress-track" aria-hidden="true"><span [style.width.%]="(m.progress / m.target) * 100"></span></span>
                </span>
              </li>
            </ul>
          </section>

          <div *ngIf="isOfflineSaved" role="status" class="summary-note note-warn">
            <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> {{ i18n.t('summary.savedOffline') }}
          </div>

          <div *ngIf="saveError" role="alert" class="summary-note note-error">
            <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {{ saveError }}
          </div>

          <div class="summary-actions">
            <button type="button" (click)="finish()">{{ i18n.t('summary.done') }}</button>
          </div>
        </div>
      </section>
    </div>
  `
})
export class SummaryComponent implements OnInit {
  public isSaving = true;
  public isOfflineSaved = false;
  public saveError = '';
  public i18n = inject(I18nService);

  public currentStats = {
    duration: 0,
    reps: 0,
    maxForce: 0
  };

  public missionUpdates: TaskUpdateResult[] = [];

  get completedMissions() {
    return this.missionUpdates.filter((m) => m.completedNow);
  }

  get progressedMissions() {
    return this.missionUpdates.filter((m) => !m.completedNow);
  }

  public improvement = {
    reps: 0,
    maxForce: 0
  };

  constructor(
    private ctar: CtarLogicService,
    private dataSync: DataSyncService,
    private supabase: SupabaseService,
    private router: Router,
    private taskService: TaskService 
  ) {}

  async ngOnInit() {
    const user = this.supabase.currentUser();
    if (!user) {
      this.saveError = this.i18n.t('error.loginRequired');
      this.isSaving = false;
      return;
    }

    // Freeze all values before awaiting the previous-session query. BLE data
    // can still arrive during that await, so reading stats and raw samples at
    // separate times could otherwise upload mismatched session metadata.
    const snapshot = this.ctar.getSessionSnapshot();
    this.currentStats.duration = snapshot.durationSeconds;
    this.currentStats.reps = snapshot.reps;
    this.currentStats.maxForce = snapshot.maxForce;

    try {
      const prevSession = await this.dataSync.fetchUserPreviousSession(user.id);
      
      if (prevSession) {
        this.improvement.reps = this.currentStats.reps - prevSession.reps;
        this.improvement.maxForce = this.currentStats.maxForce - prevSession.max_force;
      }
    } catch (e) {
      console.warn("Could not fetch previous session for comparison", e);
    }

    const rawData = snapshot.rawData;
    // Re-check after the previous-session await so a second summary instance
    // cannot repeat persistence after the first one has finished.
    if (rawData.length > 0 && !this.ctar.hasSessionSnapshotSaved()) {
      const uploadResult = await this.dataSync.uploadSessionData(
        user.id, 
        rawData, 
        this.currentStats.maxForce, 
        snapshot.avgForce,
        this.currentStats.reps, 
        this.currentStats.duration,
        snapshot.id
      );

      if (!uploadResult.success) {
        this.saveError = this.i18n.t('error.saveFailed');
      } else {
        this.ctar.markSessionFinalized();
        if (uploadResult.isOffline) {
          this.isOfflineSaved = true;
        }
        if (!uploadResult.alreadyProcessed) {
          this.missionUpdates = await this.taskService.updateTasksAfterSession(user.id, {
            maxForce:        this.currentStats.maxForce,
            durationMinutes: this.currentStats.duration / 60,
            reps:            this.currentStats.reps,
          });
        }
      }
    } else if (rawData.length === 0) {
      this.saveError = this.i18n.t('error.noData');
    }

    this.isSaving = false;

    // Play final session complete voice cue if not muted
    const isMuted = localStorage.getItem('zen_balloon_muted') === 'true';
    if (!isMuted) {
      const lang = this.i18n.voiceLanguage();
      if (lang) {
        const path = `/assets/audio/${lang}/cue_session_complete.mp3`;
        const audio = new Audio(path);
        audio.play().catch(err => console.warn('Failed to play session complete voice-over:', err));
      }
    }
  }

  getImprovementColor(val: number) {
    const improvement = val;
    if (improvement > 0) return 'delta-up';
    if (improvement < 0) return 'delta-down';
    return 'delta-flat';
  }

  getImprovementIcon(val: number) {
    if (val > 0) return 'fa-arrow-up';
    if (val < 0) return 'fa-arrow-down';
    return 'fa-minus';
  }

  formatImprovement(val: number) {
    if (val > 0) return '+' + val.toFixed(1);
    if (val < 0) return val.toFixed(1);
    return this.i18n.t('summary.noChange');
  }

  finish() {
    this.router.navigate(['/patient-portal']);
  }
}
