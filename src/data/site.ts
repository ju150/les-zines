export const SITE = {
  name: 'Villa Les Zines',
  tagline_fr: 'Location de villa au Cap Ferret',
  tagline_en: 'Villa rental in Cap Ferret',
  phone: '07 66 42 33 32',
  phoneIntl: '+33766423332',
  // Même numéro, écrit pour un lecteur étranger : affiché sur les pages anglaises.
  phoneIntlDisplay: '+33 7 66 42 33 32',
  email: 'contact@leszines.fr',
  // Adresse postale. Le code postal est 33970 (Cap Ferret), PAS 33950 (Lège, le bourg) : la
  // commune en a deux. Le site a affiché 33950 jusqu'en novembre 2026, ce qui contredisait la
  // Base adresse nationale, la fiche Google et la fiche Bing — et, pour un géocodeur,
  // désignait le « 10 boulevard des Arbousiers », à 4,7 km de la villa. L'audit SEO refuse
  // désormais tout build où « 33950 » réapparaît.
  street: '10 rue des Arbousiers',
  postcode: '33970',
  city: 'Lège-Cap-Ferret',
  addressLine: '10 rue des Arbousiers, 33970 Lège-Cap-Ferret',
  bedrooms: 6,
  sleeps: '12–16',
  sleepsMax: 16,
  garden: 700,
  bathrooms: 4,
  montuzetUrl: 'https://www.montuzet.fr',
  // Google Maps, the "Villa Les Zines" place. t=k = satellite view, z=18 = close aerial.
  mapsEmbed:
    'https://www.google.com/maps?q=Villa+Les+Zines%2C+Cap+Ferret&t=k&z=18&output=embed',
  // La fiche de l'établissement elle-même (identifiant `cid`), pas une recherche : c'est elle
  // qui porte les avis et les photos, et c'est l'adresse à déclarer aux moteurs (sameAs).
  mapsLink: 'https://www.google.com/maps?cid=14975140690006077259',
  // Pas de page Facebook ici, volontairement : celle de la villa (…/people/Villa-Les-Zines-
  // Cap-Ferret/100064056032732/) n'est plus accessible depuis au moins novembre 2026. Ne la
  // déclarer comme profil officiel (sameAs, llms.txt) que si elle est rouverte et tenue à jour.
  // Film « 11 villages, 1 presqu'île » de la Ville de Lège-Cap Ferret (vœux 2026, 2 min 31),
  // chaîne YouTube officielle de la commune. Affiché sur la page Le Cap Ferret.
  capFilmYoutubeId: 'GzIBkvQPsok',
  // La feuille Google des tarifs n'est pas ici : son adresse est le secret RATES_SHEET_CSV_URL
  // (lisible par quiconque a le lien, elle ne doit pas être publiée). Voir src/lib/rates/load.ts.
} as const;

// Navigation shown in the header (montuzet + à-vendre live in the footer / secondary).
export const NAV = [
  { key: 'nav_villa', slug: 'la-villa' },
  { key: 'nav_jardin', slug: 'le-jardin' },
  { key: 'nav_loc', slug: 'le-cap-ferret' },
  { key: 'nav_rates', slug: 'sejours-tarifs' },
  { key: 'nav_contact', slug: 'contact' },
] as const;
