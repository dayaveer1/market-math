import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/rng';
import * as K from '@/lib/engines/cognitive';
import * as TN from '@/lib/engines/targetNumber';
import * as SK from '@/lib/engines/skyline';
import * as MY from '@/lib/engines/mystery';
import * as CU from '@/lib/engines/cube';

describe('task switch & conflict', () => {
  it('keys', () => {
    expect(K.switchKey(3, 'parity')).toBe('F');
    expect(K.switchKey(8, 'parity')).toBe('J');
    expect(K.switchKey(3, 'magnitude')).toBe('F');
    expect(K.switchKey(8, 'magnitude')).toBe('J');
  });
  it('flanker centre decides key; simon colour decides key', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const t = K.nextConflictTrial(rng, 'mixed');
      if (t.task === 'flanker') expect(t.key).toBe(t.display[2] === '<' ? 'F' : 'J');
      else expect(t.key).toBe(t.color === 'red' ? 'F' : 'J');
    }
  });
});
describe('pincode', () => {
  it('modes and staircase', () => {
    expect(K.expectedPin([3, 1, 2], 'forward')).toBe('312');
    expect(K.expectedPin([3, 1, 2], 'reverse')).toBe('213');
    expect(K.expectedPin([3, 1, 2], 'sorted')).toBe('123');
    expect(K.nextPinLength(5, true, 1)).toEqual({ len: 6, errorStreak: 0 });
    expect(K.nextPinLength(5, false, 0)).toEqual({ len: 5, errorStreak: 1 });
    expect(K.nextPinLength(5, false, 1)).toEqual({ len: 4, errorStreak: 0 });
  });
});
describe('code match', () => {
  it('exactly one option equals the target', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      const r = K.codeRound(rng, 6, 5);
      expect(r.options.filter((o) => o === r.target).length).toBe(1);
      expect(new Set(r.options).size).toBe(r.options.length);
    }
  });
});
describe('grid, pump, arcs, intercept', () => {
  it('grade pattern', () => expect(K.gradePattern([1, 2, 3], [1, 2, 9])).toEqual({ hits: 2, falseAlarms: 1, perfect: false }));
  it('pump optimum for uniform pop point', () => {
    expect(K.optimalPumps(64)).toBe(32);
    expect(K.pumpEV(32, 64, 0.05)).toBeCloseTo(0.8, 10);
  });
  it('arc wraparound', () => {
    expect(K.inArc(5, 350, 30)).toBe(true);
    expect(K.inArc(25, 350, 30)).toBe(false);
  });
  it('meet time', () => {
    expect(K.meetTime(0, 100, 500, 400, 0)).toBeCloseTo(1, 10);
    expect(K.meetTime(0, 100, 500, 400, 2)).toBeCloseTo(2.6, 10);
    expect(K.meetTime(0, 100, 500, 400, 6)).toBeNull(); // ball already past the cannon line
  });
  it('hold fire go rule', () => {
    expect(K.isGo({ kind: 'color', value: 'blue' }, { shape: 'square', hue: 'blue' })).toBe(true);
    expect(K.isGo({ kind: 'shape', value: 'circle' }, { shape: 'square', hue: 'blue' })).toBe(false);
  });
});
describe('target number', () => {
  it('solver finds 24 from 4 4 10 10', () => {
    const s = TN.solve([4, 4, 10, 10], 24);
    expect(s).not.toBeNull();
    expect(TN.checkSolution(s!, [4, 4, 10, 10], 24).ok).toBe(true);
  });
  it('evaluator respects precedence and validates usage', () => {
    expect(TN.evaluate('2+3*4').value).toBe(14);
    expect(TN.evaluate('(2+3)×4').value).toBe(20);
    expect(TN.checkSolution('8/(3-8/3)', [3, 3, 8, 8], 24).ok).toBe(true);
    expect(TN.checkSolution('3*8', [3, 3, 8, 8], 24).ok).toBe(false);
    expect(() => TN.evaluate('2^3')).toThrow();
  });
  it('generated puzzles are solvable', () => {
    const rng = mulberry32(12);
    for (let i = 0; i < 20; i++) {
      const p = TN.generatePuzzle(rng, 13, 10, 100);
      expect(TN.solve(p.nums, p.target)).not.toBeNull();
    }
  });
});
describe('skyline', () => {
  it('BFS optimum', () => {
    const a: SK.State = [['R', 'G', 'B'], [], []];
    expect(SK.minMoves(a, a)).toBe(0);
    expect(SK.minMoves(a, [['R', 'G'], ['B'], []])).toBe(1);
    expect(SK.allStates(['R', 'G', 'B']).length).toBe(36);
  });
  it('generated problems hit requested distance', () => {
    const p = SK.generateProblem(mulberry32(3), 4);
    expect(p.optimal).toBe(4);
  });
});
describe('mystery figure', () => {
  it('feedback and solver', () => {
    expect(MY.feedback([0, 1, 2, 3], [0, 2, 2, 1])).toBe(2);
    const n = MY.consistentSolverAttempts([3, 1, 4, 1], 6);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(15);
    expect(MY.remainingCandidates([{ guess: [0, 0, 0, 0], score: 4 }], 4, 6)).toBe(1);
  });
});
describe('cube folding', () => {
  it('every net folds to six distinct faces', () => {
    for (const net of CU.NETS) expect(new Set(CU.foldNet(net)).size).toBe(6);
  });
  it('cross net puts opposite cells on opposite faces', () => {
    // row 1 of net 1 is a strip of four: cells 1 and 3 are opposite, cells 2 and 4 are opposite
    const f = CU.foldNet(CU.NETS[0]);
    const opp: Record<string, string> = { U: 'D', D: 'U', N: 'S', S: 'N', E: 'W', W: 'E' };
    expect(opp[f[1]]).toBe(f[3]);
    expect(opp[f[2]]).toBe(f[4]);
    expect(opp[f[0]]).toBe(f[5]);
  });
  it('reference corner is valid, mirror is not, opposite faces never valid', () => {
    expect(CU.viewValid('U', 'S', 'E')).toBe(true);
    expect(CU.viewValid('U', 'E', 'S')).toBe(false);
    expect(CU.viewValid('U', 'D', 'E')).toBe(false);
  });
  it('questions have exactly one physically valid view (with and without orientation)', () => {
    const rng = mulberry32(17);
    for (const orientation of [true, false]) for (let i = 0; i < 60; i++) {
      const q = CU.generateCubeQuestion(rng, 4, orientation);
      expect(q.views.length).toBe(4);
      const valid = q.views.map((v, j) => {
        if (orientation) return CU.isTrueView(q.net, q.symbols, v) ? j : -1;
        const t = CU.allTrueViews(q.net, q.symbols).some((x) => x.top.symbol === v.top.symbol && x.front.symbol === v.front.symbol && x.right.symbol === v.right.symbol);
        return t ? j : -1;
      }).filter((j) => j >= 0);
      expect(valid).toEqual([q.correct]);
    }
  });
  it('glyph orientation follows the fold: a flap north of the base points down once folded', () => {
    // Net 5: cell 0 at (0,1) is north of cell 2 at (1,1). Fold from cell 2 conceptually by checking relative geometry:
    const net: [number, number][] = [[1, 1], [0, 1], [1, 0], [1, 2], [1, 3], [2, 1]];
    const { faces, up } = CU.foldNetWithUp(net);
    expect(faces[0]).toBe('U'); expect(up[0]).toBe('N');
    expect(faces[1]).toBe('N'); expect(up[1]).toBe('D'); // north flap: its glyph top points away from the base, i.e. down
    expect(faces[5]).toBe('S'); expect(up[5]).toBe('U'); // south flap: glyph top points toward the base, i.e. up
    expect(faces[3]).toBe('E'); expect(up[3]).toBe('N'); // east flap: glyph top still points north
  });
  it('24 distinct true views per cube, each face appears upright somewhere consistent', () => {
    for (const net of CU.NETS) {
      const views = CU.allTrueViews(net, CU.GLYPHS);
      expect(views.length).toBe(24);
      expect(new Set(views.map((v) => JSON.stringify(v))).size).toBe(24);
    }
  });
  it('the identity corner of the base face shows the base glyph upright', () => {
    const v = CU.trueView(CU.NETS[0], CU.GLYPHS, 'U', 'S', 'E');
    expect(v.top).toEqual({ symbol: CU.GLYPHS[0], turns: 0 });
  });
});
