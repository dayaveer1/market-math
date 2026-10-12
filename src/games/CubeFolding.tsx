'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import { FACE_AXES, generateCubeQuestion, type CubeQuestion, type CubeView } from '@/lib/engines/cube';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, TimeBar } from '@/components/ui';

const CELL = 44;
function Net({ q }: { q: CubeQuestion }) {
  const rows = Math.max(...q.net.map(([r]) => r)) + 1, cols = Math.max(...q.net.map(([, c]) => c)) + 1;
  return (
    <svg width={cols * CELL + 2} height={rows * CELL + 2} role="img" aria-label="Cube net">
      {q.net.map(([r, c], k) => (
        <g key={k} transform={`translate(${c * CELL + 1},${r * CELL + 1})`}>
          <rect width={CELL} height={CELL} className="fill-surface stroke-ink" strokeWidth={1.5} />
          <text x={CELL / 2} y={CELL / 2 + 8} textAnchor="middle" className="fill-ink" fontSize={22} fontWeight={600}>{q.symbols[k]}</text>
        </g>
      ))}
    </svg>
  );
}

/** Isometric projection for a viewer at (+x, −y, +z): visible faces are top (+z), front (−y, drawn left) and right (+x). */
const S = 22;
const proj = (v: readonly number[]) => [(v[0] + v[1]) * 0.866 * S, ((v[0] - v[1]) * 0.5 - v[2]) * S];
const FACE_CENTER = { top: [0, 0, 1], front: [0, -1, 0], right: [1, 0, 0] } as const;
const SHADE = { top: 'fill-surface', front: 'fill-paper', right: 'fill-line' } as const;

function CubeFace({ face, f }: { face: keyof typeof FACE_AXES; f: CubeView['top'] }) {
  const { u, v } = FACE_AXES[face];
  const c = FACE_CENTER[face];
  const corner = (a: number, b: number) => proj([c[0] + a * u[0] + b * v[0], c[1] + a * u[1] + b * v[1], c[2] + a * u[2] + b * v[2]]);
  const pts = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)].map((p) => p.join(',')).join(' ');
  const U = proj(u), V = proj(v), C = proj(c);
  // Local text coordinates: x along u, y along −v (text "up" = +v), so glyphs are never mirrored.
  const m = `matrix(${U[0] / S},${U[1] / S},${-V[0] / S},${-V[1] / S},${C[0]},${C[1]})`;
  return (
    <g>
      <polygon points={pts} className={`${SHADE[face]} stroke-ink`} strokeWidth={1.2} strokeLinejoin="round" />
      <g transform={m}><g transform={`rotate(${f.turns * 90})`}><text textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={600} className="fill-ink">{f.symbol}</text></g></g>
    </g>
  );
}
function CubeDrawing({ v }: { v: CubeView }) {
  return (
    <svg viewBox="-44 -46 88 92" width={104} height={108} role="img" aria-label={`top ${v.top.symbol}, front ${v.front.symbol}, right ${v.right.symbol}`}>
      <CubeFace face="top" f={v.top} /><CubeFace face="front" f={v.front} /><CubeFace face="right" f={v.right} />
    </svg>
  );
}
const describe = (v: CubeView) => (['top', 'front', 'right'] as const).map((k) => `${k} ${v[k].symbol}${v[k].turns ? ` (${v[k].turns * 90}°)` : ''}`).join(', ');

export default function CubeFolding({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const nQ = Number(settings.questions), perQ = Number(settings.perQuestion), orientation = settings.orientation !== false;
  const nOpt = Number(settings.options ?? 4);
  const [i, setI] = useState(0);
  const [q, setQ] = useState(() => generateCubeQuestion(rng, nOpt, orientation));
  const [picked, setPicked] = useState<number | null>(null);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ correct: 0, ms: [] as number[] });
  const t0 = useRef(performance.now());

  const choose = (k: number | null) => {
    if (picked !== null) return;
    s.current.ms.push(performance.now() - t0.current);
    const ok = k === q.correct;
    if (ok) s.current.correct++;
    else onMistake({ prompt: `Net ${q.symbols.join(' ')}`, given: k === null ? '(time)' : `option ${k + 1}: ${describe(q.views[k])}`, expected: `option ${q.correct + 1}: ${describe(q.views[q.correct])}`, explanation: 'Wrong views show two opposite faces together, are mirror images, or have a glyph turned the wrong way.' });
    setPicked(k ?? -1);
    setFb({ ok, text: ok ? 'Correct' : `Option ${q.correct + 1} was the foldable cube` });
  };
  const next = () => {
    if (i + 1 >= nQ) { onFinish({ score: s.current.correct, correct: s.current.correct, total: nQ, avgMs: s.current.ms.reduce((a, b) => a + b, 0) / s.current.ms.length }); return; }
    setI(i + 1); setQ(generateCubeQuestion(rng, nOpt, orientation)); setPicked(null); setFb({ ok: null, text: '' }); t0.current = performance.now();
  };
  const left = useCountdown(perQ, picked === null, () => choose(null), i);
  useKeys({ ...Object.fromEntries(q.views.map((_, k) => [String(k + 1), () => choose(k)])), enter: () => picked !== null && next() });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="num text-sm text-muted">Question {i + 1} / {nQ}</div>
      <TimeBar leftMs={left} totalMs={perQ * 1000} />
      <div className="flex justify-center"><Net q={q} /></div>
      <p className="text-center text-sm text-muted">Which cube can be folded from this net{q.orientation ? ', including which way each letter faces' : ''}?</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {q.views.map((v, k) => (
          <button key={k} onClick={() => choose(k)} className={`flex flex-col items-center rounded-lg border-2 p-2 ${picked === null ? 'border-line hover:border-accent' : k === q.correct ? 'border-bid' : k === picked ? 'border-ask' : 'border-line opacity-60'}`}>
            <CubeDrawing v={v} /><Kbd>{k + 1}</Kbd>
          </button>
        ))}
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
      {picked !== null && <Button onClick={next}>{i + 1 >= nQ ? 'See results' : 'Next'} <Kbd>Enter</Kbd></Button>}
    </div>
  );
}
