import { Component, OnInit, OnDestroy, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { ZenBalloonComponent } from '../zen-balloon/zen-balloon.component';
import { I18nService } from '../../services/i18n.service';
import { SupabaseService } from '../../services/supabase.service';
import { DataSyncService } from '../../services/data-sync.service';

// Safety net in case the final praise never reports that it finished.
export const FINISH_FALLBACK_MS = 3000;

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, ZenBalloonComponent],
  template: `
    <div class="game-layout-root text-slate-900 dark:text-slate-200">
      <div class="game-content">
        <app-zen-balloon 
          class="w-full h-full block min-h-0"
          [currentForce]="ctar.currentForce" 
          [peakForce]="ctar.peakForce"
          [maxForceLimit]="ctar.calibrationMaxForce()"
          [currentRep]="ctar.repCount()"
          [targetReps]="targetReps()"
          [requiredHoldTimeMs]="holdDurationMs()"
          (repCompleted)="onGameRep()"
          (celebrationDone)="onCelebrationDone()"
          (sessionExit)="onSessionExit($event)"
          (exitDialogChange)="onExitDialogChange($event)">
        </app-zen-balloon>
      </div>
    </div>
  `,
  styles: [`
    .game-layout-root {
      min-height: calc(100dvh - var(--app-navbar-height, 0px));
      padding: 0.75rem;
    }
    .game-content { width: 100%; max-width: 1120px; margin-inline: auto; }
    @media (min-width: 768px) { .game-layout-root { padding: 2rem; } }
  `]
})
export class GameComponent implements OnInit, OnDestroy {
  public targetReps = signal<number>(15);
  public holdDurationMs = signal<number>(2000);
  public i18n = inject(I18nService);

  private sessionEnding = false;
  private exitDialogOpen = false;
  private exitCommitted = false;
  private endTimer: any;
  private celebrated = false;
  private supabase = inject(SupabaseService);
  private dataSync = inject(DataSyncService);

  constructor(public ctar: CtarLogicService, private router: Router) {
    effect(() => {
      if (this.ctar.repCount() >= this.targetReps() && !this.sessionEnding) {
        this.sessionEnding = true;
        // Leave when the final praise has been heard (onCelebrationDone);
        // the timer only covers a voice that never reports back.
        if (this.celebrated && !this.exitDialogOpen) this.leaveForSummary();
        else this.scheduleFinish();
      }
    });
  }

  async ngOnInit() {
    this.ctar.resetSession();
    if (this.ctar.calibrationMaxForce() === 0) {
      this.router.navigate(['/calibrate']);
      return;
    }

    // Fetch custom settings for this patient
    const user = this.supabase.currentUser();
    if (user) {
      const profile = await this.dataSync.fetchPatientProfile(user.id);
      if (profile) {
        if (profile.target_reps !== undefined && profile.target_reps !== null) {
          this.targetReps.set(profile.target_reps);
        }
        if (profile.hold_duration_ms !== undefined && profile.hold_duration_ms !== null) {
          this.holdDurationMs.set(profile.hold_duration_ms);
        }
      }
    }
  }

  ngOnDestroy() {
    if (this.endTimer) {
      clearTimeout(this.endTimer);
    }
  }

  onGameRep() {
    // ZenBalloon emits only after a complete hold + release cycle. Ignore a
    // duplicate completion event or anything arriving after the target is met.
    if (this.sessionEnding || this.ctar.repCount() >= this.targetReps()) return;

    this.ctar.repCount.update((count: number) => Math.min(count + 1, this.targetReps()));
  }

  onExitDialogChange(open: boolean): void {
    this.exitDialogOpen = open;
    this.ctar.setSessionPaused(open);
    clearTimeout(this.endTimer);
    if (!open && this.sessionEnding) {
      if (this.celebrated) this.leaveForSummary();
      else this.scheduleFinish();
    }
  }

  onCelebrationDone(): void {
    this.celebrated = true;
    if (this.sessionEnding && !this.exitDialogOpen) this.leaveForSummary();
  }

  onSessionExit(choice: 'save' | 'discard' | 'leave'): void {
    if (this.exitCommitted) return;
    this.exitCommitted = true;
    clearTimeout(this.endTimer);
    this.sessionEnding = true;
    if (choice === 'save') {
      this.finishSession();
    } else {
      this.ctar.resetSession();
      void this.router.navigate(['/patient-portal']);
    }
  }

  private scheduleFinish(): void {
    if (!this.exitDialogOpen) this.endTimer = setTimeout(() => this.leaveForSummary(), FINISH_FALLBACK_MS);
  }

  private leaveForSummary(): void {
    if (this.exitCommitted) return;
    this.exitCommitted = true;
    clearTimeout(this.endTimer);
    this.finishSession();
  }

  finishSession() {
    // Capture before navigation so later BLE samples cannot change the saved result.
    this.ctar.getSessionSnapshot();
    void this.router.navigate(['/summary']);
  }
}
