// McLeod Pitch Method(NSDF) 기반 기본 주파수(f0) 추출.
// 입력은 시간 영역 샘플 버퍼(Float32Array), 출력은 주파수(Hz)와 명료도(0~1).

export interface PitchResult {
  freq: number;
  /** 0~1. 낮으면 잡음/무성음이므로 무시해야 함 */
  clarity: number;
}

const RMS_GATE = 0.008; // 이보다 조용하면 침묵으로 간주
const CLARITY_THRESHOLD = 0.85;

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  minFreq = 60,
  maxFreq = 1200,
): PitchResult | null {
  const n = buffer.length;

  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += buffer[i] * buffer[i];
  if (Math.sqrt(sumSq / n) < RMS_GATE) return null;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(n - 2, Math.ceil(sampleRate / minFreq));
  if (tauMin >= tauMax) return null;

  // NSDF: nsdf[tau] = 2 * Σ x[i]x[i+tau] / Σ (x[i]² + x[i+tau]²)
  // 래그 0 부근의 초기 양수 구간을 정확히 지나가기 위해 tau=2부터 계산한다.
  const nsdf = new Float32Array(tauMax + 1);
  for (let tau = 2; tau <= tauMax; tau++) {
    let acf = 0;
    let norm = 0;
    for (let i = 0; i < n - tau; i++) {
      acf += buffer[i] * buffer[i + tau];
      norm += buffer[i] * buffer[i] + buffer[i + tau] * buffer[i + tau];
    }
    nsdf[tau] = norm > 0 ? (2 * acf) / norm : 0;
  }

  // 첫 음의 골짜기(첫 하강 제로 크로싱) 이후의 양의 피크들을 수집
  const peaks: number[] = [];
  let tau = 2;
  while (tau <= tauMax && nsdf[tau] > 0) tau++; // 초기 양수 구간(래그 0 부근) 건너뜀
  while (tau < tauMax) {
    if (
      tau >= tauMin &&
      nsdf[tau] > 0 &&
      nsdf[tau] >= nsdf[tau - 1] &&
      nsdf[tau] >= nsdf[tau + 1]
    ) {
      peaks.push(tau);
    }
    tau++;
  }
  if (peaks.length === 0) return null;

  // 최대 피크의 90% 이상인 것 중 가장 이른(주파수 높은) 피크 선택 — 옥타브 오류 억제
  let maxPeak = 0;
  for (const p of peaks) maxPeak = Math.max(maxPeak, nsdf[p]);
  const threshold = maxPeak * 0.9;
  let bestTau = peaks[0];
  for (const p of peaks) {
    if (nsdf[p] >= threshold) {
      bestTau = p;
      break;
    }
  }

  // 포물선 보간으로 서브샘플 정밀도 확보
  const y1 = nsdf[bestTau - 1];
  const y2 = nsdf[bestTau];
  const y3 = nsdf[bestTau + 1];
  const denom = y1 - 2 * y2 + y3;
  const shift = denom !== 0 ? (0.5 * (y1 - y3)) / denom : 0;
  const refinedTau = bestTau + Math.max(-0.5, Math.min(0.5, shift));

  const freq = sampleRate / refinedTau;
  if (freq < minFreq || freq > maxFreq) return null;

  return { freq, clarity: y2 };
}

/** 명료도가 충분한 결과만 돌려주는 편의 함수 */
export function detectVoicedPitch(
  buffer: Float32Array,
  sampleRate: number,
): PitchResult | null {
  const r = detectPitch(buffer, sampleRate);
  return r && r.clarity >= CLARITY_THRESHOLD ? r : null;
}
