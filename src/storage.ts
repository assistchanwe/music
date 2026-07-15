// 측정 이력 localStorage 저장

export interface MeasureRecord {
  lowMidi: number;
  highMidi: number;
  mode: 'guided' | 'free';
  date: string; // ISO
}

const KEY = 'vocal-range-history';

export function saveRecord(record: MeasureRecord): void {
  const history = loadHistory();
  history.push(record);
  try {
    localStorage.setItem(KEY, JSON.stringify(history.slice(-50)));
  } catch {
    // 저장 실패(프라이빗 모드 등)는 무시 — 앱 동작에는 지장 없음
  }
}

export function loadHistory(): MeasureRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
