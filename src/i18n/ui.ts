export const languages = { fr: 'FR', en: 'EN' } as const;
export const defaultLang = 'fr';
export type Lang = keyof typeof languages;

/**
 * Build a locale-aware path. slug '' → home.
 * Toujours avec slash final : les pages sont générées en dossiers (`/la-villa/index.html`)
 * et le serveur répond « /la-villa » → 301 → « /la-villa/ ». Un lien sans slash ferait donc faire un
 * aller-retour 301 au visiteur ET à Googlebot (rapport « Page avec redirection » en
 * Search Console). Le slash final est l'URL canonique déclarée dans Base.astro.
 */
export function localizedPath(lang: Lang, slug = ''): string {
  const base = lang === 'fr' ? '' : '/en';
  if (!slug) return `${base}/`;
  return `${base}/${slug}/`;
}

export function getLangFromUrl(url: URL): Lang {
  const [, seg] = url.pathname.split('/');
  return seg === 'en' ? 'en' : 'fr';
}

export const ui = {
  fr: {
    //, , , Nav / global, , , 
    nav_villa: 'La Villa',
    nav_jardin: 'Le Jardin',
    nav_loc: 'Le Cap Ferret',
    nav_rates: 'Séjours & Tarifs',
    nav_contact: 'Contact',
    nav_book: 'Réserver',
    nav_montuzet: 'Le Chai de Montuzet',
    nav_sale: 'À vendre',
    skip: 'Aller au contenu',

    //, , , Hero (location-first), , , 
    hero_tag: 'Location de villa',
    hero_eyebrow: 'Cap Ferret · Bassin d’Arcachon',
    hero_h1: 'La Villa Les Zines,<br>votre maison de vacances au Cap Ferret.',
    hero_sub: 'Une villa en bois de 12 à 16 personnes, jardin arboré de 700 m², à quelques minutes de la jetée Bélisaire et des plages. En location à la semaine l’été, courts séjours possibles hors saison.',
    hero_cta1: 'Voir les disponibilités',
    hero_cta2: 'La découvrir',
    scroll: 'Découvrir',
    stat_guests: 'personnes',
    stat_rooms: 'chambres + dortoir',
    stat_garden: 'de jardin clos',
    stat_baths: 'salles d’eau',

    //, , , Intro, , , 
    intro_eyebrow: 'Bienvenue',
    intro_h: 'Le confort d’une maison, l’âme du Bassin.',
    intro_p: 'Nichée au cœur du Cap Ferret, la Villa Les Zines réunit famille et amis dans une grande maison en bois “esprit Bassin”. Six chambres climatisées, une vaste pièce de vie ouverte sur les terrasses et un jardin de pins de 700 m² : tout est pensé pour des vacances simples et joyeuses, à deux pas de l’océan et du village.',

    //, , , Home teasers, , , 
    t_villa_eye: 'La Villa',
    t_villa_h: 'Six chambres, de grandes tablées.',
    t_villa_p: 'Une pièce de vie de 60 m² ouverte sur la terrasse, six chambres climatisées et un grenier-dortoir pour les enfants.',
    t_jardin_eye: 'Le Jardin',
    t_jardin_h: '700 m² de pins, d’ombre et de soleil.',
    t_jardin_p: 'Un jardin clos et arboré, plusieurs terrasses en bois, barbecue, transats et hamacs.',
    t_loc_eye: 'Le Cap Ferret',
    t_loc_h: 'Le meilleur du Cap, à pied ou à vélo.',
    t_loc_p: 'La jetée Bélisaire, le marché, les plages de l’océan et du Bassin, les cabanes à huîtres : tout est à quelques minutes.',
    discover: 'Découvrir',

    //, , , Rates teaser, , , 
    rate_eye: 'Séjours & disponibilités',
    rate_h: 'Location à la semaine, du samedi au samedi.',
    rate_p: 'Consultez les semaines disponibles et faites votre demande. Courts séjours possibles hors saison.',
    rate_cta: 'Voir les tarifs & réserver',

    //, , , Sale (discreet), , , 
    sale_eye: 'À vendre',
    sale_h: 'La villa est aussi à vendre.',
    sale_p: 'Nous transmettons ce lieu de famille. Une visite vous tente, ou vous souhaitez en savoir plus ? Écrivons-nous, en toute discrétion.',
    sale_cta: 'Demander une visite',
    sale_price: 'Prix sur demande',

    //, , , Montuzet, , , 
    mont_eye: 'À découvrir aussi, en famille',
    mont_h: 'Le Chai de Montuzet',
    mont_p: 'Séjournez dans un chai bordelais rénové, à la campagne : trois chambres et une piscine.',
    mont_cta: 'Visiter Montuzet',

    //, , , Footer, , , 
    foot_tagline: 'Location de villa au Cap Ferret · à la semaine',
    foot_nav: 'Navigation',
    foot_contact: 'Contact',
    foot_legal: 'Mentions légales',
    foot_rights: 'Tous droits réservés',
    foot_sale_line: 'Villa à vendre, prix sur demande',

    //, , , Common, , , 
    phone_label: 'Téléphone',
    email_label: 'Email',
    available: 'Disponible',
    booked: 'Déjà loué',
    ask: 'Demander',
    waitlist: 'Liste d’attente',
    per_week: 'sem.',
    on_request: 'Sur demande',
  },

  en: {
    nav_villa: 'The Villa',
    nav_jardin: 'The Garden',
    nav_loc: 'Cap Ferret',
    nav_rates: 'Stays & Rates',
    nav_contact: 'Contact',
    nav_book: 'Book',
    nav_montuzet: 'Le Chai de Montuzet',
    nav_sale: 'For sale',
    skip: 'Skip to content',

    hero_tag: 'Villa rental',
    hero_eyebrow: 'Cap Ferret · Arcachon Bay',
    hero_h1: 'Villa Les Zines,<br>your holiday home in Cap Ferret.',
    hero_sub: 'A timber villa sleeping 12 to 16, a 700 m² wooded garden, minutes from the Bélisaire jetty and the beaches. Weekly in summer, short stays possible off-season.',
    hero_cta1: 'Check availability',
    hero_cta2: 'Discover it',
    scroll: 'Scroll',
    stat_guests: 'guests',
    stat_rooms: 'bedrooms + dorm',
    stat_garden: 'walled garden',
    stat_baths: 'bathrooms',

    intro_eyebrow: 'Welcome',
    intro_h: 'The comfort of a home, the soul of the Bay.',
    intro_p: 'In the heart of Cap Ferret, Villa Les Zines brings family and friends together in a large timber “esprit Bassin” house. Six air-conditioned bedrooms, a vast living space opening onto the terraces and a 700 m² pine garden: everything is made for simple, joyful holidays, steps from the ocean and the village.',

    t_villa_eye: 'The Villa',
    t_villa_h: 'Six bedrooms, big gatherings.',
    t_villa_p: 'A 60 m² living space opening onto the terrace, six air-conditioned bedrooms and an attic dorm for the children.',
    t_jardin_eye: 'The Garden',
    t_jardin_h: '700 m² of pines, shade and sun.',
    t_jardin_p: 'A walled, tree-lined garden, several wood terraces, barbecue, sun loungers and hammocks.',
    t_loc_eye: 'Cap Ferret',
    t_loc_h: 'The best of the Cap, on foot or by bike.',
    t_loc_p: 'The Bélisaire jetty, the market, the ocean and Bay beaches, the oyster huts: all a few minutes away.',
    discover: 'Discover',

    rate_eye: 'Stays & availability',
    rate_h: 'Weekly rental, Saturday to Saturday.',
    rate_p: 'See the available weeks and send your request. Short stays possible off-season.',
    rate_cta: 'See rates & book',

    sale_eye: 'For sale',
    sale_h: 'The villa is also for sale.',
    sale_p: 'We are passing on this family place. Would you like a visit, or to know more? Let’s talk, discreetly.',
    sale_cta: 'Request a visit',
    sale_price: 'Price on request',

    mont_eye: 'Also worth discovering, the family',
    mont_h: 'Le Chai de Montuzet',
    mont_p: 'Stay in a renovated Bordeaux wine cellar in the countryside: three rooms and a pool.',
    mont_cta: 'Visit Montuzet',

    foot_tagline: 'Villa rental in Cap Ferret · by the week',
    foot_nav: 'Navigation',
    foot_contact: 'Contact',
    foot_legal: 'Legal notice',
    foot_rights: 'All rights reserved',
    foot_sale_line: 'Villa for sale, price on request',

    phone_label: 'Phone',
    email_label: 'Email',
    available: 'Available',
    booked: 'Booked',
    ask: 'Enquire',
    waitlist: 'Waitlist',
    per_week: 'wk',
    on_request: 'On request',
  },
} as const;

export type UIKey = keyof (typeof ui)['fr'];

export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return (ui[lang] as Record<string, string>)[key] ?? (ui.fr as Record<string, string>)[key] ?? key;
  };
}
