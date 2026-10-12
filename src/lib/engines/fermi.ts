/**
 * Original estimation bank (questions written for this project) plus scoring.
 * Answers are well-established reference values; the "note" explains the basis.
 * Interval scoring and point-estimate scoring formulas are ORIGINAL designs.
 */
export interface FermiItem { id: string; q: string; answer: number; unit: string; note: string }

export const FERMI_BANK: FermiItem[] = [
  { id: 'sec-year', q: 'How many seconds are there in a 365-day year?', answer: 31_536_000, unit: 's', note: '365 × 24 × 3,600' },
  { id: 'sec-day', q: 'How many seconds are there in one day?', answer: 86_400, unit: 's', note: '24 × 60 × 60' },
  { id: 'min-week', q: 'How many minutes are there in a week?', answer: 10_080, unit: 'min', note: '7 × 24 × 60' },
  { id: 'hours-decade', q: 'How many hours are in ten 365-day years?', answer: 87_600, unit: 'h', note: '3,650 × 24' },
  { id: 'moon', q: 'What is the average distance from the Earth to the Moon, in kilometres?', answer: 384_400, unit: 'km', note: 'Mean orbital distance ≈ 384,400 km' },
  { id: 'sun', q: 'What is the average distance from the Earth to the Sun, in kilometres?', answer: 149_600_000, unit: 'km', note: '1 astronomical unit ≈ 149.6 million km' },
  { id: 'circ', q: "What is the Earth's circumference at the equator, in kilometres?", answer: 40_075, unit: 'km', note: '≈ 40,075 km' },
  { id: 'diam', q: "What is the Earth's mean diameter, in kilometres?", answer: 12_742, unit: 'km', note: '≈ 12,742 km' },
  { id: 'light', q: 'How fast does light travel in a vacuum, in kilometres per second?', answer: 299_792, unit: 'km/s', note: '299,792.458 km/s' },
  { id: 'pop-world', q: 'Roughly how many people lived on Earth in 2024?', answer: 8_100_000_000, unit: 'people', note: 'UN estimates ≈ 8.1 billion' },
  { id: 'everest', q: 'How tall is Mount Everest, in metres?', answer: 8_849, unit: 'm', note: '2020 survey: 8,848.86 m' },
  { id: 'bones', q: 'How many bones are in a typical adult human skeleton?', answer: 206, unit: 'bones', note: 'Standard count is 206' },
  { id: 'un', q: 'How many member states does the United Nations have?', answer: 193, unit: 'states', note: '193 members' },
  { id: 'piano', q: 'How many keys are on a standard modern piano?', answer: 88, unit: 'keys', note: '52 white + 36 black' },
  { id: 'days-2000', q: 'How many days are there from 1 Jan 2000 to 1 Jan 2025?', answer: 9_132, unit: 'days', note: '25 × 365 + 7 leap days' },
  { id: 'marathon', q: 'How long is a marathon, in metres?', answer: 42_195, unit: 'm', note: '42.195 km' },
  { id: 'chess-squares', q: 'Counting squares of every size, how many squares are on a chessboard?', answer: 204, unit: 'squares', note: '1² + 2² + … + 8²' },
  { id: 'poker', q: 'How many distinct 5-card hands can be dealt from a 52-card deck?', answer: 2_598_960, unit: 'hands', note: 'C(52,5)' },
  { id: 'two32', q: 'What is 2 to the power 32?', answer: 4_294_967_296, unit: '', note: '2³² ≈ 4.29 × 10⁹' },
  { id: 'heartbeats', q: 'How many times does a heart beating 70 times a minute beat in one day?', answer: 100_800, unit: 'beats', note: '70 × 1,440' },
  { id: 'gold', q: 'What is the density of gold, in grams per cubic centimetre?', answer: 19.3, unit: 'g/cm³', note: '≈ 19.3 g/cm³' },
  { id: 'nile', q: 'How long is the Nile, in kilometres?', answer: 6_650, unit: 'km', note: 'Commonly quoted ≈ 6,650 km' },
  { id: 'pool', q: 'An Olympic pool is 50 m × 25 m × 2 m deep. How many litres does it hold?', answer: 2_500_000, unit: 'L', note: '2,500 m³ × 1,000 L/m³' },
  { id: 'universe', q: 'How old is the universe, in years?', answer: 13_800_000_000, unit: 'years', note: '≈ 13.8 billion years' },
  { id: 'earth-age', q: 'How old is the Earth, in years?', answer: 4_540_000_000, unit: 'years', note: '≈ 4.54 billion years' },
  { id: 'perm10', q: 'In how many orders can 10 different books be arranged on a shelf?', answer: 3_628_800, unit: 'orders', note: '10!' },
  { id: 'earth-mass', q: 'What is the mass of the Earth, in kilograms?', answer: 5.97e24, unit: 'kg', note: '≈ 5.97 × 10²⁴ kg' },
  { id: 'eiffel', q: 'How tall is the Eiffel Tower including antennas, in metres?', answer: 330, unit: 'm', note: '≈ 330 m' },
  { id: 'fact20', q: 'Roughly what is 20 factorial?', answer: 2.4329e18, unit: '', note: '20! ≈ 2.43 × 10¹⁸' },
  { id: 'japan', q: 'Roughly how many people live in Japan?', answer: 124_000_000, unit: 'people', note: '≈ 124 million (2024)' },
  { id: 'sec-life', q: 'How many seconds are in 80 years of 365 days?', answer: 2_522_880_000, unit: 's', note: '80 × 31,536,000' },
  { id: 'atlantic', q: 'How wide is the Atlantic between New York and London, as the crow flies, in km?', answer: 5_570, unit: 'km', note: 'Great-circle ≈ 5,570 km' },
];

/** Interval score (ORIGINAL): miss → 0. Hit → 50 + 50 × precision + up to 20 for speed.
 *  precision = max(0, 1 − decades/2), decades = log10(hi/lo). */
export function scoreInterval(lo: number, hi: number, truth: number, timeLeftFrac: number) {
  if (!(lo > 0) || !(hi >= lo)) return { valid: false, hit: false, points: 0, precision: 0 };
  const hit = lo <= truth && truth <= hi;
  const decades = Math.log10(hi / lo);
  const precision = Math.max(0, 1 - decades / 2);
  const points = hit ? Math.round(50 + 50 * precision + 20 * Math.max(0, Math.min(1, timeLeftFrac))) : 0;
  return { valid: true, hit, points, precision };
}
/** Point-estimate credit (ORIGINAL): 1 at exact, linearly to 0 at a factor of 10 off. */
export function pointCredit(guess: number, truth: number): number {
  if (!(guess > 0)) return 0;
  return Math.max(0, 1 - Math.abs(Math.log10(guess / truth)));
}
