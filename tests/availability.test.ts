import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAvailability, scopedWeeks, type Week } from '../src/lib/rates/availability';

const week = (start: string, end: string, status = 'available', extra: Partial<Week> = {}): Week => ({
  start,
  end,
  price: 7900,
  status,
  ...extra,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 1)); // 1er juin 2026
});
afterEach(() => {
  vi.useRealTimers();
});

describe('scopedWeeks', () => {
  const weeks = [
    week('2026-05-23', '2026-05-30'),
    week('2026-05-30', '2026-06-06'),
    week('2026-07-18', '2026-07-25', 'booked'),
  ];

  it('sépare les semaines à venir de celles dont le départ est passé', () => {
    expect(scopedWeeks(weeks, 'current').map((w) => w.start)).toEqual(['2026-05-30', '2026-07-18']);
    expect(scopedWeeks(weeks, 'past').map((w) => w.start)).toEqual(['2026-05-23']);
  });

  it('écarte les semaines masquées et celles sans dates lisibles', () => {
    const hidden = week('2026-08-01', '2026-08-08', 'available', { show: false });
    const undated = week('', '2026-08-08');
    expect(scopedWeeks([hidden, undated], 'current')).toEqual([]);
  });
});

describe('renderAvailability', () => {
  it('le bouton « Réserver » passe la semaine dans le fragment, jamais dans la query', () => {
    // Une query créerait une URL par semaine que Google explorerait (Search Console).
    const html = renderAvailability([week('2026-07-18', '2026-07-25')], { mode: 'links', lang: 'fr' });
    expect(html).toContain('href="/reservation/#week=');
    expect(html).not.toContain('/reservation?');
  });

  it('ajoute le slash final au lien de réservation anglais', () => {
    const html = renderAvailability([week('2026-07-18', '2026-07-25')], {
      mode: 'links',
      lang: 'en',
      reservationBase: '/en/reservation',
    });
    expect(html).toContain('href="/en/reservation/#week=');
  });

  it('une semaine louée garde son prix, barré, et n’a pas de bouton', () => {
    const html = renderAvailability([week('2026-07-18', '2026-07-25', 'booked')], { mode: 'links', lang: 'fr' });
    expect(html).toContain('<s class="av-was"');
    expect(html).toContain('Déjà loué');
    expect(html).not.toContain('#week=');
  });

  it('déduit les zones A, B, C d’une semaine en plein été', () => {
    const html = renderAvailability([week('2026-08-01', '2026-08-08')], { mode: 'links', lang: 'fr' });
    expect(html).toContain('zone-a');
    expect(html).toContain('zone-b');
    expect(html).toContain('zone-c');
  });

  it('ne compte pas en vacances une semaine qui ne mord que de deux nuits sur juillet', () => {
    const html = renderAvailability([week('2026-06-27', '2026-07-03')], { mode: 'links', lang: 'fr' });
    expect(html).not.toContain('class="zone ');
  });

  it('respecte « aucune zone » saisi dans la feuille, même en été', () => {
    const html = renderAvailability([week('2026-08-01', '2026-08-08', 'available', { zones: [] })], {
      mode: 'links',
      lang: 'fr',
    });
    expect(html).not.toContain('class="zone ');
  });

  it('en mode sélection, seules les semaines disponibles sont cochables', () => {
    const html = renderAvailability(
      [week('2026-07-18', '2026-07-25'), week('2026-07-25', '2026-08-01', 'booked'), week('2026-08-01', '2026-08-08', 'unavailable')],
      { mode: 'select', lang: 'fr' },
    );
    expect(html.match(/type="checkbox"/g)).toHaveLength(1);
  });

  it('échappe ce qui vient de la feuille', () => {
    const html = renderAvailability([week('2026-08-01', '2026-08-08', 'available', { zones: ['<img src=x>'] })], {
      mode: 'links',
      lang: 'fr',
    });
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('&lt;img src=x&gt;');
  });

  it('sépare les saisons par un bandeau d’année quand deux années sont listées', () => {
    const html = renderAvailability([week('2026-07-18', '2026-07-25'), week('2027-07-17', '2027-07-24')], {
      mode: 'links',
      lang: 'fr',
    });
    expect(html).toContain('<div class="av-year">2026</div>');
    expect(html).toContain('<div class="av-year">2027</div>');
  });

  it('dans l’archive, une semaine passée restée « disponible » devient « Passée », sans bouton', () => {
    const html = renderAvailability([week('2026-05-23', '2026-05-30')], { mode: 'links', lang: 'fr', scope: 'past' });
    expect(html).toContain('Passée');
    expect(html).not.toContain('#week=');
  });

  it('annonce une saison complète quand plus rien n’est réservable', () => {
    expect(renderAvailability([], { mode: 'links', lang: 'fr' })).toContain('Toutes les semaines de la saison sont louées');
    expect(renderAvailability([], { mode: 'links', lang: 'fr', scope: 'past' })).toBe('');
  });
});
