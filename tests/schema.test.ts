import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import rates from '../src/data/rates.json';
import { HOUSE_ID, VILLA_ID, realEstateListingSchema, vacationRentalSchema, webSiteSchema } from '../src/data/schema';
import { SITE } from '../src/data/site';
import { formatEuros } from '../src/lib/rates/summary';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 10)); // 10 novembre 2026
});
afterEach(() => {
  vi.useRealTimers();
});

describe('vacationRentalSchema', () => {
  it('porte l’adresse de site.ts, code postal du Cap Ferret compris', () => {
    const { address } = vacationRentalSchema('fr');
    expect(address.postalCode).toBe(SITE.postcode);
    expect(address.postalCode).toBe('33970');
    expect(address.streetAddress).toBe(SITE.street);
  });

  it('garde le même établissement, la même adresse web et la même maison dans les deux langues', () => {
    // Deux url différentes sous un même @id : un moteur y lirait deux établissements.
    const fr = vacationRentalSchema('fr');
    const en = vacationRentalSchema('en');
    expect(fr['@id']).toBe(VILLA_ID);
    expect(en['@id']).toBe(VILLA_ID);
    expect(en.url).toBe(fr.url);
    expect(en.containsPlace['@id']).toBe(HOUSE_ID);
    expect(en.mainEntityOfPage).toBe('https://www.leszines.fr/en/');
    expect(vacationRentalSchema('fr', { slug: 'sejours-tarifs' }).mainEntityOfPage).toBe('https://www.leszines.fr/sejours-tarifs/');
  });

  it('remplit ce que Google exige d’une location de vacances', () => {
    const rental = vacationRentalSchema('fr');
    expect(rental.identifier).toBeTruthy();
    expect(rental.containsPlace.occupancy.value).toBe(SITE.sleepsMax);
    expect(rental.containsPlace.numberOfBedrooms).toBe(SITE.bedrooms);
    expect(rental.image.length).toBeGreaterThanOrEqual(8);
  });

  it('tire la fourchette de prix du tableau des tarifs, dans la langue de la page', () => {
    // Le plafond annoncé est celui des semaines à venir de rates.json, pas un nombre recopié :
    // c'est ce qui avait laissé « 9 500 € » en ligne quand le tableau affichait déjà 9 900 €.
    const upcoming = rates.weeks.filter((w) => w.end > '2026-11-10');
    const max = Math.max(...upcoming.map((w) => w.price));
    const fr = vacationRentalSchema('fr').priceRange!;
    const en = vacationRentalSchema('en').priceRange!;
    expect(fr).toContain(formatEuros(max, 'fr', ' '));
    expect(fr).toMatch(/ \/ semaine$/);
    expect(en).toContain(formatEuros(max, 'en'));
    expect(en).toMatch(/^€[\d,]+( – €[\d,]+)? per week$/);
  });

  it('relie le site à la fiche Google, et à elle seule', () => {
    // La page Facebook de la villa n'est plus accessible : la déclarer comme profil officiel
    // enverrait les moteurs vers une page morte.
    const { sameAs, hasMap } = vacationRentalSchema('fr');
    expect(sameAs).toEqual([SITE.mapsLink]);
    expect(hasMap).toBe(SITE.mapsLink);
    expect(JSON.stringify(vacationRentalSchema('fr'))).not.toContain('facebook');
  });

  it('ne détaille lits et équipements que sur la page qui les affiche un par un', () => {
    expect(vacationRentalSchema('fr').containsPlace).not.toHaveProperty('bed');
    const full = vacationRentalSchema('fr', { slug: 'la-villa', detail: 'full' }).containsPlace as Record<string, unknown>;
    expect(full.bed).toHaveLength(2);
    expect(full.amenityFeature).toContainEqual({ '@type': 'LocationFeatureSpecification', name: 'ac', value: true });
  });
});

describe('realEstateListingSchema', () => {
  const graph = (lang: 'fr' | 'en') => realEstateListingSchema(lang)['@graph'] as Array<Record<string, any>>;
  const node = (lang: 'fr' | 'en', type: string) => graph(lang).find((n) => n['@type'] === type)!;

  it('dit que c’est une vente, de quelle maison, et qui contacter', () => {
    const offer = node('fr', 'Offer');
    expect(offer.businessFunction).toMatch(/#Sell$/);
    expect(offer.itemOffered).toEqual({ '@id': HOUSE_ID });
    expect(offer.seller).toEqual({ '@id': VILLA_ID });
    expect(node('fr', 'RealEstateListing').mainEntity).toEqual({ '@id': HOUSE_ID });
    expect(node('fr', 'Organization').contactPoint.contactType).toBe('sales');
  });

  it('place la maison à la bonne adresse', () => {
    expect(node('fr', 'House').address.postalCode).toBe('33970');
  });

  it('n’invente ni prix, ni surface habitable, ni année de construction', () => {
    const house = node('fr', 'House');
    expect(house).not.toHaveProperty('floorSize');
    expect(house).not.toHaveProperty('yearBuilt');
    expect(node('fr', 'Offer')).not.toHaveProperty('price');
  });

  it('donne à chaque langue sa propre annonce, mais la même maison', () => {
    expect(node('fr', 'RealEstateListing')['@id']).toBe('https://www.leszines.fr/a-vendre/#annonce');
    expect(node('en', 'RealEstateListing')['@id']).toBe('https://www.leszines.fr/en/a-vendre/#annonce');
    expect(node('en', 'House')['@id']).toBe(HOUSE_ID);
  });
});

describe('webSiteSchema', () => {
  it('nomme le site et le rattache à la villa', () => {
    const site = webSiteSchema();
    expect(site.name).toBe('Villa Les Zines');
    expect(site.publisher).toEqual({ '@id': VILLA_ID });
  });
});
