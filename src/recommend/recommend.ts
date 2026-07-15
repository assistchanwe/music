// 사용자 음역대와 곡 DB를 매칭해 추천 목록을 만든다.

export interface Song {
  title: string;
  artist: string;
  genre: string;
  /** 곡 멜로디 최저음 (MIDI) */
  lowNote: number;
  /** 곡 멜로디 최고음 (MIDI) */
  highNote: number;
}

export type MatchCategory = 'comfortable' | 'challenge' | 'transpose';

export interface Recommendation {
  song: Song;
  category: MatchCategory;
  /** 권장 키 조절 (반음 단위, 음수 = 키 내림). comfortable이면 0 */
  keyShift: number;
  /** 카테고리 내 정렬용 점수 (높을수록 위) */
  score: number;
}

/**
 * - comfortable: 곡 음역이 사용자 음역 안에 완전히 들어옴
 * - challenge: 합계 1~2반음만 벗어남 (원키 도전 가능)
 * - transpose: 키를 올리거나 내리면 부를 수 있음
 * - 키를 조절해도 안 되는 곡(곡 음역 폭 > 사용자 음역 폭)은 제외
 */
export function recommendSongs(
  userLow: number,
  userHigh: number,
  songs: Song[],
): Recommendation[] {
  const userWidth = userHigh - userLow;
  const results: Recommendation[] = [];

  for (const song of songs) {
    const overLow = Math.max(0, userLow - song.lowNote);
    const overHigh = Math.max(0, song.highNote - userHigh);
    const overflow = overLow + overHigh;

    if (overflow === 0) {
      // 사용자 음역을 알차게 쓰는 곡일수록, 그리고 곡이 음역 중앙에 놓일수록 점수 높음
      const usage = (song.highNote - song.lowNote) / Math.max(1, userWidth);
      const centering =
        Math.abs((song.lowNote + song.highNote) / 2 - (userLow + userHigh) / 2) / 12;
      results.push({ song, category: 'comfortable', keyShift: 0, score: usage - centering });
    } else if (overflow <= 2) {
      results.push({ song, category: 'challenge', keyShift: 0, score: -overflow });
    } else if (song.highNote - song.lowNote <= userWidth) {
      // 이동 가능 범위 [userLow - song.low, userHigh - song.high]에서 0에 가장 가까운 값
      const shiftMin = userLow - song.lowNote;
      const shiftMax = userHigh - song.highNote;
      const keyShift = Math.min(Math.max(0, shiftMin), shiftMax);
      results.push({ song, category: 'transpose', keyShift, score: -Math.abs(keyShift) });
    }
    // else: 키 조절로도 불가 → 제외
  }

  const order: Record<MatchCategory, number> = { comfortable: 0, challenge: 1, transpose: 2 };
  results.sort((a, b) => order[a.category] - order[b.category] || b.score - a.score);
  return results;
}
