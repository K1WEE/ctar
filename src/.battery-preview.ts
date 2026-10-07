import 'zone.js';
import { Component, ViewChild, AfterViewInit, signal, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ZenBalloonComponent } from './app/components/zen-balloon/zen-balloon.component';
import { BleService } from './app/services/ble.service';

const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle('dark', params.get('theme') === 'dark');
localStorage.setItem('zen_balloon_muted', 'true');
@Component({
  selector: 'app-root', standalone: true, imports: [ZenBalloonComponent],
  template: `<div class="preview-page"><app-zen-balloon [currentForce]="force" [peakForce]="peak" [maxForceLimit]="20" [targetReps]="10"></app-zen-balloon></div>`,
  styles: [`.preview-page { padding: 0.5rem; max-width: 460px; margin: auto; } app-zen-balloon { display: block; }`]
})
class PreviewComponent implements AfterViewInit {
  force = signal(0); peak = signal(20);
  @ViewChild(ZenBalloonComponent) game!: ZenBalloonComponent;
  ble = inject(BleService);
  constructor() {
    this.ble.connectionState.set('Connected');
    this.ble.lastSampleAt.set(Date.now());
    this.ble.isSampleFresh = () => true;
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat32(0, 0, true);
    view.setUint8(4, +(params.get('battery') ?? '89'));
    (this.ble as any).handleCharacteristicValueChanged({target: {value: view}});
  }
  ngAfterViewInit() {
    setTimeout(() => {
      document.documentElement.style.fontSize = params.get('font') === 'large' ? '125%' : '100%';
      const state = params.get('state') ?? 'playing';
      this.game.gameFlowState.set(state === 'ready' ? 'ready' : state === 'countdown' ? 'countdown' : 'playing');
      if (state === 'exit') this.game.goBack();
      if (state === 'finish') this.game.finishSession();
      if (state === 'disconnected') {
        this.ble.connectionState.set('Disconnected');
        this.ble.batteryPercent.set(null);
        this.game.gameFlowState.set('disconnected');
      }
    });
  }
}
bootstrapApplication(PreviewComponent, { providers: [provideRouter([]), provideNoopAnimations()] });
