import { forceLevel, forceRingColor } from './force-guidance';

describe('forceLevel', () => {
  it('climbs through the 5 / 10 / 20 / 30 N boundaries', () => {
    expect(forceLevel(0)).toBe(0);
    expect(forceLevel(4.9)).toBe(0);
    expect(forceLevel(5)).toBe(1);
    expect(forceLevel(9.9)).toBe(1);
    expect(forceLevel(10)).toBe(2);
    expect(forceLevel(19.9)).toBe(2);
    expect(forceLevel(20)).toBe(3);
    expect(forceLevel(30)).toBe(4);
    expect(forceLevel(250)).toBe(4);
  });

  it('treats unusable readings as the lowest level', () => {
    expect(forceLevel(NaN)).toBe(0);
    expect(forceLevel(-3)).toBe(0);
  });
});

describe('forceRingColor', () => {
  it('stays brand blue up to the 10 N ring maximum', () => {
    expect(forceRingColor(0)).toBe('rgb(29, 78, 216)');
    expect(forceRingColor(10)).toBe('rgb(29, 78, 216)');
  });

  it('reaches green at 20 N and gold from 30 N up', () => {
    expect(forceRingColor(20)).toBe('rgb(5, 150, 105)');
    expect(forceRingColor(30)).toBe('rgb(245, 158, 11)');
    expect(forceRingColor(80)).toBe('rgb(245, 158, 11)');
  });

  it('blends between stops', () => {
    expect(forceRingColor(15)).toBe('rgb(17, 114, 161)');
  });

  it('falls back to blue for unusable readings', () => {
    expect(forceRingColor(NaN)).toBe('rgb(29, 78, 216)');
  });
});
