import { describe, it, expect } from 'vitest';
import { SONGS } from './songDb';

describe('songDb', () => {
  it('모든 곡의 음이름이 파싱되고 low < high', () => {
    expect(SONGS.length).toBeGreaterThan(100);
    for (const s of SONGS) {
      expect(s.lowNote, `${s.title} low`).toBeGreaterThanOrEqual(36); // C2 이상
      expect(s.highNote, `${s.title} high`).toBeLessThanOrEqual(84); // C6 이하
      expect(s.lowNote, `${s.title} low<high`).toBeLessThan(s.highNote);
    }
  });

  it('중복 곡 없음', () => {
    const keys = SONGS.map((s) => `${s.artist}|${s.title}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
