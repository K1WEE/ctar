import { Component, OnInit, OnDestroy, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { ZenBalloonComponent } from '../zen-balloon/zen-balloon.component';
import { I18nService } from '../../services/i18n.service';
import { SupabaseService } from '../../services/supabase.service';
import { DataSyncService } from '../../services/data-sync.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, ZenBalloonComponent],
  template: `
    <div class="game-layout-root text-slate-900 dark:text-slate-200 bg-[#f5f7fb] dark:bg-[#0b1220]">
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
          (sessionExit)="onSessionExit($event)"
          (exitDialogChange)="onExitDialogChange($event)">
        </app-zen-balloon>
      </div>
    </div>
  `,
  styles: [`
    .game-layout-root {
      min-height: calc(100dvh - var(--app-navbar-height, 0px));
      padding: 1rem;
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
  private supabase = inject(SupabaseService);
  private dataSync = inject(DataSyncService);

  constructor(public ctar: CtarLogicService, private router: Router) {
    effect(() => {
      if (this.ctar.repCount() >= this.targetReps() && !this.sessionEnding) {
        this.sessionEnding = true;
        // Let the final rep's success chime + voice cue and the celebration
        // message play out before yanking the user to the summary page
        this.scheduleFinish();
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
    if (!open && this.sessionEnding) this.scheduleFinish();
  }

  onSessionExit(choice: 'save' | 'discard'): void {
    if (this.exitCommitted) return;
    this.exitCommitted = true;
    clearTimeout(this.endTimer);
    this.sessionEnding = true;
    if (choice === 'save') {
      this.finishSession();
    } else {
      this.ctar.resetSession();
      void this.router.navigate(['/calibrate']);
    }
  }

  private scheduleFinish(): void {
    if (!this.exitDialogOpen) this.endTimer = setTimeout(() => this.finishSession(), 3500);
  }

  finishSession() {
    // Capture before navigation so later BLE samples cannot change the saved result.
    this.ctar.getSessionSnapshot();
    void this.router.navigate(['/summary']);
  }
}
