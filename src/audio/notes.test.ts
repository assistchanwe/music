import { describe, it, expect } from 'vitest';
import {
  midiToFreq,
  freqToMidi,
  midiToNoteName,
  noteNameToMidi,
  centsOff,
  midiToKoreanNotation,
} from './notes';

describe('notes', () => {
  it('A4 = 440Hz = MIDI 69', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(freqToMidi(440)).toBe(69);
  });

  it('C4 = 중앙 도 = MIDI 60 ≈ 261.63Hz', () => {
    expect(midiToFreq(60)).toBeCloseTo(261.626, 2);
    expect(midiToNoteName(60)).toBe('C4');
  });

  it('음이름 왕복 변환', () => {
    for (const name of ['C2', 'F#3', 'A#4', 'B5', 'G0']) {
      expect(midiToNoteName(noteNameToMidi(name))).toBe(name);
    }
  });

  it('잘못된 음이름은 예외', () => {
    expect(() => noteNameToMidi('H3')).toThrow();
    expect(() => noteNameToMidi('Cb')).toThrow();
  });

  it('centsOff: 정확한 반음이면 0, 1/4음 위면 약 +50', () => {
    expect(centsOff(440)).toBe(0);
    expect(Math.abs(centsOff(440 * Math.pow(2, 0.25 / 12)))).toBeGreaterThanOrEqual(25);
  });

  it('한국식 옥타브 표기: C4 = 2옥타브 도, A4 = 2옥타브 라', () => {
    expect(midiToKoreanNotation(60)).toBe('2옥타브 도');
    expect(midiToKoreanNotation(69)).toBe('2옥타브 라');
    expect(midiToKoreanNotation(72)).toBe('3옥타브 도');
  });
});
