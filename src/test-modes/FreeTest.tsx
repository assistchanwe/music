import { useEffect, useRef, useState } from 'react';
import { openMic, type MicSession } from '../audio/mic';
import { detectVoicedPitch } from '../audio/pitchDetector';
import { centsOff, freqToMidiFloat, midiToNoteName } from '../audio/notes';
import { PitchGraph, type PitchSample } from '../components/PitchGraph';

const HOLD_MS = 300; // 이만큼 유지된 음만 기록

interface LiveState {
  note: string | null;
  cents: number;
  lowMidi: number | null;
  highMidi: number | null;
}

export function FreeTest({
  onDone,
  onCancel,
}: {
  onDone: (lowMidi: number, highMidi: number) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveState>({
    note: null,
    cents: 0,
    lowMidi: null,
    highMidi: null,
  });
  const micRef = useRef<MicSession | null>(null);
  const rangeRef = useRef<{ low: number | null; high: number | null }>({ low: null, high: null });
  const historyRef = useRef<PitchSample[]>([]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let candidate: { midi: number; since: number } | null = null;

    openMic()
      .then((mic) => {
        if (cancelled) {
          mic.stop();
          return;
        }
        micRef.current = mic;

        const loop = () => {
          const now = performance.now();
          const r = detectVoicedPitch(mic.readFrame(), mic.sampleRate);
          let note: string | null = null;
          let cents = 0;
          if (r) {
            const midiFloat = freqToMidiFloat(r.freq);
            const midi = Math.round(midiFloat);
            note = midiToNoteName(midi);
            cents = centsOff(r.freq);
            historyRef.current.push({ time: now, midi: midiFloat });

            if (candidate && candidate.midi === midi) {
              if (now - candidate.since >= HOLD_MS) {
                const range = rangeRef.current;
                range.low = range.low === null ? midi : Math.min(range.low, midi);
                range.high = range.high === null ? midi : Math.max(range.high, midi);
              }
            } else {
              candidate = { midi, since: now };
            }
          } else {
            historyRef.current.push({ time: now, midi: null });
            candidate = null;
          }
          setLive({ note, cents, lowMidi: rangeRef.current.low, highMidi: rangeRef.current.high });
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof DOMException && e.name === 'NotAllowedError'
              ? '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.'
              : e instanceof Error
                ? e.message
                : '마이크를 열 수 없습니다.',
          );
        }
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      micRef.current?.stop();
      micRef.current = null;
    };
  }, []);

  if (error) {
    return (
      <div className="card">
        <p className="error">{error}</p>
        <button onClick={onCancel}>돌아가기</button>
      </div>
    );
  }

  const hasRange = live.lowMidi !== null && live.highMidi !== null;

  return (
    <div className="card">
      <h2>자유 발성 측정</h2>
      <p className="muted">
        편한 음부터 시작해 점점 <strong>낮은 음</strong>과 <strong>높은 음</strong>을 내보세요.
        &ldquo;아~&rdquo; 하고 잠시(0.3초 이상) 유지한 음만 기록됩니다.
      </p>

      <div className="graph-panel">
        <PitchGraph
          historyRef={historyRef}
          recordedLow={live.lowMidi}
          recordedHigh={live.highMidi}
        />
        <div className="graph-overlay">
          <span className={`overlay-note ${live.note ? '' : 'idle'}`}>{live.note ?? '—'}</span>
          {live.note && (
            <span className="overlay-cents">
              {live.cents > 0 ? '+' : ''}
              {live.cents}¢
            </span>
          )}
        </div>
        <div className={`stage-label graph-status ${live.note ? 'listen' : ''}`}>
          <span className="rec-dot" />
          {live.note ? '측정 중' : '소리를 내보세요'}
        </div>
      </div>

      <div className="range-live">
        <div>
          <span className="muted small">최저음</span>
          <strong>{live.lowMidi !== null ? midiToNoteName(live.lowMidi) : '—'}</strong>
        </div>
        <div>
          <span className="muted small">최고음</span>
          <strong>{live.highMidi !== null ? midiToNoteName(live.highMidi) : '—'}</strong>
        </div>
      </div>

      <div className="btn-row">
        <button
          className="primary"
          disabled={!hasRange || live.lowMidi === live.highMidi}
          onClick={() => onDone(live.lowMidi!, live.highMidi!)}
        >
          측정 완료
        </button>
        <button onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}
