import { useEffect, useRef, useState } from 'react';
import { openMic, type MicSession } from '../audio/mic';
import { detectVoicedPitch } from '../audio/pitchDetector';
import { freqToMidiFloat, midiToFreq, midiToNoteName } from '../audio/notes';
import { PitchGraph, type PitchSample } from '../components/PitchGraph';

const FLOOR = 36; // C2
const CEIL = 84; // C6
const TONE_SEC = 1.2;
const LISTEN_MS = 2500;
const MAX_FAILS = 2; // 연속 실패 허용 횟수
// 통과에 필요한 매칭 프레임 수 (약 60fps 기준, 전체의 20%)
const NEEDED_FRAMES = Math.max(8, Math.round((LISTEN_MS / 16.7) * 0.2));

type Phase = 'select' | 'testing' | 'error';
type Direction = 'down' | 'up';

interface StepInfo {
  targetMidi: number;
  direction: Direction;
  stage: 'tone' | 'listen';
  liveNote: string | null;
  matched: boolean;
  /** 통과 기준 대비 진행률 0~1 (허밍업식 정확도 게이지) */
  accuracy: number;
  passedLow: number | null;
  passedHigh: number | null;
}

/** LISTEN_MS 동안 프레임을 수집해 목표음 통과 여부 판정 */
async function measureStep(
  mic: MicSession,
  targetMidi: number,
  historyRef: React.MutableRefObject<PitchSample[]>,
  onFrame: (liveNote: string | null, matched: boolean, accuracy: number) => void,
  isCancelled: () => boolean,
): Promise<boolean> {
  const start = performance.now();
  let matchedFrames = 0;
  let totalFrames = 0;

  return new Promise((resolve) => {
    const loop = () => {
      if (isCancelled()) return resolve(false);
      const now = performance.now();
      const r = detectVoicedPitch(mic.readFrame(), mic.sampleRate);
      let liveNote: string | null = null;
      let matched = false;
      if (r) {
        const midiFloat = freqToMidiFloat(r.freq);
        liveNote = midiToNoteName(Math.round(midiFloat));
        matched = Math.abs(midiFloat - targetMidi) <= 0.5;
        if (matched) matchedFrames++;
        historyRef.current.push({ time: now, midi: midiFloat, matched });
      } else {
        historyRef.current.push({ time: now, midi: null });
      }
      totalFrames++;
      onFrame(liveNote, matched, Math.min(1, matchedFrames / NEEDED_FRAMES));
      if (now - start < LISTEN_MS) {
        requestAnimationFrame(loop);
      } else {
        resolve(matchedFrames >= Math.max(8, totalFrames * 0.2));
      }
    };
    requestAnimationFrame(loop);
  });
}

export function GuidedTest({
  onDone,
  onCancel,
}: {
  onDone: (lowMidi: number, highMidi: number) => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('select');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<StepInfo | null>(null);
  const cancelledRef = useRef(false);
  const micRef = useRef<MicSession | null>(null);
  const historyRef = useRef<PitchSample[]>([]);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      micRef.current?.stop();
      micRef.current = null;
    };
  }, []);

  async function runTest(startMidi: number) {
    setPhase('testing');
    let mic: MicSession;
    try {
      mic = await openMic();
    } catch (e: unknown) {
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.'
          : e instanceof Error
            ? e.message
            : '마이크를 열 수 없습니다.',
      );
      setPhase('error');
      return;
    }
    micRef.current = mic;

    let passedLow: number | null = null;
    let passedHigh: number | null = null;

    // 한 방향으로 반음씩 진행하며 한계음을 찾는다
    const sweep = async (direction: Direction): Promise<number | null> => {
      let target = direction === 'down' ? startMidi : startMidi + 1;
      let lastPassed: number | null = null;
      let fails = 0;
      while (!cancelledRef.current && target >= FLOOR && target <= CEIL) {
        const base: StepInfo = {
          targetMidi: target,
          direction,
          stage: 'tone',
          liveNote: null,
          matched: false,
          accuracy: 0,
          passedLow,
          passedHigh,
        };
        setStep(base);
        await mic.playTone(midiToFreq(target), TONE_SEC);
        if (cancelledRef.current) return lastPassed;

        setStep({ ...base, stage: 'listen' });
        const passed = await measureStep(
          mic,
          target,
          historyRef,
          (liveNote, matched, accuracy) =>
            setStep({ ...base, stage: 'listen', liveNote, matched, accuracy }),
          () => cancelledRef.current,
        );
        if (cancelledRef.current) return lastPassed;

        if (passed) {
          lastPassed = target;
          fails = 0;
          if (direction === 'down') passedLow = target;
          else passedHigh = target;
          target += direction === 'down' ? -1 : 1;
        } else {
          fails++;
          if (fails >= MAX_FAILS) break;
          target += direction === 'down' ? -1 : 1; // 한 번 더 아래/위 시도
        }
      }
      return lastPassed;
    };

    const low = await sweep('down');
    if (cancelledRef.current) return;
    const high = await sweep('up');
    if (cancelledRef.current) return;

    mic.stop();
    micRef.current = null;

    const finalLow = low ?? startMidi;
    const finalHigh = high ?? startMidi;
    if (low === null && high === null) {
      setError('목소리를 인식하지 못했습니다. 조용한 곳에서 마이크에 가까이 대고 다시 시도해주세요.');
      setPhase('error');
      return;
    }
    onDone(Math.min(finalLow, finalHigh), Math.max(finalLow, finalHigh));
  }

  if (phase === 'select') {
    return (
      <div className="card">
        <h2>가이드 측정</h2>
        <p className="muted">
          기준음을 들려드리면 &ldquo;아~&rdquo; 하고 따라 불러주세요. 그래프의{' '}
          <strong>목표 밴드 안에 공을 넣으면</strong> 통과! 낮은 음부터 차례로 내려간 뒤, 다시
          높은 음으로 올라가며 한계를 찾습니다.
        </p>
        <div className="btn-row">
          <button className="primary" onClick={() => void runTest(48)}>
            낮은 목소리로 시작 (C3)
          </button>
          <button className="primary" onClick={() => void runTest(55)}>
            높은 목소리로 시작 (G3)
          </button>
        </div>
        <div className="btn-row">
          <button onClick={onCancel}>돌아가기</button>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="card">
        <p className="error">{error}</p>
        <button onClick={onCancel}>돌아가기</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{step?.direction === 'down' ? '최저음 찾는 중 ⬇️' : '최고음 찾는 중 ⬆️'}</h2>
      {step && (
        <>
          <div className="graph-panel">
            <PitchGraph historyRef={historyRef} targetMidi={step.targetMidi} />
            <div className="graph-overlay">
              <span className={`overlay-note ${step.liveNote ? '' : 'idle'}`}>
                {step.liveNote ?? '—'}
              </span>
            </div>
            <div className={`stage-label graph-status ${step.stage === 'listen' ? 'listen' : ''}`}>
              {step.stage === 'listen' && <span className="rec-dot" />}
              {step.stage === 'tone'
                ? `🔊 ${midiToNoteName(step.targetMidi)} 기준음을 들어보세요`
                : '🎤 따라 불러보세요!'}
            </div>
          </div>

          <div className="accuracy-gauge" aria-label="정확도 게이지">
            <div
              className={`accuracy-fill ${step.accuracy >= 1 ? 'full' : ''}`}
              style={{ width: `${Math.round(step.accuracy * 100)}%` }}
            />
          </div>

          <div className="range-live">
            <div>
              <span className="muted small">확정 최저음</span>
              <strong>{step.passedLow !== null ? midiToNoteName(step.passedLow) : '—'}</strong>
            </div>
            <div>
              <span className="muted small">확정 최고음</span>
              <strong>{step.passedHigh !== null ? midiToNoteName(step.passedHigh) : '—'}</strong>
            </div>
          </div>
        </>
      )}
      <div className="btn-row">
        <button onClick={onCancel}>중단</button>
      </div>
    </div>
  );
}
