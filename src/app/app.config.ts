import { ApplicationConfig } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, withViewTransitions, ViewTransitionInfo } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';

const leafPath = (route: ActivatedRouteSnapshot): string | undefined => {
  while (route.firstChild) route = route.firstChild;
  return route.routeConfig?.path;
};

// Only game -> summary slides; every other navigation switches instantly.
// The vt-slide class names the page and sky layers for the CSS in training.css.
const slideGameToSummary = ({ transition, from, to }: ViewTransitionInfo) => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || leafPath(from) !== 'game' || leafPath(to) !== 'summary') {
    transition.skipTransition();
    return;
  }
  const root = document.documentElement;
  root.classList.add('vt-slide');
  transition.finished.finally(() => root.classList.remove('vt-slide'));
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated: slideGameToSummary })),
    provideAnimationsAsync(),
  ]
};
