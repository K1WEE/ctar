import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CtarLogicService } from '../../services/ctar-logic.service';
import { ZenBalloonComponent } from '../zen-balloon/zen-balloon.component';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, ZenBalloonComponent],
  template: `
    <div class="game-layout-root h-screen max-h-screen overflow-hidden flex flex-col relative z-10 text-slate-800 dark:text-slate-200 p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
      <div class="max-w-[460px] mx-auto w-full h-full flex flex-col min-h-0 justify-center">
        <app-zen-balloon 
          class="w-full h-full block min-h-0"
          [currentForce]="ctar.currentForce" 
          [peakForce]="ctar.peakForce"
          [maxForceLimit]="ctar.calibrationMaxForce()"
          [currentRep]="ctar.repCount()"
          [targetReps]="targetReps"
          (repCompleted)="onGameRep()">
        </app-zen-balloon>
      </div>
    </div>
  `,
  styles: [`
    @media (max-height: 800px) {
      .game-layout-root {
        padding: 0.5rem !important;
      }
    }
  `]
})
export class GameComponent implements OnInit {
  public targetReps = 15;
  public i18n = inject(I18nService);

  constructor(public ctar: CtarLogicService, private router: Router) {
    effect(() => {
      if (this.ctar.repCount() >= this.targetReps) {
        this.finishSession();
      }
    });
  }

  ngOnInit() {
    this.ctar.resetSession();
    if (this.ctar.calibrationMaxForce() === 0) {
      this.router.navigate(['/calibrate']);
    }
  }

  onGameRep() {
    this.ctar.repCount.update((count: number) => count + 1);
  }

  finishSession() {
    this.router.navigate(['/summary']);
  }
}
