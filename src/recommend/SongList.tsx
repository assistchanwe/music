import { useMemo, useState } from 'react';
import { recommendSongs, type MatchCategory, type Recommendation } from './recommend';
import { SONGS } from './songDb';
import { midiToNoteName } from '../audio/notes';

const CATEGORY_LABELS: Record<MatchCategory, string> = {
  comfortable: '🎯 편하게 부를 수 있는 곡',
  challenge: '🔥 원키로 도전해볼 곡 (1~2반음 아슬아슬)',
  transpose: '🎚️ 키를 조절하면 부를 수 있는 곡',
};

const PREVIEW_COUNT = 10;

function keyShiftLabel(shift: number): string {
  if (shift === 0) return '원키';
  return shift > 0 ? `+${shift}키` : `${shift}키`;
}

export function SongList({ userLow, userHigh }: { userLow: number; userHigh: number }) {
  const [genre, setGenre] = useState<string>('전체');
  const [expanded, setExpanded] = useState<Set<MatchCategory>>(new Set());

  const all = useMemo(() => recommendSongs(userLow, userHigh, SONGS), [userLow, userHigh]);
  const genres = useMemo(() => ['전체', ...new Set(SONGS.map((s) => s.genre))], []);
  const filtered = genre === '전체' ? all : all.filter((r) => r.song.genre === genre);

  const grouped = new Map<MatchCategory, Recommendation[]>();
  for (const r of filtered) {
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }

  const toggleExpand = (cat: MatchCategory) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  return (
    <div className="song-list">
      <div className="genre-chips">
        {genres.map((g) => (
          <button
            key={g}
            className={`chip ${g === genre ? 'chip-active' : ''}`}
            onClick={() => setGenre(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="muted">이 장르에서는 맞는 곡을 찾지 못했어요. 다른 장르를 선택해보세요.</p>
      )}

      {(['comfortable', 'challenge', 'transpose'] as MatchCategory[]).map((cat) => {
        const items = grouped.get(cat);
        if (!items?.length) return null;
        const isExpanded = expanded.has(cat);
        const visible = isExpanded ? items : items.slice(0, PREVIEW_COUNT);
        const hiddenCount = items.length - visible.length;
        return (
          <section key={cat}>
            <h3>
              {CATEGORY_LABELS[cat]} <span className="count-badge">{items.length}곡</span>
            </h3>
            <ul>
              {visible.map((r) => (
                <li key={`${r.song.artist}-${r.song.title}`} className="song-item">
                  <div className="song-main">
                    <span className="song-title">{r.song.title}</span>
                    <span className="song-sub">
                      <span className="song-artist">{r.song.artist}</span>
                      <span className="song-genre">{r.song.genre}</span>
                    </span>
                  </div>
                  <div className="song-meta">
                    <span className="song-range">
                      {midiToNoteName(r.song.lowNote)}~{midiToNoteName(r.song.highNote)}
                    </span>
                    <span className={`song-key ${r.keyShift !== 0 ? 'song-key-shift' : ''}`}>
                      {keyShiftLabel(r.keyShift)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {(hiddenCount > 0 || isExpanded) && (
              <button className="show-more" onClick={() => toggleExpand(cat)}>
                {isExpanded ? '접기 ▲' : `${hiddenCount}곡 더 보기 ▼`}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
