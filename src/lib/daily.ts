import { GAMES } from './registry';
import { dailySeed, mulberry32, shuffle } from './rng';

/** Today's set: one market game, one numerical/probability drill and one cognitive drill, same for everyone on this date. */
export function dailyPlan(d = new Date()) {
  const r = mulberry32(dailySeed(d));
  const from = (cats: string[]) => shuffle(r, GAMES.filter((g) => cats.includes(g.category)))[0].id;
  const ids = [from(['market']), from(['numerical', 'probability', 'trading', 'estimation']), from(['cognitive'])];
  return { ids, seeds: ids.map(() => Math.floor(r() * 2 ** 31)) };
}

