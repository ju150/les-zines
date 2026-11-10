import { describe, expect, it } from 'vitest';
import { SITE } from '../src/data/site';
import { buildLlmsTxt } from '../src/lib/llms';
import type { RateSummary } from '../src/lib/rates/summary';

const season: RateSummary = {
  min: 5000,
  max: 9900,
  years: [2027],
  weeks: [
    { start: '2027-06-26', end: '2027-07-03', price: 5000, status: 'available' },
    { start: '2027-07-31', end: '2027-08-07', price: 9900, status: 'booked' },
    { start: '2027-08-28', end: '2027-09-01', price: 5000, status: 'available' },
  ],
};

describe('buildLlmsTxt', () => {
  const text = buildLlmsTxt(SITE, season);

  it('reprend l’adresse de site.ts, et jamais l’ancien code postal', () => {
    // 33950 est le code du bourg de Lège ; la villa est au Cap Ferret, en 33970. Le fichier
    // écrit à la main a annoncé le mauvais pendant des mois.
    expect(text).toContain(`${SITE.street}, ${SITE.postcode} ${SITE.city}`);
    expect(SITE.postcode).toBe('33970');
    expect(text).not.toContain('33950');
  });

  it('annonce la fourchette et l’année de la saison résumée, en français et en anglais', () => {
    expect(text).toContain('- Tarifs 2027, par semaine : de 5 000 € à 9 900 € selon la période');
    expect(text).toContain('(EUR 5,000 to 9,900 per week in 2027)');
  });

  it('détaille chaque semaine avec des dates lisibles, sans annoncer de disponibilité', () => {
    // Les disponibilités changent dans la feuille sans nouveau build : seul le prix est figé ici.
    expect(text).toContain('  - du 26 juin 2027 au 3 juillet 2027 : 5 000 €');
    expect(text).toContain('  - du 28 août 2027 au 1er septembre 2027 : 5 000 €');
    const weekLines = text.split('\n').filter((line) => line.startsWith('  - du '));
    expect(weekLines).toHaveLength(3);
    for (const line of weekLines) expect(line).not.toMatch(/disponible|lou/i);
  });

  it('ne promet plus de temps de marche', () => {
    // « Plage océane à 5 min à pied » : la plage est à plus d'un kilomètre.
    expect(text).not.toMatch(/\d+\s*min/);
  });

  it('suit la proposition llmstxt.org : un titre, un résumé, puis des sections de liens', () => {
    const lines = text.split('\n');
    expect(lines[0]).toBe('# Villa Les Zines');
    expect(lines[2].startsWith('> ')).toBe(true);
    expect(text.match(/^## /gm)).toHaveLength(3);
    // Sous les sections « ## », uniquement des liens « - [nom](url): note ».
    const afterFirstSection = text.slice(text.indexOf('## '));
    const items = afterFirstSection.split('\n').filter((line) => line.startsWith('- '));
    expect(items.length).toBe(17);
    for (const item of items) expect(item).toMatch(/^- \[[^\]]+\]\(https:\/\/www\.leszines\.fr\/[^)]*\): .+/);
  });

  it('liste les pages dans les deux langues, avec le slash final', () => {
    expect(text).toContain('(https://www.leszines.fr/a-vendre/)');
    expect(text).toContain('(https://www.leszines.fr/en/a-vendre/)');
  });

  it('reste publiable sans aucun tarif connu', () => {
    const empty = buildLlmsTxt(SITE, null);
    expect(empty).toContain('- Tarifs : sur demande');
    expect(empty).toContain('Weekly rental in summer, short stays');
  });
});
