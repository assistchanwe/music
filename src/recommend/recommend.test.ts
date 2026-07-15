import { describe, it, expect } from 'vitest';
import { recommendSongs, type Song } from './recommend';

const song = (title: string, lowNote: number, highNote: number): Song => ({
  title,
  artist: 'test',
  genre: '발라드',
  lowNote,
  highNote,
});

describe('recommendSongs', () => {
  // 사용자: C3(48) ~ C5(72), 폭 24반음
  const userLow = 48;
  const userHigh = 72;

  it('사용자 음역 안에 완전히 들어오면 comfortable', () => {
    const r = recommendSongs(userLow, userHigh, [song('fit', 50, 70)]);
    expect(r).toHaveLength(1);
    expect(r[0].category).toBe('comfortable');
    expect(r[0].keyShift).toBe(0);
  });

  it('1~2반음 벗어나면 challenge (원키)', () => {
    const r = recommendSongs(userLow, userHigh, [song('high2', 50, 74)]);
    expect(r[0].category).toBe('challenge');
    expect(r[0].keyShift).toBe(0);
  });

  it('많이 벗어나지만 폭이 맞으면 transpose + 키 조절량 계산', () => {
    // 곡이 사용자보다 4반음 높음 → -4키로 내리면 딱 맞음
    const r = recommendSongs(userLow, userHigh, [song('high4', 52, 76)]);
    expect(r[0].category).toBe('transpose');
    expect(r[0].keyShift).toBe(-4);
  });

  it('키를 올려야 하는 곡도 계산', () => {
    const r = recommendSongs(userLow, userHigh, [song('low5', 43, 60)]);
    expect(r[0].category).toBe('transpose');
    expect(r[0].keyShift).toBe(5);
  });

  it('곡 음역 폭이 사용자보다 넓으면 제외', () => {
    const r = recommendSongs(userLow, userHigh, [song('tooWide', 40, 80)]);
    expect(r).toHaveLength(0);
  });

  it('정렬: comfortable → challenge → transpose 순', () => {
    const r = recommendSongs(userLow, userHigh, [
      song('transpose', 52, 76),
      song('comfortable', 50, 70),
      song('challenge', 50, 74),
    ]);
    expect(r.map((x) => x.category)).toEqual(['comfortable', 'challenge', 'transpose']);
  });

  it('comfortable 안에서는 음역을 알차게 쓰는 곡이 위', () => {
    const r = recommendSongs(userLow, userHigh, [
      song('narrow', 58, 62),
      song('full', 49, 71),
    ]);
    expect(r[0].song.title).toBe('full');
  });
});
