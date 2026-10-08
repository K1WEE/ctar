/** Guidance level shown under the live force: 0 too light … 4 amazing. */
export type ForceLevel = 0 | 1 | 2 | 3 | 4;

const LEVEL_THRESHOLDS = [5, 10, 20, 30];

export function forceLevel(force: number): ForceLevel {
  if (!Number.isFinite(force)) return 0;
  return LEVEL_THRESHOLDS.filter(threshold => force >= threshold).length as ForceLevel;
}

// Ring colour climbs once the ring is full at 10 N. No red: it reads as "too much".
const COLOR_STOPS: Array<[number, [number, number, number]]> = [
  [10, [29, 78, 216]],  // brand blue
  [20, [5, 150, 105]],  // green
  [30, [245, 158, 11]], // gold
];

export function forceRingColor(force: number): string {
  const f = Number.isFinite(force) ? force : 0;
  const [first, last] = [COLOR_STOPS[0], COLOR_STOPS[COLOR_STOPS.length - 1]];
  if (f <= first[0]) return toRgb(first[1]);
  if (f >= last[0]) return toRgb(last[1]);
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const [toForce, to] = COLOR_STOPS[i];
    if (f <= toForce) {
      const [fromForce, from] = COLOR_STOPS[i - 1];
      const t = (f - fromForce) / (toForce - fromForce);
      return toRgb(from.map((c, k) => Math.round(c + (to[k] - c) * t)) as [number, number, number]);
    }
  }
  return toRgb(last[1]);
}

function toRgb([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}
