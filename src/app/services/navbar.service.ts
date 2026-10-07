import { Injectable, signal } from '@angular/core';

export interface GameNavbarControls {
  back: () => void;
  toggleMute: () => void;
  isMuted: () => boolean;
}

/** Page-owned actions, released when the training view is destroyed. */
@Injectable({ providedIn: 'root' })
export class NavbarService {
  readonly gameControls = signal<GameNavbarControls | null>(null);
  readonly homeLogout = signal<(() => void) | null>(null);

  registerHomeLogout(logout: () => void): () => void {
    this.homeLogout.set(logout);
    return () => {
      if (this.homeLogout() === logout) this.homeLogout.set(null);
    };
  }

  registerGame(controls: GameNavbarControls): () => void {
    this.gameControls.set(controls);
    return () => {
      if (this.gameControls() === controls) this.gameControls.set(null);
    };
  }
}
