// C2~C6 피아노 건반에 사용자 음역을 하이라이트하는 SVG

const START = 36; // C2
const END = 84; // C6
const WHITE_W = 18;
const WHITE_H = 72;
const BLACK_W = 11;
const BLACK_H = 44;

const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

export function Piano({ lowMidi, highMidi }: { lowMidi: number; highMidi: number }) {
  const whites: { midi: number; x: number }[] = [];
  const blacks: { midi: number; x: number }[] = [];
  let x = 0;
  for (let midi = START; midi <= END; midi++) {
    if (isBlack(midi)) {
      blacks.push({ midi, x: x - BLACK_W / 2 });
    } else {
      whites.push({ midi, x });
      x += WHITE_W;
    }
  }
  const width = x;
  const inRange = (midi: number) => midi >= lowMidi && midi <= highMidi;

  return (
    <svg
      viewBox={`0 0 ${width} ${WHITE_H + 16}`}
      className="piano"
      role="img"
      aria-label="음역대 시각화 피아노 건반"
    >
      {whites.map((k) => (
        <rect
          key={k.midi}
          x={k.x}
          y={0}
          width={WHITE_W - 1}
          height={WHITE_H}
          rx={2}
          fill={inRange(k.midi) ? 'var(--accent)' : '#f5f2ea'}
          stroke="#3a3630"
        />
      ))}
      {blacks.map((k) => (
        <rect
          key={k.midi}
          x={k.x}
          y={0}
          width={BLACK_W}
          height={BLACK_H}
          rx={2}
          fill={inRange(k.midi) ? 'var(--accent-dark)' : '#23211d'}
          stroke="#3a3630"
        />
      ))}
      {whites
        .filter((k) => k.midi % 12 === 0)
        .map((k) => (
          <text key={k.midi} x={k.x + WHITE_W / 2 - 1} y={WHITE_H + 12} className="piano-label">
            C{k.midi / 12 - 1}
          </text>
        ))}
    </svg>
  );
}
