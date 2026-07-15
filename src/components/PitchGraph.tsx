// 허밍업(HummingUp) 벤치마킹: 시간축으로 흐르는 피치 그래프 + 현재 음을 나타내는 노란 공.
// React 리렌더 없이 캔버스에 rAF로 직접 그린다. 샘플은 부모가 historyRef에 push한다.

import { useEffect, useRef } from 'react';
import { midiToNoteName } from '../audio/notes';

export interface PitchSample {
  /** performance.now() 기준 ms */
  time: number;
  /** 무성 구간이면 null */
  midi: number | null;
  matched?: boolean;
}

const WINDOW_MS = 8000; // 화면에 보이는 시간 폭
const NOW_RATIO = 0.72; // 현재 시점(공)의 가로 위치
const VIEW_SPAN = 16; // 세로로 보이는 반음 수
const BALL_COLOR = '#ffd24a';

interface Props {
  historyRef: React.MutableRefObject<PitchSample[]>;
  targetMidi?: number | null;
  recordedLow?: number | null;
  recordedHigh?: number | null;
  height?: number;
}

export function PitchGraph({
  historyRef,
  targetMidi = null,
  recordedLow = null,
  recordedHigh = null,
  height = 260,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const centerRef = useRef<number | null>(null);
  const propsRef = useRef({ targetMidi, recordedLow, recordedHigh });
  propsRef.current = { targetMidi, recordedLow, recordedHigh };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const draw = () => {
      rafId = requestAnimationFrame(draw);
      const { targetMidi, recordedLow, recordedHigh } = propsRef.current;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const now = performance.now();
      const history = historyRef.current;
      // 오래된 샘플 정리 (공유 링버퍼 유지)
      while (history.length > 0 && now - history[0].time > WINDOW_MS + 1000) history.shift();

      const last = history[history.length - 1];
      const current = last && last.midi !== null && now - last.time < 180 ? last : null;

      // 세로 뷰 중심을 부드럽게 추적 (가이드 모드는 목표음 중심)
      const lastVoiced = [...history].reverse().find((s) => s.midi !== null);
      const desired =
        targetMidi ?? lastVoiced?.midi ?? centerRef.current ?? 57; // 기본 A3 부근
      centerRef.current =
        centerRef.current === null ? desired : centerRef.current + (desired - centerRef.current) * 0.06;
      const center = centerRef.current;
      const top = center + VIEW_SPAN / 2;
      const yOf = (midi: number) => ((top - midi) / VIEW_SPAN) * h;
      const nowX = w * NOW_RATIO;
      const xOf = (t: number) => nowX * (1 - (now - t) / WINDOW_MS);

      // 반음 레인 + C음 라벨
      const loMidi = Math.floor(center - VIEW_SPAN / 2);
      const hiMidi = Math.ceil(center + VIEW_SPAN / 2);
      ctx.textBaseline = 'middle';
      ctx.font = '11px system-ui, sans-serif';
      for (let m = loMidi; m <= hiMidi; m++) {
        const y = yOf(m);
        const isC = ((m % 12) + 12) % 12 === 0;
        ctx.strokeStyle = isC ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        if (isC) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillText(midiToNoteName(m), 8, y - 7);
        }
      }

      // 목표음 밴드 (±50센트) — 공이 밴드 안이면 초록
      if (targetMidi !== null) {
        const inBand =
          current !== null && current.midi !== null && Math.abs(current.midi - targetMidi) <= 0.5;
        const yTop = yOf(targetMidi + 0.5);
        const yBot = yOf(targetMidi - 0.5);
        ctx.fillStyle = inBand ? 'rgba(94,234,212,0.22)' : 'rgba(139,92,246,0.18)';
        ctx.fillRect(0, yTop, w, yBot - yTop);
        ctx.strokeStyle = inBand ? 'rgba(94,234,212,0.7)' : 'rgba(139,92,246,0.55)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-2, yTop, w + 4, yBot - yTop);
        ctx.fillStyle = inBand ? 'rgba(94,234,212,0.95)' : 'rgba(200,180,255,0.9)';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText(`목표 ${midiToNoteName(targetMidi)}`, w - 74, yOf(targetMidi) - 14);
        ctx.font = '11px system-ui, sans-serif';
      }

      // 기록된 최저/최고 점선
      const dashLine = (midi: number, label: string) => {
        const y = yOf(midi);
        if (y < -10 || y > h + 10) return;
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255,210,74,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,210,74,0.9)';
        ctx.fillText(label, w - 74, y - 8);
      };
      if (recordedLow !== null) dashLine(recordedLow, `최저 ${midiToNoteName(recordedLow)}`);
      if (recordedHigh !== null && recordedHigh !== recordedLow)
        dashLine(recordedHigh, `최고 ${midiToNoteName(recordedHigh)}`);

      // 피치 궤적 (과거로 갈수록 페이드, 무성 구간 끊김)
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      let prev: PitchSample | null = null;
      for (const s of history) {
        if (s.midi === null) {
          prev = null;
          continue;
        }
        if (prev && prev.midi !== null && s.time - prev.time < 200) {
          const x1 = xOf(prev.time);
          const x2 = xOf(s.time);
          if (x2 > -5) {
            const alpha = Math.max(0.08, x2 / nowX);
            ctx.strokeStyle = s.matched
              ? `rgba(94,234,212,${alpha})`
              : `rgba(255,210,74,${alpha * 0.9})`;
            ctx.beginPath();
            ctx.moveTo(x1, yOf(prev.midi));
            ctx.lineTo(x2, yOf(s.midi));
            ctx.stroke();
          }
        }
        prev = s;
      }

      // 현재 음 = 노란 공 (허밍업 벤치마킹 포인트)
      if (current && current.midi !== null) {
        const y = yOf(current.midi);
        ctx.save();
        ctx.shadowColor = BALL_COLOR;
        ctx.shadowBlur = 18;
        ctx.fillStyle = BALL_COLOR;
        ctx.beginPath();
        ctx.arc(nowX, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(nowX - 2.5, y - 2.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // 무성: 현재 위치 안내선만
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nowX, 0);
        ctx.lineTo(nowX, h);
        ctx.stroke();
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [historyRef]);

  return <canvas ref={canvasRef} className="pitch-graph" style={{ height }} />;
}
