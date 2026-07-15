// 측정된 음역대(MIDI low/high) → 성종 분류

export interface VoiceType {
  id: string;
  name: string;
  /** 전형적인 음역 (MIDI) */
  low: number;
  high: number;
}

// 전형적 성종 음역 (MIDI: C4 = 60)
export const VOICE_TYPES: VoiceType[] = [
  { id: 'bass', name: '베이스', low: 40, high: 64 }, // E2–E4
  { id: 'baritone', name: '바리톤', low: 43, high: 67 }, // G2–G4
  { id: 'tenor', name: '테너', low: 48, high: 72 }, // C3–C5
  { id: 'alto', name: '알토', low: 53, high: 77 }, // F3–F5
  { id: 'mezzo', name: '메조소프라노', low: 57, high: 81 }, // A3–A5
  { id: 'soprano', name: '소프라노', low: 60, high: 84 }, // C4–C6
];

/**
 * 사용자 음역과 전형적 성종 음역의 겹침이 가장 큰 성종을 고른다.
 * 겹침이 같으면 중심음이 가까운 쪽 우선.
 */
export function classifyVoice(lowMidi: number, highMidi: number): VoiceType {
  const userMid = (lowMidi + highMidi) / 2;
  let best = VOICE_TYPES[0];
  let bestScore = -Infinity;
  for (const vt of VOICE_TYPES) {
    const overlap = Math.min(highMidi, vt.high) - Math.max(lowMidi, vt.low);
    const midDist = Math.abs(userMid - (vt.low + vt.high) / 2);
    const score = overlap - midDist * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = vt;
    }
  }
  return best;
}

/** 음역 폭을 "n옥타브 m반음" 문자열로 */
export function rangeWidthLabel(lowMidi: number, highMidi: number): string {
  const semitones = highMidi - lowMidi;
  const octaves = Math.floor(semitones / 12);
  const rest = semitones % 12;
  if (octaves === 0) return `${rest}반음`;
  return rest === 0 ? `${octaves}옥타브` : `${octaves}옥타브 ${rest}반음`;
}
