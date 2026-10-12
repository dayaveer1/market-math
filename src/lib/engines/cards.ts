/**
 * Card Game (market taking). Reference description only: "read quotes, identify edge, take the best price".
 * ORIGINAL design: a standard 52-card deck (A=1 ... K=13). N cards are dealt without replacement, some face up.
 * The contract settles at the sum of the dealt cards. Several quoters show two-way prices; take one side or pass.
 */
import { type Rng, shuffle, normal, randInt } from '../rng';

export const FULL_DECK: number[] = Array.from({ length: 52 }, (_, i) => (i % 13) + 1);
export const DECK_SUM = FULL_DECK.reduce((a, b) => a + b, 0); // 364
export const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export interface Quote { name: string; bid: number; ask: number }
export interface CardRound { cards: number[]; revealed: boolean[]; quotes: Quote[] }
export type CardAction = { kind: 'buy'; quote: number } | { kind: 'sell'; quote: number } | { kind: 'pass' };

/** Conditional expectation of the total given the face-up cards (hidden cards are uniform over the rest of the deck). */
export function fairValue(cards: number[], revealed: boolean[]): number {
  const up = cards.filter((_, i) => revealed[i]);
  const nHidden = cards.length - up.length;
  const upSum = up.reduce((a, b) => a + b, 0);
  const meanRemaining = (DECK_SUM - upSum) / (52 - up.length);
  return upSum + nHidden * meanRemaining;
}
export const settle = (r: CardRound) => r.cards.reduce((a, b) => a + b, 0);

export function generateRound(rng: Rng, nCards: number, nRevealed: number, nQuoters: number, quoteNoise = 4): CardRound {
  const deck = shuffle(rng, FULL_DECK);
  const cards = deck.slice(0, nCards);
  const order = shuffle(rng, cards.map((_, i) => i)).slice(0, Math.min(nRevealed, nCards - 1));
  const revealed = cards.map((_, i) => order.includes(i));
  const fair = fairValue(cards, revealed);
  const names = ['Ana', 'Bram', 'Chen', 'Dev', 'Eli'];
  const quotes = Array.from({ length: nQuoters }, (_, q) => {
    const mid = fair + normal(rng) * quoteNoise;
    const spread = randInt(rng, 2, 4);
    const bid = Math.round(mid - spread / 2);
    return { name: names[q % names.length], bid, ask: bid + spread };
  });
  return { cards, revealed, quotes };
}

export function actionEdge(r: CardRound, a: CardAction): number {
  const fair = fairValue(r.cards, r.revealed);
  if (a.kind === 'buy') return fair - r.quotes[a.quote].ask;
  if (a.kind === 'sell') return r.quotes[a.quote].bid - fair;
  return 0;
}
/** The action with maximum expected value (pass when no quote offers positive edge). */
export function bestAction(r: CardRound): CardAction {
  let best: CardAction = { kind: 'pass' };
  let bestEdge = 1e-9;
  r.quotes.forEach((_, i) => {
    for (const kind of ['buy', 'sell'] as const) {
      const e = actionEdge(r, { kind, quote: i });
      if (e > bestEdge) { bestEdge = e; best = { kind, quote: i }; }
    }
  });
  return best;
}
export function actionPnl(r: CardRound, a: CardAction, size: number): number {
  const s = settle(r);
  if (a.kind === 'buy') return size * (s - r.quotes[a.quote].ask);
  if (a.kind === 'sell') return size * (r.quotes[a.quote].bid - s);
  return 0;
}
