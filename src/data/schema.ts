// Données structurées schema.org (JSON-LD), communes aux pages FR et EN.
// Injectées par <JsonLd data={...} /> : Google, Bing et les moteurs de réponse les lisent pour
// savoir, sans ambiguïté, de quel lieu parle le site.
//
// Trois règles, tirées de l'audit de novembre 2026 :
//  1. Rien ici qui ne vienne de SITE ou de rates.json. Le code postal et la fourchette de prix
//     étaient recopiés à la main : ils ont fini faux tous les deux (33950, « 9 500 € »).
//  2. Un même lieu = un même @id sur toutes les pages et dans les deux langues, pour que les
//     moteurs fusionnent ce qu'ils lisent au lieu de voir plusieurs établissements.
//  3. Le bloc de base redit les faits de l'établissement publiés sur le site (adresse, prix,
//     équipements). Le détail — lits, équipements au vocabulaire de Google — n'est émis que
//     sur /la-villa/, la page qui les affiche un par un (`detail: 'full'`).
import { SITE } from './site';
import { currentSeason } from './season';
import type { Lang } from '../i18n/ui';
import { localizedPath } from '../i18n/ui';
import { formatPriceSpan } from '../lib/rates/summary';

const BASE = 'https://www.leszines.fr';
const pageUrl = (lang: Lang, slug = '') => `${BASE}${localizedPath(lang, slug)}`;

/** L'établissement (la location, et le contact pour la vente). */
export const VILLA_ID = `${BASE}/#villa`;
/** Le bâtiment lui-même : ce qu'on loue en entier, et ce qui est à vendre. */
export const HOUSE_ID = `${BASE}/#maison`;
export const WEBSITE_ID = `${BASE}/#website`;

const postalAddress = {
  '@type': 'PostalAddress',
  streetAddress: SITE.street,
  postalCode: SITE.postcode,
  addressLocality: SITE.city,
  addressRegion: 'Nouvelle-Aquitaine',
  addressCountry: 'FR',
};

// Position du 10 rue des Arbousiers dans la Base adresse nationale (5 décimales).
const geo = { '@type': 'GeoCoordinates', latitude: 44.65698, longitude: -1.24414 };

// Google demande au moins 8 photos pour une location de vacances, dont une chambre, une salle
// d'eau et une pièce commune. L'audit SEO vérifie que chaque fichier existe dans le build.
const photos = [
  '/photos/villa-jardin.webp',
  '/photos/villa/vie-cuisine/01.jpg',
  '/photos/villa/chambres/01.jpg',
  '/photos/villa/chambres/02.jpg',
  '/photos/villa/sdb/01.jpg',
  '/photos/villa/terrasses/01.jpg',
  '/photos/villa/jardin/01.jpg',
  '/photos/terrasse.webp',
  '/photos/jardin-1.webp',
  '/photos/nuit-2.webp',
].map((path) => `${BASE}${path}`);

// Les photos du carrousel de la page À vendre, dans le même ordre (AVendre.astro).
const salePhotos = [
  '/photos/villa-jardin.webp',
  '/photos/villa/vie-cuisine/01.jpg',
  '/photos/villa/chambres/01.jpg',
  '/photos/villa/terrasses/01.jpg',
  '/photos/villa/jardin/01.jpg',
  '/photos/nuit-2.webp',
  '/photos/plan.webp',
].map((path) => `${BASE}${path}`);

/** « 5 000 € – 9 900 € / semaine », déduit des semaines à venir du tableau des tarifs. */
function priceRange(lang: Lang): string | undefined {
  const summary = currentSeason();
  if (!summary) return undefined;
  return lang === 'fr' ? `${formatPriceSpan(summary, 'fr', ' ')} / semaine` : `${formatPriceSpan(summary, 'en')} per week`;
}

const contactPoint = (lang: Lang, contactType: 'reservations' | 'sales', slug: string) => ({
  '@type': 'ContactPoint',
  contactType,
  url: pageUrl(lang, slug),
  telephone: SITE.phoneIntl,
  email: SITE.email,
  availableLanguage: ['fr', 'en'],
});

type RentalPage = {
  /** Page qui émet le bloc, sans préfixe de langue ('' = accueil). */
  slug?: string;
  /** 'full' ajoute lits et équipements : réservé à la page qui les montre (/la-villa/). */
  detail?: 'core' | 'full';
};

export function vacationRentalSchema(lang: Lang, { slug = '', detail = 'core' }: RentalPage = {}) {
  const fr = lang === 'fr';
  const amenity = (frName: string, enName: string) => ({
    '@type': 'LocationFeatureSpecification',
    name: fr ? frName : enName,
    value: true,
  });
  // Équipements au vocabulaire fermé de Google (jetons anglais, quelle que soit la langue de
  // la page). Uniquement ceux que /la-villa/ affiche tels quels : pas d'accessibilité générale
  // (le site n'annonce qu'une chambre et une salle d'eau accessibles), pas de sèche-linge.
  const token = (name: string, value: boolean | string = true) => ({ '@type': 'LocationFeatureSpecification', name, value });
  const fullDetail = {
    bed: [
      { '@type': 'BedDetails', numberOfBeds: 6, typeOfBed: 'Queen' }, // six lits 160×200
      { '@type': 'BedDetails', numberOfBeds: 4, typeOfBed: 'Single' }, // dortoir : quatre lits 80×200
    ],
    amenityFeature: [token('ac'), token('wifi'), token('internetType', 'Free'), token('kitchen'), token('outdoorGrill'), token('patio')],
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    '@id': VILLA_ID,
    // Identifiant stable de l'annonce : Google s'en sert pour suivre un bien d'une visite à l'autre.
    identifier: 'villa-les-zines-cap-ferret',
    additionalType: 'Villa',
    name: SITE.name,
    // Une seule adresse pour l'établissement, dans les deux langues ; la page qui en parle
    // est dans mainEntityOfPage.
    url: `${BASE}/`,
    mainEntityOfPage: pageUrl(lang, slug),
    description: fr
      ? 'Grande villa en bois au cœur du Cap Ferret : 6 chambres climatisées + dortoir, 4 salles d’eau, pièce de vie de 60 m², jardin clos et arboré de 700 m². 12 à 16 personnes, location à la semaine (samedi → samedi) en été, courts séjours possibles hors saison.'
      : 'Large timber villa in the heart of Cap Ferret: 6 air-conditioned bedrooms + dorm, 4 bathrooms, 60 m² living space, walled 700 m² wooded garden. Sleeps 12 to 16, weekly rental (Saturday to Saturday) in summer, short off-season stays possible.',
    image: photos,
    logo: `${BASE}/photos/google/logo-les-zines-720.png`,
    address: postalAddress,
    geo,
    // L'autre présence officielle de la villa : sans ce lien, rien ne dit à un moteur que la
    // fiche Google (celle qui porte les avis) et ce site parlent du même lieu. Y ajouter un
    // profil seulement s'il est public, à jour et géré par le propriétaire.
    hasMap: SITE.mapsLink,
    sameAs: [SITE.mapsLink],
    telephone: SITE.phoneIntl,
    email: SITE.email,
    contactPoint: [contactPoint(lang, 'reservations', 'reservation'), contactPoint(lang, 'sales', 'contact')],
    priceRange: priceRange(lang),
    currenciesAccepted: 'EUR',
    knowsLanguage: ['fr', 'en'],
    amenityFeature: [
      amenity('Climatisation dans toute la maison', 'Air conditioning throughout'),
      amenity('Wifi fibre', 'Fibre wifi'),
      amenity('Jardin clos et arboré de 700 m²', 'Walled, wooded 700 m² garden'),
      amenity('Barbecue et terrasses en bois', 'Barbecue and wood-deck terraces'),
      amenity('Chambre et salle d’eau accessibles (PMR), de plain-pied', 'Ground-floor accessible bedroom and bathroom'),
      amenity('Lave-linge', 'Washing machine'),
    ],
    // Ce qu'on loue : la maison entière. Capacité, chambres et salles d'eau appartiennent au
    // logement (Accommodation), pas à l'établissement : c'est là que Google les attend.
    containsPlace: {
      '@type': 'Accommodation',
      '@id': HOUSE_ID,
      additionalType: 'EntirePlace',
      occupancy: { '@type': 'QuantitativeValue', value: SITE.sleepsMax },
      numberOfBedrooms: SITE.bedrooms,
      numberOfBathroomsTotal: SITE.bathrooms,
      ...(detail === 'full' ? fullDetail : {}),
    },
  };
}

/** Nom du site dans les résultats de recherche. Un seul par domaine : émis sur l'accueil. */
export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    alternateName: ['Les Zines', 'Villa Les Zines Cap Ferret'],
    url: `${BASE}/`,
    inLanguage: ['fr', 'en'],
    publisher: { '@id': VILLA_ID },
  };
}

/**
 * La vente : une annonce, une offre, la maison, et qui contacter.
 *
 * Aucun moteur n'a d'affichage dédié à l'immobilier ; ce bloc sert à ce qu'un moteur ou un
 * assistant comprenne sans deviner que CETTE maison, à CETTE adresse, est à vendre, et par
 * où passer. La maison et le contact gardent les mêmes @id que sur les pages de location.
 * Pas de prix (il est sur demande), pas de surface habitable ni d'année tant que le
 * propriétaire ne les a pas communiquées : mieux vaut un champ absent qu'un champ inventé.
 */
export function realEstateListingSchema(lang: Lang) {
  const fr = lang === 'fr';
  const url = pageUrl(lang, 'a-vendre');
  const offerId = `${url}#offre`;
  const property = (name: string, value: number | string, unitCode?: string) => ({
    '@type': 'PropertyValue',
    name,
    value,
    ...(unitCode ? { unitCode } : {}),
  });
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'RealEstateListing',
        '@id': `${url}#annonce`,
        url,
        inLanguage: lang,
        name: fr
          ? 'Villa Les Zines — villa en bois à vendre au Cap Ferret'
          : 'Villa Les Zines — timber villa for sale in Cap Ferret',
        description: fr
          ? 'Villa en bois « esprit Bassin » à vendre au cœur du Cap Ferret (Lège-Cap-Ferret, Gironde), à 400 m de la jetée Bélisaire : 8 pièces, 6 chambres + dortoir, 4 salles d’eau, terrain clos de 700 m², DPE C / GES B. Vente de gré à gré, prix sur demande, visites sur rendez-vous.'
          : 'Timber “esprit Bassin” villa for sale in the heart of Cap Ferret (Lège-Cap-Ferret, Gironde, France), 400 m from the Bélisaire jetty: 8 rooms, 6 bedrooms + dorm, 4 bathrooms, walled 700 m² plot, energy rating DPE C / GES B. Private sale, price on request, visits by appointment.',
        image: salePhotos[0],
        mainEntity: { '@id': HOUSE_ID },
        offers: { '@id': offerId },
        publisher: { '@id': VILLA_ID },
      },
      {
        '@type': 'Offer',
        '@id': offerId,
        url,
        name: fr ? 'Vente de la Villa Les Zines' : 'Sale of Villa Les Zines',
        description: fr
          ? 'Vente de gré à gré. Prix communiqué sur demande, visites sur rendez-vous.'
          : 'Private sale. Price on request, visits by appointment.',
        // Dit en toutes lettres qu'il s'agit d'une VENTE : la même maison est aussi louée.
        businessFunction: 'http://purl.org/goodrelations/v1#Sell',
        itemOffered: { '@id': HOUSE_ID },
        availability: 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'EUR',
          description: fr ? 'Prix sur demande' : 'Price on request',
        },
        seller: { '@id': VILLA_ID },
      },
      {
        '@type': 'House',
        '@id': HOUSE_ID,
        name: SITE.name,
        description: fr
          ? 'Villa en bois de 8 pièces au cœur du Cap Ferret : pièce de vie de 60 m², 6 chambres climatisées, grenier-dortoir, 4 salles d’eau, terrasses et terrain clos et arboré de 700 m².'
          : '8-room timber villa in the heart of Cap Ferret: 60 m² living space, 6 air-conditioned bedrooms, attic dorm, 4 bathrooms, terraces and a walled, wooded 700 m² plot.',
        numberOfRooms: 8,
        numberOfBedrooms: SITE.bedrooms,
        numberOfBathroomsTotal: SITE.bathrooms,
        additionalProperty: [
          property(fr ? 'Surface du terrain' : 'Plot size', SITE.garden, 'MTK'),
          property(fr ? 'DPE (classe énergie)' : 'Energy performance class (DPE)', 'C'),
          property(fr ? 'GES (classe climat)' : 'Greenhouse gas class (GES)', 'B'),
        ],
        address: postalAddress,
        geo,
        tourBookingPage: pageUrl(lang, 'contact'),
        image: salePhotos,
      },
      {
        '@type': 'Organization',
        '@id': VILLA_ID,
        name: SITE.name,
        url: `${BASE}/`,
        telephone: SITE.phoneIntl,
        email: SITE.email,
        contactPoint: contactPoint(lang, 'sales', 'contact'),
      },
    ],
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
