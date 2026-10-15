import { describe, expect, it } from 'vitest';
import { parseCellDate, parseCsv, parseExtras, parseSheet, parseStatus } from '../src/lib/rates/sheet';

describe('parseCsv', () => {
  it('lit les champs entre guillemets, virgules et guillemets doublés compris', () => {
    expect(parseCsv('a,"b,c","d ""e"""\r\n1,2,3')).toEqual([
      ['a', 'b,c', 'd "e"'],
      ['1', '2', '3'],
    ]);
  });
});

describe('parseCellDate', () => {
  it.each([
    ['Date(2026,6,4)', '2026-07-04'], // cellule typée date (gviz) : mois indexé à 0
    ['2026-07-04', '2026-07-04'],
    ['04/07/2026', '2026-07-04'],
    ['4-7-26', '2026-07-04'],
    ['4 juillet 2026', '2026-07-04'],
    ['13 févr. 2027', '2027-02-13'],
  ])('« %s » → %s', (cell, iso) => {
    expect(parseCellDate(cell)).toBe(iso);
  });

  it('renvoie null pour une cellule vide ou un en-tête', () => {
    expect(parseCellDate('')).toBeNull();
    expect(parseCellDate('Arrivée')).toBeNull();
  });
});

describe('parseStatus', () => {
  it('ne prend pas « indisponible » pour « disponible »', () => {
    expect(parseStatus('indisponible')).toBe('unavailable');
  });

  it.each([
    ['loué', 'booked'],
    ['Réservé', 'booked'],
    ['complet', 'booked'],
    ['fermé', 'unavailable'],
    ['travaux', 'unavailable'],
    ['disponible', 'available'],
    ['libre', 'available'],
    ['', 'available'],
  ])('« %s » → %s', (cell, status) => {
    expect(parseStatus(cell)).toBe(status);
  });
});

describe('parseExtras (colonnes Zones et Afficher)', () => {
  it('lit les zones saisies', () => {
    expect(parseExtras(['A C', 'TRUE'])).toEqual({ zones: ['A', 'C'], show: true });
  });

  it('« toutes » vaut A, B et C', () => {
    expect(parseExtras(['toutes', 'TRUE'])).toEqual({ zones: ['A', 'B', 'C'], show: true });
  });

  it('une colonne Zones vide laisse le site déduire les zones', () => {
    expect(parseExtras(['', 'TRUE'])).toEqual({ zones: undefined, show: true });
  });

  it('« - » dans Zones signifie « aucune zone »', () => {
    expect(parseExtras(['-', 'TRUE'])).toEqual({ zones: [], show: true });
  });

  it('« non » dans Zones ne masque pas la semaine', () => {
    // Le piège qui faisait disparaître des semaines du site : « non » lu comme « Afficher = non ».
    expect(parseExtras(['non', 'TRUE'])).toEqual({ zones: [], show: true });
  });

  it('une case Afficher décochée masque la semaine', () => {
    expect(parseExtras(['A B C', 'FALSE'])).toEqual({ zones: ['A', 'B', 'C'], show: false });
  });

  it('le « A » de FALSE n’est pas pris pour une zone', () => {
    expect(parseExtras(['FALSE'])).toEqual({ zones: undefined, show: false });
  });
});

describe('parseSheet', () => {
  it('garde les lignes datées et ignore en-tête et notes libres', () => {
    const csv = [
      '"Arrivée","Départ","Prix","Disponibilité","Zones","Afficher"',
      '"18/07/2026","25/07/2026","7 900","disponible","A B C","TRUE"',
      '"Note : tarifs 2027 à confirmer","","","","",""',
      '"25/07/2026","01/08/2026","","loué","","FALSE"',
    ].join('\n');

    expect(parseSheet(csv)).toEqual([
      { start: '2026-07-18', end: '2026-07-25', price: 7900, status: 'available', zones: ['A', 'B', 'C'], show: true },
      { start: '2026-07-25', end: '2026-08-01', price: 0, status: 'booked', zones: undefined, show: false },
    ]);
  });
});
