// schema.org structured data (JSON-LD) shared by the FR and EN pages.
// Injected via <JsonLd data={...} /> — Google, Bing and AI answer engines read these.
import { SITE } from './site';
import type { Lang } from '../i18n/ui';

const BASE = 'https://www.leszines.fr';

const postalAddress = {
  '@type': 'PostalAddress',
  streetAddress: SITE.street,
  postalCode: SITE.postcode,
  addressLocality: SITE.city,
  addressRegion: 'Nouvelle-Aquitaine',
  addressCountry: 'FR',
};

// Pin of the villa (10 rue des Arbousiers) — OpenStreetMap house-number node.
const geo = { '@type': 'GeoCoordinates', latitude: 44.65698, longitude: -1.24414 };

const photos = [
  `${BASE}/photos/villa-jardin.webp`,
  `${BASE}/photos/terrasse.webp`,
  `${BASE}/photos/jardin-1.webp`,
];

export function vacationRentalSchema(lang: Lang) {
  const fr = lang === 'fr';
  const amenity = (frName: string, enName: string) => ({
    '@type': 'LocationFeatureSpecification',
    name: fr ? frName : enName,
    value: true,
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    '@id': `${BASE}/#villa`,
    name: SITE.name,
    url: fr ? `${BASE}/` : `${BASE}/en/`,
    description: fr
      ? 'Grande villa en bois au cœur du Cap Ferret : 6 chambres climatisées + dortoir, 4 salles d’eau, pièce de vie de 60 m², jardin clos et arboré de 700 m². 12 à 16 personnes, location à la semaine (samedi → samedi) en été, courts séjours possibles hors saison.'
      : 'Large timber villa in the heart of Cap Ferret: 6 air-conditioned bedrooms + dorm, 4 bathrooms, 60 m² living space, walled 700 m² wooded garden. Sleeps 12 to 16, weekly rental (Saturday to Saturday) in summer, short off-season stays possible.',
    image: photos,
    address: postalAddress,
    geo,
    telephone: SITE.phoneIntl,
    email: SITE.email,
    numberOfBedrooms: SITE.bedrooms,
    numberOfBathroomsTotal: SITE.bathrooms,
    occupancy: { '@type': 'QuantitativeValue', minValue: 12, maxValue: 16 },
    priceRange: '5 000 € – 9 500 € / semaine',
    currenciesAccepted: 'EUR',
    amenityFeature: [
      amenity('Climatisation dans toute la maison', 'Air conditioning throughout'),
      amenity('Wifi fibre', 'Fibre wifi'),
      amenity('Jardin clos et arboré de 700 m²', 'Walled, wooded 700 m² garden'),
      amenity('Barbecue et terrasses en bois', 'Barbecue and wood-deck terraces'),
      amenity('Chambre et salle d’eau accessibles (PMR), de plain-pied', 'Ground-floor accessible bedroom and bathroom'),
      amenity('Lave-linge', 'Washing machine'),
    ],
    knowsLanguage: ['fr', 'en'],
  };
}

export function realEstateListingSchema(lang: Lang) {
  const fr = lang === 'fr';
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: fr
      ? 'Villa Les Zines — villa en bois à vendre au Cap Ferret'
      : 'Villa Les Zines — timber villa for sale in Cap Ferret',
    url: fr ? `${BASE}/a-vendre/` : `${BASE}/en/a-vendre/`,
    description: fr
      ? 'Villa en bois « esprit Bassin » à vendre au cœur du Cap Ferret : 8 pièces, 6 chambres + dortoir, 4 salles d’eau, jardin clos de 700 m², DPE C / GES B. Vente de gré à gré, prix sur demande.'
      : 'Timber “esprit Bassin” villa for sale in the heart of Cap Ferret: 8 rooms, 6 bedrooms + dorm, 4 bathrooms, walled 700 m² garden, EPC C. Private sale, price on request.',
    image: photos,
    about: {
      '@type': 'House',
      numberOfRooms: 8,
      numberOfBedrooms: SITE.bedrooms,
      numberOfBathroomsTotal: SITE.bathrooms,
      address: postalAddress,
      geo,
    },
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'EUR',
        description: fr ? 'Prix sur demande' : 'Price on request',
      },
    },
  };
}

/** Breadcrumb "Accueil → Page" for interior pages. `slug` without locale prefix. */
export function breadcrumbSchema(lang: Lang, slug: string, name: string) {
  const fr = lang === 'fr';
  const home = fr ? `${BASE}/` : `${BASE}/en/`;
  const page = fr ? `${BASE}/${slug}/` : `${BASE}/en/${slug}/`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: fr ? 'Accueil' : 'Home', item: home },
      { '@type': 'ListItem', position: 2, name, item: page },
    ],
  };
}
