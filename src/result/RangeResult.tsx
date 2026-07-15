import { useEffect } from 'react';
import { midiToKoreanNotation, midiToNoteName } from '../audio/notes';
import { classifyVoice, rangeWidthLabel } from './voiceType';
import { Piano } from '../components/Piano';
import { SongList } from '../recommend/SongList';
import { saveRecord } from '../storage';

export function RangeResult({
  lowMidi,
  highMidi,
  mode,
  onRestart,
}: {
  lowMidi: number;
  highMidi: number;
  mode: 'guided' | 'free';
  onRestart: () => void;
}) {
  useEffect(() => {
    saveRecord({ lowMidi, highMidi, mode, date: new Date().toISOString() });
  }, [lowMidi, highMidi, mode]);

  const voice = classifyVoice(lowMidi, highMidi);

  return (
    <div className="card wide">
      <div className="result-summary">
        <span className="result-kicker">측정 결과</span>
        <div className="result-range">
          {midiToNoteName(lowMidi)}
          <span className="range-arrow">~</span>
          {midiToNoteName(highMidi)}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat-label">한국식 표기</span>
          <span className="stat-value">
            {midiToKoreanNotation(lowMidi)} ~ {midiToKoreanNotation(highMidi)}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">음역 폭</span>
          <span className="stat-value">{rangeWidthLabel(lowMidi, highMidi)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">예상 성종</span>
          <span className="stat-value">{voice.name}</span>
        </div>
      </div>

      <div className="piano-wrap">
        <Piano lowMidi={lowMidi} highMidi={highMidi} />
      </div>

      <h2 className="rec-heading">🎵 이 음역대에 맞는 노래</h2>
      <SongList userLow={lowMidi} userHigh={highMidi} />

      <div className="btn-row">
        <button className="primary" onClick={onRestart}>
          다시 측정하기
        </button>
      </div>
    </div>
  );
}
