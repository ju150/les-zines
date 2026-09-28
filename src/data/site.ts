export const SITE = {
  name: 'Villa Les Zines',
  tagline_fr: 'Location de villa au Cap Ferret',
  tagline_en: 'Villa rental in Cap Ferret',
  phone: '07 66 42 33 32',
  phoneIntl: '+33766423332',
  email: 'contact@leszines.fr',
  // Postal address
  street: '10 rue des Arbousiers',
  postcode: '33950',
  city: 'Lège-Cap-Ferret',
  addressLine: '10 rue des Arbousiers, 33950 Lège-Cap-Ferret',
  bedrooms: 6,
  sleeps: '12–16',
  garden: 700,
  bathrooms: 4,
  montuzetUrl: 'https://www.montuzet.fr',
  // Google Maps, the "Villa Les Zines" place. t=k = satellite view, z=18 = close aerial.
  mapsEmbed:
    'https://www.google.com/maps?q=Villa+Les+Zines%2C+Cap+Ferret&t=k&z=18&output=embed',
  mapsLink: 'https://maps.google.com/?q=Villa+Les+Zines+Cap+Ferret',
  // Film « 11 villages, 1 presqu'île » de la Ville de Lège-Cap Ferret (vœux 2026, 2 min 31),
  // chaîne YouTube officielle de la commune. Affiché sur la page Le Cap Ferret.
  capFilmYoutubeId: 'GzIBkvQPsok',
  // Feuille Google « Tarifs & disponibilités — Villa Les Zines (2026-2027) », lue côté
  // serveur par /api/rates. Colonnes : Arrivée, Départ, Prix, Disponibilité, Zones, Afficher.
  // Doit être partagée « Tout le monde avec le lien : Lecteur ». Sinon → repli rates.json.
  ratesSheetCsv:
    'https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID/gviz/tq?tqx=out:csv',
} as const;

// Navigation shown in the header (montuzet + à-vendre live in the footer / secondary).
export const NAV = [
  { key: 'nav_villa', slug: 'la-villa' },
  { key: 'nav_jardin', slug: 'le-jardin' },
  { key: 'nav_loc', slug: 'le-cap-ferret' },
  { key: 'nav_rates', slug: 'sejours-tarifs' },
  { key: 'nav_contact', slug: 'contact' },
] as const;
