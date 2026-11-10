import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Week } from '../src/lib/rates/availability';
import { formatEuros, formatPriceRange, formatPriceSpan, rateSummary, seasonLabel, seasonSentence } from '../src/lib/rates/summary';

const week = (start: string, end: string, price: number, extra: Partial<Week> = {}): Week => ({
  start,
  end,
  price,
  status: 'available',
  ...extra,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 10)); // 10 novembre 2026 : la saison 2026 est close
});
afterEach(() => {
  vi.useRealTimers();
});

describe('rateSummary', () => {
  const weeks = [
    week('2026-08-01', '2026-08-08', 9500, { status: 'booked' }),
    week('2027-06-26', '2027-07-03', 5000),
    week('2027-07-10', '2027-07-17', 9900, { status: 'booked' }),
  ];

  it('résume la saison qui a encore des semaines à venir : la saison écoulée ne fixe plus le prix annoncé', () => {
    // Le piège d'origine : « 9 500 € (saison 2026) » restait annoncé aux moteurs alors que le
    // tableau ne proposait plus que 2027.
    expect(rateSummary(weeks)).toMatchObject({ min: 5000, max: 9900, years: [2027] });
  });

  it('garde la fourchette de toute la saison en fin d’été, quand il ne reste que des semaines creuses', () => {
    // Ne résumer que les semaines restantes annonçait « Saison 2027 : 5 000 € la semaine » à
    // partir du 28 août, la haute saison à 9 900 € étant passée, et cela restait en ligne
    // tout l'automne.
    const season = [
      week('2027-06-26', '2027-07-03', 5000),
      week('2027-07-31', '2027-08-07', 9900, { status: 'booked' }),
      week('2027-08-21', '2027-08-28', 7900),
      week('2027-09-04', '2027-09-11', 5000),
    ];
    vi.setSystemTime(new Date(2027, 8, 2)); // 2 septembre 2027 : seule la dernière semaine reste à venir
    const summary = rateSummary(season)!;
    expect(summary).toMatchObject({ min: 5000, max: 9900, years: [2027] });
    expect(summary.weeks).toHaveLength(4);
  });

  it('compte une semaine déjà louée : elle renseigne autant sur le tarif qu’une semaine libre', () => {
    expect(rateSummary([week('2027-07-10', '2027-07-17', 9900, { status: 'booked' })])?.max).toBe(9900);
  });

  it('ignore les semaines masquées dans la feuille et celles sans prix', () => {
    const summary = rateSummary([
      week('2027-06-26', '2027-07-03', 5000),
      week('2027-07-03', '2027-07-10', 12000, { show: false }),
      week('2027-07-10', '2027-07-17', 0),
    ]);
    expect(summary).toMatchObject({ min: 5000, max: 5000 });
  });

  it('entre deux saisons, résume la dernière saison connue plutôt que de n’annoncer aucun prix', () => {
    vi.setSystemTime(new Date(2027, 9, 1)); // 1er octobre 2027 : plus aucune semaine à venir
    expect(rateSummary(weeks)).toMatchObject({ min: 5000, max: 9900, years: [2027] });
  });

  it('renvoie null quand aucune semaine n’a de prix', () => {
    expect(rateSummary([])).toBeNull();
    expect(rateSummary([week('2027-07-10', '2027-07-17', 0)])).toBeNull();
  });

  it('couvre deux années quand le tableau est à cheval sur deux saisons', () => {
    vi.setSystemTime(new Date(2026, 5, 1)); // 1er juin 2026 : l'été 2026 est encore à venir
    const summary = rateSummary(weeks)!;
    expect(summary.years).toEqual([2026, 2027]);
    expect(seasonLabel(summary)).toBe('2026-2027');
  });
});

describe('formatEuros et formatPriceSpan', () => {
  it('écrit le montant comme dans chaque langue', () => {
    expect(formatEuros(9900, 'fr', ' ')).toBe('9 900 €');
    expect(formatEuros(9900, 'en')).toBe('€9,900');
    expect(formatEuros(500, 'fr', ' ')).toBe('500 €');
    expect(formatEuros(12500, 'en')).toBe('€12,500');
  });

  it('sépare par une espace insécable par défaut, pour qu’un prix ne soit jamais coupé en fin de ligne', () => {
    expect(formatEuros(9900, 'fr')).toBe('9 900 €');
  });

  it('donne la fourchette, ou un seul montant quand tous les prix sont égaux', () => {
    const span = { min: 5000, max: 9900, years: [2027], weeks: [] };
    expect(formatPriceSpan(span, 'fr', ' ')).toBe('5 000 € – 9 900 €');
    expect(formatPriceSpan(span, 'en')).toBe('€5,000 – €9,900');
    expect(formatPriceSpan({ ...span, max: 5000 }, 'fr', ' ')).toBe('5 000 €');
    expect(formatPriceRange(span, 'fr', ' ')).toBe('de 5 000 € à 9 900 €');
    expect(formatPriceRange(span, 'en')).toBe('€5,000 to €9,900');
    expect(formatPriceRange({ ...span, max: 5000 }, 'en')).toBe('€5,000');
  });
});

describe('seasonSentence', () => {
  it('écrit la phrase de synthèse des tarifs, la même au build et dans le navigateur', () => {
    const season = { min: 5000, max: 9900, years: [2027], weeks: [] };
    expect(seasonSentence(season, 'fr')).toBe('Saison 2027 : de 5 000 € à 9 900 € la semaine selon la période');
    expect(seasonSentence(season, 'en')).toBe('2027 season: €5,000 to €9,900 per week depending on the period');
    expect(seasonSentence({ ...season, years: [2027, 2028] }, 'fr')).toContain('Saison 2027-2028');
  });
});
