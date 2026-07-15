// Hz ↔ MIDI 번호 ↔ 음이름 변환 유틸리티 (A4 = 440Hz = MIDI 69)

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidiFloat(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export function freqToMidi(freq: number): number {
  return Math.round(freqToMidiFloat(freq));
}

/** MIDI 번호 → "C3", "A#4" 형태의 음이름 */
export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octave}`;
}

/** "C3", "A#4" 형태의 음이름 → MIDI 번호 */
export function noteNameToMidi(name: string): number {
  const m = name.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) throw new Error(`잘못된 음이름: ${name}`);
  const idx = NOTE_NAMES.indexOf(m[1] as (typeof NOTE_NAMES)[number]);
  return (parseInt(m[2], 10) + 1) * 12 + idx;
}

/** freq가 가장 가까운 반음에서 몇 센트 벗어났는지 (-50 ~ +50) */
export function centsOff(freq: number): number {
  const midiFloat = freqToMidiFloat(freq);
  return Math.round((midiFloat - Math.round(midiFloat)) * 100);
}

/** 한국식 "n옥타브 X" 표기 (통용 기준: C4 = 2옥타브 도, C5 = 3옥타브 도) */
export function midiToKoreanNotation(midi: number): string {
  const octave = Math.floor(midi / 12) - 3;
  const noteKo = ['도', '도#', '레', '레#', '미', '파', '파#', '솔', '솔#', '라', '라#', '시'][
    ((midi % 12) + 12) % 12
  ];
  return `${octave}옥타브 ${noteKo}`;
}
