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
      <h2>측정 결과</h2>

      <div className="result-summary">
        <div className="result-range">
          <strong>{midiToNoteName(lowMidi)}</strong>
          <span className="range-arrow">~</span>
          <strong>{midiToNoteName(highMidi)}</strong>
        </div>
        <div className="muted">
          {midiToKoreanNotation(lowMidi)} ~ {midiToKoreanNotation(highMidi)} ·{' '}
          {rangeWidthLabel(lowMidi, highMidi)}
        </div>
        <div className="voice-type">
          예상 성종: <strong>{voice.name}</strong>
        </div>
      </div>

      <Piano lowMidi={lowMidi} highMidi={highMidi} />

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
