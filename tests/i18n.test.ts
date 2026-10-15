import { describe, expect, it } from 'vitest';
import { localizedPath, ui } from '../src/i18n/ui';

describe('traductions', () => {
  it('le français et l’anglais ont exactement les mêmes clés', () => {
    expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.fr).sort());
  });

  it('aucune traduction n’est vide', () => {
    for (const lang of ['fr', 'en'] as const) {
      const empty = Object.entries(ui[lang]).filter(([, text]) => !String(text).trim());
      expect(empty, `clés vides en ${lang}`).toEqual([]);
    }
  });
});

describe('localizedPath', () => {
  it('produit des chemins à slash final, préfixés /en/ en anglais', () => {
    expect(localizedPath('fr')).toBe('/');
    expect(localizedPath('en')).toBe('/en/');
    expect(localizedPath('fr', 'la-villa')).toBe('/la-villa/');
    expect(localizedPath('en', 'la-villa')).toBe('/en/la-villa/');
  });
});
