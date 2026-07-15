import { useState } from 'react';
import { GuidedTest } from './test-modes/GuidedTest';
import { FreeTest } from './test-modes/FreeTest';
import { RangeResult } from './result/RangeResult';
import { loadHistory } from './storage';
import { midiToNoteName } from './audio/notes';

type Screen =
  | { name: 'home' }
  | { name: 'guided' }
  | { name: 'free' }
  | { name: 'result'; lowMidi: number; highMidi: number; mode: 'guided' | 'free' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const goHome = () => setScreen({ name: 'home' });

  return (
    <div className="app">
      <header>
        <h1 onClick={goHome}>🎤 내 음역대 찾기</h1>
      </header>
      <main>
        {screen.name === 'home' && (
          <Home
            onSelect={(mode) =>
              setScreen(mode === 'guided' ? { name: 'guided' } : { name: 'free' })
            }
          />
        )}
        {screen.name === 'guided' && (
          <GuidedTest
            onDone={(lowMidi, highMidi) =>
              setScreen({ name: 'result', lowMidi, highMidi, mode: 'guided' })
            }
            onCancel={goHome}
          />
        )}
        {screen.name === 'free' && (
          <FreeTest
            onDone={(lowMidi, highMidi) =>
              setScreen({ name: 'result', lowMidi, highMidi, mode: 'free' })
            }
            onCancel={goHome}
          />
        )}
        {screen.name === 'result' && (
          <RangeResult
            lowMidi={screen.lowMidi}
            highMidi={screen.highMidi}
            mode={screen.mode}
            onRestart={goHome}
          />
        )}
      </main>
      <footer className="muted small">
        곡별 음역대는 근사치입니다 · 마이크 데이터는 브라우저 밖으로 전송되지 않습니다
      </footer>
    </div>
  );
}

function Home({ onSelect }: { onSelect: (mode: 'guided' | 'free') => void }) {
  const last = loadHistory().at(-1);
  return (
    <div className="card">
      <p>
        마이크로 <strong>음역대(최저음~최고음)</strong>를 측정하고, 내 목소리에 맞는 노래를
        추천받아 보세요.
      </p>
      {last && (
        <p className="muted small">
          지난 측정: {midiToNoteName(last.lowMidi)} ~ {midiToNoteName(last.highMidi)} (
          {new Date(last.date).toLocaleDateString('ko-KR')})
        </p>
      )}
      <div className="mode-cards">
        <button className="mode-card" onClick={() => onSelect('guided')}>
          <span className="mode-emoji">🎹</span>
          <span className="mode-title">가이드 측정 (정밀)</span>
          <span className="muted small">
            기준음을 듣고 따라 부르며 반음씩 한계음을 찾습니다. 약 2~3분.
          </span>
        </button>
        <button className="mode-card" onClick={() => onSelect('free')}>
          <span className="mode-emoji">⚡</span>
          <span className="mode-title">자유 발성 (빠름)</span>
          <span className="muted small">
            자유롭게 최저음과 최고음을 내면 실시간으로 기록합니다. 약 30초.
          </span>
        </button>
      </div>
      <p className="muted small">🎧 이어폰을 끼면 기준음이 마이크에 섞이지 않아 더 정확합니다.</p>
    </div>
  );
}
