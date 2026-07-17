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
  // Google Maps, pinned on the exact address.
  mapsEmbed:
    'https://www.google.com/maps?q=10+rue+des+Arbousiers+33950+L%C3%A8ge-Cap-Ferret&output=embed',
  mapsLink: 'https://maps.google.com/?q=10+rue+des+Arbousiers+33950+L%C3%A8ge-Cap-Ferret',
  // Live Google Sheet (read server-side by /api/rates). New clean sheet 2026:
  // "Villa Les Zines — Tarifs & disponibilités 2026". Empty = local rates.json fallback.
  // NB: the sheet must be shared "Anyone with the link: Viewer" for this to load.
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
