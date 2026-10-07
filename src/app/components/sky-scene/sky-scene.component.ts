import { Component } from '@angular/core';

/**
 * Decorative sky shared by the game and summary pages. Animation delays are
 * offset by the page clock so clouds and birds continue from where they were
 * when the route changes, instead of jumping back to their start positions.
 */
@Component({
  selector: 'app-sky-scene',
  standalone: true,
  host: { 'aria-hidden': 'true', '[style.--clock]': 'clock' },
  template: `
    <span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span><span class="cloud c4"></span><span class="cloud c5"></span>
    <div class="bird-flock f1"><svg class="bird" viewBox="0 0 30 12"><path d="M1 9 Q8 1 15 8 Q22 1 29 9"/></svg><svg class="bird" viewBox="0 0 30 12"><path d="M1 9 Q8 1 15 8 Q22 1 29 9"/></svg><svg class="bird" viewBox="0 0 30 12"><path d="M1 9 Q8 1 15 8 Q22 1 29 9"/></svg></div>
    <div class="bird-flock f2"><svg class="bird" viewBox="0 0 30 12"><path d="M1 9 Q8 1 15 8 Q22 1 29 9"/></svg><svg class="bird" viewBox="0 0 30 12"><path d="M1 9 Q8 1 15 8 Q22 1 29 9"/></svg></div>
    <svg class="meadow" viewBox="0 0 1200 120" preserveAspectRatio="none">
      <path class="hill-back" d="M0 120 L0 44 Q150 12 320 36 T640 30 T960 34 T1200 26 L1200 120Z"/>
      <path class="hill-front" d="M0 120 L0 62 L4 55.0 L8 62.0 L12 52.5 L16 62.7 L20 50.0 L24 63.4 L28 55.4 L32 64.0 L36 52.8 L40 64.6 L44 58.2 L48 65.2 L52 55.6 L56 65.8 L60 52.8 L64 66.2 L68 58.0 L72 66.6 L76 55.2 L80 67.0 L84 60.3 L88 67.3 L92 57.3 L96 67.5 L100 54.2 L104 67.6 L108 59.0 L112 67.6 L116 55.8 L120 67.6 L124 60.6 L128 67.6 L132 57.2 L136 67.4 L140 53.8 L144 67.2 L148 58.4 L152 67.0 L156 54.9 L160 66.7 L164 59.4 L168 66.4 L172 55.9 L176 66.1 L180 52.4 L184 65.8 L188 56.8 L192 65.4 L196 53.3 L200 65.1 L204 57.8 L208 64.8 L212 54.4 L216 64.6 L220 51.0 L224 64.4 L228 55.6 L232 64.2 L236 52.3 L240 64.1 L244 57.0 L248 64.0 L252 53.8 L256 64.0 L260 50.6 L264 64.0 L268 55.5 L272 64.1 L276 52.5 L280 64.3 L284 57.5 L288 64.5 L292 54.5 L296 64.7 L300 51.6 L304 65.0 L308 56.7 L312 65.3 L316 53.9 L320 65.7 L324 59.0 L328 66.0 L332 56.2 L336 66.4 L340 53.4 L344 66.8 L348 58.5 L352 67.1 L356 55.6 L360 67.4 L364 60.7 L368 67.7 L372 57.8 L376 68.0 L380 54.8 L384 68.2 L388 59.7 L392 68.3 L396 56.6 L400 68.4 L404 61.4 L408 68.4 L412 58.1 L416 68.3 L420 54.8 L424 68.2 L428 59.4 L432 68.0 L436 55.9 L440 67.7 L444 60.3 L448 67.3 L452 56.7 L456 66.9 L460 53.0 L464 66.4 L468 57.3 L472 65.9 L476 53.5 L480 65.3 L484 57.6 L488 64.6 L492 53.8 L496 64.0 L500 49.9 L504 63.3 L508 54.0 L512 62.6 L516 50.1 L520 61.9 L524 54.3 L528 61.3 L532 50.4 L536 60.6 L540 46.6 L544 60.0 L548 50.9 L552 59.5 L556 47.2 L560 59.0 L564 51.5 L568 58.5 L572 47.9 L576 58.1 L580 44.4 L584 57.8 L588 49.0 L592 57.6 L596 45.6 L600 57.4 L604 50.3 L608 57.3 L612 47.0 L616 57.2 L620 43.9 L624 57.3 L628 48.7 L632 57.3 L636 45.7 L640 57.5 L644 50.7 L648 57.7 L652 47.7 L656 57.9 L660 44.7 L664 58.1 L668 49.8 L672 58.4 L676 46.9 L680 58.7 L684 52.0 L688 59.0 L692 49.1 L696 59.3 L700 46.1 L704 59.5 L708 51.2 L712 59.8 L716 48.2 L720 60.0 L724 53.1 L728 60.1 L732 50.0 L736 60.2 L740 46.9 L744 60.3 L748 51.7 L752 60.3 L756 48.4 L760 60.2 L764 53.1 L768 60.1 L772 49.7 L776 59.9 L780 46.3 L784 59.7 L788 50.8 L792 59.4 L796 47.3 L800 59.1 L804 51.7 L808 58.7 L812 48.1 L816 58.3 L820 44.5 L824 57.9 L828 48.9 L832 57.5 L836 45.3 L840 57.1 L844 49.7 L848 56.7 L852 46.1 L856 56.3 L860 42.6 L864 56.0 L868 47.1 L872 55.7 L876 43.6 L880 55.4 L884 48.2 L888 55.2 L892 44.8 L896 55.0 L900 41.6 L904 55.0 L908 46.4 L912 55.0 L916 43.2 L920 55.0 L924 48.2 L928 55.2 L932 45.2 L936 55.4 L940 42.3 L944 55.7 L948 47.5 L952 56.1 L956 44.7 L960 56.5 L964 50.0 L968 57.0 L972 47.4 L976 57.6 L980 44.8 L984 58.2 L988 50.2 L992 58.8 L996 47.6 L1000 59.4 L1004 53.1 L1008 60.1 L1012 50.6 L1016 60.8 L1020 48.0 L1024 61.4 L1028 53.5 L1032 62.1 L1036 50.9 L1040 62.7 L1044 56.3 L1048 63.3 L1052 53.6 L1056 63.8 L1060 50.9 L1064 64.3 L1068 56.1 L1072 64.7 L1076 53.3 L1080 65.1 L1084 58.3 L1088 65.3 L1092 55.4 L1096 65.6 L1100 52.3 L1104 65.7 L1108 57.2 L1112 65.8 L1116 54.0 L1120 65.8 L1124 58.8 L1128 65.8 L1132 55.5 L1136 65.7 L1140 52.1 L1144 65.5 L1148 56.7 L1152 65.3 L1156 53.3 L1160 65.1 L1164 57.9 L1168 64.9 L1172 54.4 L1176 64.6 L1180 51.0 L1184 64.4 L1188 55.5 L1192 64.1 L1196 52.1 L1200 63.9 L1200 120Z"/>
    </svg>
  `,
  styles: [`
    :host { position:fixed; inset:var(--app-navbar-height, 0px) 0 0; z-index:0; overflow:hidden; pointer-events:none; }
    .meadow { position:absolute; left:0; bottom:0; width:100%; height:var(--meadow-h); }
  `]
})
export class SkySceneComponent {
  readonly clock = `${Math.round(typeof performance === 'undefined' ? 0 : performance.now())}ms`;
}
