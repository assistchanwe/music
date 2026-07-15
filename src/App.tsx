import { useState } from 'react';
import { GuidedTest } from './test-modes/GuidedTest';
import { FreeTest } from './test-modes/FreeTest';
import { RangeResult } from './result/RangeResult';
import { loadHistory } from './storage';
import { midiToNoteName } from './audio/notes';
import { SONGS } from './recommend/songDb';

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
        <button className="logo" onClick={goHome} aria-label="홈으로">
          <span className="logo-mark">🎤</span>
          <span className="logo-text">내 음역대 찾기</span>
        </button>
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
    <>
      <section className="hero">
        <h1>
          내 목소리에 딱 맞는 노래,
          <br />
          <span className="grad-text">30초</span>면 찾을 수 있어요
        </h1>
        <p>
          마이크로 음역대(최저음~최고음)를 측정하면 {SONGS.length}곡 중에서 편하게 부를 수
          있는 노래를 골라드립니다.
        </p>
        {last && (
          <div className="last-record">
            📈 지난 측정 {midiToNoteName(last.lowMidi)} ~ {midiToNoteName(last.highMidi)} ·{' '}
            {new Date(last.date).toLocaleDateString('ko-KR')}
          </div>
        )}
      </section>

      <div className="mode-cards">
        <button className="mode-card" onClick={() => onSelect('free')}>
          <span className="mode-emoji">⚡</span>
          <span className="mode-title">자유 발성 측정</span>
          <span className="muted small">
            자유롭게 낮은 음과 높은 음을 내면 실시간으로 기록해요.
          </span>
          <span className="mode-time">약 30초 · 간편</span>
        </button>
        <button className="mode-card" onClick={() => onSelect('guided')}>
          <span className="mode-emoji">🎹</span>
          <span className="mode-title">가이드 측정</span>
          <span className="muted small">
            기준음을 듣고 따라 부르며 반음씩 한계음을 찾아요.
          </span>
          <span className="mode-time">약 2~3분 · 정밀</span>
        </button>
      </div>

      <div className="tip">
        <span>🎧</span>
        <span>
          이어폰을 끼면 기준음이 마이크에 섞이지 않아 더 정확해요. 조용한 곳에서
          측정하는 것을 추천합니다.
        </span>
      </div>
    </>
  );
}
