import { describe, it, expect } from 'vitest';
import { detectPitch, detectVoicedPitch } from './pitchDetector';

const SAMPLE_RATE = 48000;

function sine(freq: number, length = 4096, amp = 0.5): Float32Array {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = amp * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return buf;
}

/** 배음이 섞인 사람 목소리 비슷한 파형 */
function voiceLike(freq: number, length = 4096): Float32Array {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = (2 * Math.PI * freq * i) / SAMPLE_RATE;
    buf[i] = 0.5 * Math.sin(t) + 0.3 * Math.sin(2 * t) + 0.15 * Math.sin(3 * t);
  }
  return buf;
}

function centsError(detected: number, expected: number): number {
  return Math.abs(1200 * Math.log2(detected / expected));
}

describe('detectPitch', () => {
  it('순수 사인파를 ±5센트 이내로 감지 (음역 전체)', () => {
    // C2(65.4Hz) ~ C6(1046.5Hz)
    for (const freq of [65.4, 98, 146.8, 220, 329.6, 440, 659.3, 1046.5]) {
      const r = detectPitch(sine(freq), SAMPLE_RATE);
      expect(r, `${freq}Hz에서 감지 실패`).not.toBeNull();
      expect(centsError(r!.freq, freq), `${freq}Hz 오차`).toBeLessThan(5);
    }
  });

  it('배음이 섞여도 기본 주파수를 감지 (옥타브 오류 없음)', () => {
    for (const freq of [110, 165, 261.6, 392]) {
      const r = detectPitch(voiceLike(freq), SAMPLE_RATE);
      expect(r).not.toBeNull();
      expect(centsError(r!.freq, freq)).toBeLessThan(10);
    }
  });

  it('침묵은 null', () => {
    expect(detectPitch(new Float32Array(4096), SAMPLE_RATE)).toBeNull();
  });

  it('백색소음은 무성으로 판정 (detectVoicedPitch가 null)', () => {
    const buf = new Float32Array(4096);
    let seed = 42;
    for (let i = 0; i < buf.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      buf[i] = (seed / 0x7fffffff - 0.5) * 0.6;
    }
    expect(detectVoicedPitch(buf, SAMPLE_RATE)).toBeNull();
  });

  it('사인파의 명료도는 높음', () => {
    const r = detectPitch(sine(220), SAMPLE_RATE);
    expect(r!.clarity).toBeGreaterThan(0.95);
  });
});
