import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-chin-tuck-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chin-tuck-demo flex flex-col items-center" [ngClass]="'size-' + size">
      <!-- SVG Animation -->
      <svg [attr.width]="svgWidth" [attr.height]="svgHeight" viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" class="chin-tuck-svg">
        
        <!-- Stationary Base & Body (rests on the chest) -->
        <g class="ctar-base-stationary">
          <!-- Base shadow -->
          <ellipse cx="100" cy="205" rx="40" ry="7" fill="#D1D5DB" opacity="0.4"/>
          <!-- Base (curved grey) -->
          <path d="M65 198 C65 206, 75 210, 100 210 C125 210, 135 206, 135 198 L135 180 C135 175, 130 170, 125 168 L75 168 C70 170, 65 175, 65 180 Z" fill="#F5F0E8" stroke="#D4CFC4" stroke-width="1"/>
          <!-- Body (white cylinder) -->
          <rect x="78" y="120" width="44" height="62" rx="5" fill="#F5F0E8" stroke="#D4CFC4" stroke-width="1"/>
          <!-- Copper/Gold Band -->
          <rect x="76" y="136" width="48" height="14" rx="7" fill="#C8956C" opacity="0.9"/>
        </g>

        <!-- Movable Parts (Chin Pad + Stem) -->
        <g class="movable-parts">
          <!-- Top stem of device -->
          <rect x="84" y="88" width="32" height="36" rx="4" fill="#F5F0E8" stroke="#D4CFC4" stroke-width="1"/>
          <!-- Chin Pad (grey oval on top) -->
          <ellipse cx="100" cy="86" rx="28" ry="7" fill="#B8B8B8" stroke="#A0A0A0" stroke-width="1"/>
          <!-- Pad highlight -->
          <ellipse cx="100" cy="84" rx="18" ry="3" fill="#C8C8C8" opacity="0.5"/>
          <!-- Glow ring around chin pad (pulses with arrow, moves with pad) -->
          <ellipse cx="100" cy="86" rx="34" ry="10" fill="none" stroke="#F59E0B" stroke-width="2.5" class="glow-ring"/>
        </g>

        <!-- Animated Press Arrow -->
        <g class="press-indicators">
          <!-- Arrow shaft -->
          <line x1="100" y1="20" x2="100" y2="48" stroke="#EF4444" stroke-width="3.5" stroke-linecap="round" class="press-arrow"/>
          <!-- Arrow head -->
          <polygon points="92,44 100,58 108,44" fill="#EF4444" class="press-arrow"/>
        </g>
        
      </svg>

      <!-- Step Labels -->
      <div *ngIf="showLabel" class="mt-4 space-y-2.5 text-left w-full max-w-xs px-4">
        <div class="flex items-center gap-3 text-base text-slate-700 dark:text-slate-355 font-semibold">
          <span class="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">1</span>
          <span>{{ i18n.t('onboarding.step1') }}</span>
        </div>
        <div class="flex items-center gap-3 text-base text-slate-700 dark:text-slate-355 font-semibold">
          <span class="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">2</span>
          <span>{{ i18n.t('onboarding.step2') }}</span>
        </div>
        <div class="flex items-center gap-3 text-base text-slate-700 dark:text-slate-355 font-semibold">
          <span class="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">3</span>
          <span>{{ i18n.t('onboarding.step3') }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chin-tuck-demo.size-sm .chin-tuck-svg { width: 80px; height: auto; }
    .chin-tuck-demo.size-md .chin-tuck-svg { width: 160px; height: auto; }
    .chin-tuck-demo.size-lg .chin-tuck-svg { width: 220px; height: auto; }

    /* Head & stem slide down to simulate chin pressing down */
    .movable-parts {
      animation: pressMotion 3s ease-in-out infinite;
      transform-origin: 100px 200px;
    }

    @keyframes pressMotion {
      0%, 25% { transform: translateY(0); }
      45%, 75% { transform: translateY(12px); }
      90%, 100% { transform: translateY(0); }
    }

    /* Arrow fades in and slides slightly down when pressing */
    .press-arrow {
      animation: arrowMotion 3s ease-in-out infinite;
    }

    @keyframes arrowMotion {
      0%, 20% { opacity: 0; transform: translateY(-8px); }
      35% { opacity: 1; transform: translateY(0); }
      75% { opacity: 1; transform: translateY(0); }
      85%, 100% { opacity: 0; transform: translateY(-8px); }
    }

    /* Glow ring pulses around the pad during maximum press */
    .glow-ring {
      opacity: 0;
      animation: glowPulse 3s ease-in-out infinite;
      transform-origin: 100px 86px;
    }

    @keyframes glowPulse {
      0%, 40% { opacity: 0; transform: scale(0.95); }
      45%, 70% { opacity: 0.8; transform: scale(1.05); }
      75%, 100% { opacity: 0; transform: scale(0.95); }
    }

    /* Accessibility: prefers-reduced-motion stops all animation */
    @media (prefers-reduced-motion: reduce) {
      .movable-parts { animation: none !important; transform: translateY(6px); }
      .press-arrow { animation: none !important; opacity: 0.7; }
      .glow-ring { animation: none !important; opacity: 0.4; }
    }
  `]
})
export class ChinTuckDemoComponent {
  public i18n = inject(I18nService);

  @Input() showLabel = true;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get svgWidth(): number {
    return this.size === 'sm' ? 80 : this.size === 'md' ? 160 : 220;
  }

  get svgHeight(): number {
    return Math.round(this.svgWidth * (220 / 200));
  }
}
