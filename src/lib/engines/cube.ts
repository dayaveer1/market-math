/**
 * Cube Folding. ORIGINAL implementation: the 11 hexomino cube nets, folding by rolling, and corner-view validity.
 * Net symbols are printed on the outside and the net is viewed from outside. A corner view shows top, front, right.
 * A view is foldable iff its three faces are pairwise adjacent and their orientation (handedness) matches the cube.
 * Glyph rotation is NOT modelled (symbols are rotation-invariant), which keeps every question unambiguous.
 */
import { type Rng, pick, shuffle, randInt } from '../rng';

/** Each net is a list of [row, col] cells. */
export const NETS: [number, number][][] = [
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 3]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3], [2, 3]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [2, 3]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 3]],
  [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3], [1, 4]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [2, 2], [2, 3]],
];

export type Dir = 'U' | 'D' | 'N' | 'S' | 'E' | 'W';
export const NORMAL: Record<Dir, [number, number, number]> = { U: [0, 0, 1], D: [0, 0, -1], N: [0, 1, 0], S: [0, -1, 0], E: [1, 0, 0], W: [-1, 0, 0] };
type Orient = Record<Dir, Dir>; // world direction → cube-frame face

function roll(o: Orient, dir: 'E' | 'W' | 'N' | 'S'): Orient {
  // Cube sits UNDER the net (net symbols face outward, viewer above). Rolling toward `dir` brings that side to the top.
  const opp: Record<string, Dir> = { E: 'W', W: 'E', N: 'S', S: 'N' };
  const d = dir as Dir, b = opp[dir];
  const n: Orient = { ...o };
  n.U = o[d]; n[b] = o.U; n.D = o[b]; n[d] = o.D;
  return n;
}

/** Fold a net: returns the cube-frame face for each net cell index. */
export function foldNet(cells: [number, number][]): Dir[] {
  return foldNetWithUp(cells).faces;
}
/**
 * Fold and also track glyph orientation: `up[i]` is the cube-frame direction that the "up" of the glyph printed
 * on net cell i points to once folded (the glyph is printed upright on the net, i.e. pointing north).
 */
export function foldNetWithUp(cells: [number, number][]): { faces: Dir[]; up: Dir[] } {
  const up: (Dir | null)[] = cells.map(() => null);
  const faces: (Dir | null)[] = cells.map(() => null);
  const idx = new Map(cells.map(([r, c], i) => [`${r},${c}`, i]));
  const start: Orient = { U: 'U', D: 'D', N: 'N', S: 'S', E: 'E', W: 'W' };
  const stack: [number, Orient][] = [[0, start]];
  faces[0] = 'U';
  up[0] = start.N;
  while (stack.length) {
    const [i, o] = stack.pop()!;
    const [r, c] = cells[i];
    const steps: [number, number, 'E' | 'W' | 'N' | 'S'][] = [[r, c + 1, 'E'], [r, c - 1, 'W'], [r - 1, c, 'N'], [r + 1, c, 'S']];
    for (const [rr, cc, d] of steps) {
      const j = idx.get(`${rr},${cc}`);
      if (j === undefined || faces[j] !== null) continue;
      const no = roll(o, d);
      faces[j] = no.U;
      up[j] = no.N;
      stack.push([j, no]);
    }
  }
  return { faces: faces as Dir[], up: up as Dir[] };
}

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const det = (a: number[], b: number[], c: number[]) =>
  a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);

/** Validity of a (top, front, right) view expressed as cube-frame faces. Reference view: top=U(+z), front=S(−y), right=E(+x) has det +1. */
export function viewValid(top: Dir, front: Dir, right: Dir): boolean {
  const a = NORMAL[top], b = NORMAL[front], c = NORMAL[right];
  if (dot(a, b) !== 0 || dot(a, c) !== 0 || dot(b, c) !== 0) return false;
  return det(a, b, c) === 1;
}

/* ---------- views with orientation ---------- */
type V3 = [number, number, number];
const sub = (a: number[]) => a.map((x) => -x) as V3;
const eq = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
/** Rotation (as a function) taking cube-frame normals of (top, front, right) to view axes (+z, −y, +x). */
function viewRotation(top: Dir, front: Dir, right: Dir): (v: V3) => V3 {
  const nT = NORMAL[top], nF = NORMAL[front], nR = NORMAL[right];
  // view = (v·nR) x̂ + (−v·nF) ŷ + (v·nT) ẑ   (rows are the source normals mapped to target axes)
  return (v) => [dot(v, nR), -dot(v, nF), dot(v, nT)];
}
/** Face-local axes (u, v) in view space for the three visible faces; u × v = outward normal (glyphs not mirrored). */
export const FACE_AXES: Record<'top' | 'front' | 'right', { u: V3; v: V3; n: V3 }> = {
  top: { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  front: { u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] },
  right: { u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] },
};
/** Glyph rotation in quarter turns clockwise (0..3) for a glyph whose up vector is `upView` on a face with local axes. */
export function quarterTurns(upView: V3, face: keyof typeof FACE_AXES): number {
  const { u, v } = FACE_AXES[face];
  if (eq(upView, v)) return 0;
  if (eq(upView, u)) return 1;
  if (eq(upView, sub(v))) return 2;
  if (eq(upView, sub(u))) return 3;
  throw new Error('glyph up not in face plane');
}
export interface FaceView { symbol: string; turns: number }
export interface CubeView { top: FaceView; front: FaceView; right: FaceView }
/** The true appearance of the corner where the given cube faces are top/front/right (must be a valid corner). */
export function trueView(net: [number, number][], symbols: string[], top: Dir, front: Dir, right: Dir): CubeView {
  const { faces, up } = foldNetWithUp(net);
  const R = viewRotation(top, front, right);
  const fv = (d: Dir, face: keyof typeof FACE_AXES): FaceView => {
    const i = faces.indexOf(d);
    return { symbol: symbols[i], turns: quarterTurns(R(NORMAL[up[i]]), face) };
  };
  return { top: fv(top, 'top'), front: fv(front, 'front'), right: fv(right, 'right') };
}
const viewKey = (v: CubeView) => [v.top, v.front, v.right].map((f) => `${f.symbol}${f.turns}`).join('|');
/** All physically possible corner views of the folded cube (8 corners × 3 rotations = 24). */
export function allTrueViews(net: [number, number][], symbols: string[]): CubeView[] {
  const dirs: Dir[] = ['U', 'D', 'N', 'S', 'E', 'W'];
  const out: CubeView[] = [];
  for (const a of dirs) for (const b of dirs) for (const c of dirs) if (viewValid(a, b, c)) out.push(trueView(net, symbols, a, b, c));
  return out;
}
export function isTrueView(net: [number, number][], symbols: string[], v: CubeView): boolean {
  const k = viewKey(v);
  return allTrueViews(net, symbols).some((t) => viewKey(t) === k);
}

export interface CubeQuestion { net: [number, number][]; symbols: string[]; views: CubeView[]; correct: number; orientation: boolean }
/** Asymmetric glyphs so rotation and mirroring are visible; plain symbols when orientation is off. */
export const GLYPHS = ['F', 'R', 'P', 'J', 'L', 'G'];
export const SYMBOLS = ['●', '▲', '■', '★', '✚', '◆'];

export function generateCubeQuestion(rng: Rng, nOptions = 4, orientation = true): CubeQuestion {
  const net = pick(rng, NETS);
  const symbols = shuffle(rng, orientation ? GLYPHS : SYMBOLS);
  const truths = allTrueViews(net, symbols);
  const right = pick(rng, truths);
  const keys = new Set(truths.map(viewKey));
  const strip = (v: CubeView): CubeView => (orientation ? v : { top: { ...v.top, turns: 0 }, front: { ...v.front, turns: 0 }, right: { ...v.right, turns: 0 } });
  const cands: CubeView[] = [];
  const { faces } = foldNetWithUp(net);
  const symOf = (d: Dir) => symbols[faces.indexOf(d)];
  const opp: Record<Dir, Dir> = { U: 'D', D: 'U', N: 'S', S: 'N', E: 'W', W: 'E' };
  for (let tries = 0; tries < 200 && cands.length < 12; tries++) {
    const base = pick(rng, truths);
    const kind = randInt(rng, 0, orientation ? 2 : 1);
    let v: CubeView;
    if (kind === 0) { // mirror: swap front and right faces (keeps their glyph turns)
      v = { top: base.top, front: base.right, right: base.front };
    } else if (kind === 1) { // opposite face shown adjacent
      const topDir = faces[symbols.indexOf(base.top.symbol)];
      v = { ...base, front: { symbol: symOf(opp[topDir]), turns: base.front.turns } };
    } else { // one glyph rotated wrongly
      const which = pick(rng, ['top', 'front', 'right'] as const);
      v = { ...base, [which]: { ...base[which], turns: (base[which].turns + randInt(rng, 1, 3)) % 4 } };
    }
    if (!keys.has(viewKey(v))) cands.push(v);
  }
  // Without orientation, compare face identity only.
  const ident = (v: CubeView) => `${v.top.symbol}|${v.front.symbol}|${v.right.symbol}`;
  const trueIdents = new Set(truths.map(ident));
  const wrong: CubeView[] = [];
  for (const c of shuffle(rng, cands)) {
    const sc = strip(c);
    if (!orientation && trueIdents.has(ident(sc))) continue;
    if (wrong.some((w) => viewKey(w) === viewKey(sc))) continue;
    wrong.push(sc);
    if (wrong.length === nOptions - 1) break;
  }
  const all = shuffle(rng, [strip(right), ...wrong]);
  return { net, symbols, views: all, correct: all.findIndex((v) => viewKey(v) === viewKey(strip(right))), orientation };
}
