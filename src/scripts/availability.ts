// Shared availability-table renderer. Returns an HTML string so the SAME markup is used
// both server-side (Astro set:html) and client-side (innerHTML after fetching /api/rates).
//
// A week is described by two real dates only — arrival + departure. Everything else
// (mois affiché, format des dates, zones de vacances, semaine passée ou non) est déduit
// par le code. La feuille Google reste donc ultra-simple : Arrivée, Départ, Prix, Dispo.

export type Week = {
  /** Date d'arrivée, ISO 'YYYY-MM-DD'. */
  start: string;
  /** Date de départ, ISO 'YYYY-MM-DD'. */
  end: string;
  price: number;
  /** 'available' (disponible) | 'booked' (loué) | 'unavailable' (indisponible). */
  status: string;
  /**
   * Zones scolaires (A/B/C).
   * - absent (undefined) → déduites automatiquement des vacances françaises ;
   * - tableau vide ([])  → « aucune zone », choix explicite de la feuille, pas de déduction.
   */
  zones?: string[];
  /** false = masquée manuellement (case « afficher » décochée dans la feuille). */
  show?: boolean;
};

/** Les trois valeurs de `status`, ramenées à ce qui change à l'écran. */
export type WeekKind = 'free' | 'booked' | 'unavail';
export const weekKind = (w: Week): WeekKind =>
  w.status === 'available' ? 'free' : w.status === 'unavailable' ? 'unavail' : 'booked';

// Noms de classes écrits EN TOUTES LETTRES, jamais assemblés (`av-${kind}`) : Tailwind
// scanne les fichiers sources et supprime de la feuille de style toute classe @layer
// components qu'il n'y trouve pas telle quelle. Une classe construite à la volée existe
// dans le HTML mais plus dans le CSS — la ligne s'affiche alors sans aucun style.
const KIND_CLASS: Record<WeekKind, { row: string; badge: string }> = {
  free: { row: 'av-free', badge: 'badge-free' },
  booked: { row: 'av-booked', badge: 'badge-booked' },
  unavail: { row: 'av-unavail', badge: 'badge-unavail' },
};

export interface AvailabilityOpts {
  mode: 'links' | 'select';
  lang?: string;
  reservationBase?: string;
  onlyAvailable?: boolean;
}

const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/**
 * Base du lien « Réserver », slash final garanti : « /reservation/#week=… ».
 * Sans le slash, Netlify 301 vers la forme avec slash — un aller-retour inutile
 * pour le visiteur et pour Googlebot.
 *
 * La semaine voyage dans le FRAGMENT (#), pas dans la query (?). Une query crée une URL
 * distincte que Googlebot explore puis range en « Autre page avec balise canonique
 * correcte » — une par semaine disponible, dans les deux langues, signalée à chaque fois
 * dans la Search Console. Un fragment n'est jamais envoyé au serveur : Google ne voit
 * qu'une seule /reservation/. Côté navigateur, la lecture est identique.
 */
const resBase = (opts: AvailabilityOpts) => {
  const base = opts.reservationBase || '/reservation';
  return base.endsWith('/') ? base : base + '/';
};

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 'YYYY-MM-DD' → Date à minuit local (tolère aussi JJ/MM/AAAA en secours). */
function parseISO(s: string): Date | null {
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(s);
  if (m) { const y = Number(m[3]); return new Date(y < 100 ? y + 2000 : y, Number(m[2]) - 1, Number(m[1])); }
  return null;
}

function weekDates(w: Week): { start: Date; end: Date } | null {
  const start = parseISO(w.start);
  const end = parseISO(w.end);
  return start && end ? { start, end } : null;
}

const ddmmyyyy = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

// Numéro de semaine ISO (norme française), calculé sur la date de DÉPART pour coller à la
// numérotation habituelle de la villa (semaine du 18/07 → départ 25/07 → S30).
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7; // lundi = 0
  t.setUTCDate(t.getUTCDate() - day + 3); // jeudi de la semaine
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const fDay = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fDay + 3);
  return 1 + Math.round((t.getTime() - firstThu.getTime()) / (7 * 86400000));
}

// Zones scolaires déduites des vacances françaises « toutes zones » (été, Toussaint, Noël)
// — les seules stables d'une année sur l'autre. Une semaine qui les chevauche affiche A/B/C.
// (Les vacances d'hiver/printemps, propres à chaque zone, sont à saisir dans la feuille ;
//  une semaine hors vacances s'y note « - » et arrive ici avec zones = [].)
//
// Il faut au moins 3 nuits DANS les vacances : une semaine qui ne mord que d'un jour ou deux
// (26 juin → 3 juillet) n'est pas une semaine de vacances scolaires et ne doit pas afficher A B C.
// (Plafonné à la durée du séjour, pour qu'un court séjour de 2 nuits en plein août compte aussi.)
const MIN_HOLIDAY_NIGHTS = 3;

function autoZones(start: Date, end: Date): string[] {
  const stay = Math.round((end.getTime() - start.getTime()) / 86400000);
  const needed = Math.max(1, Math.min(MIN_HOLIDAY_NIGHTS, stay));
  const nightsInside = (ws: Date, we: Date) => {
    const from = Math.max(start.getTime(), ws.getTime());
    const to = Math.min(end.getTime(), we.getTime());
    return to > from ? Math.round((to - from) / 86400000) : 0;
  };
  // On regarde l'année de début, l'année de fin et l'année précédente (Noël déborde sur janvier).
  for (const y of new Set([start.getFullYear() - 1, start.getFullYear(), end.getFullYear()])) {
    const nights = Math.max(
      nightsInside(new Date(y, 6, 1), new Date(y, 8, 1)), // été (juillet-août)
      nightsInside(new Date(y, 9, 15), new Date(y, 10, 5)), // Toussaint
      nightsInside(new Date(y, 11, 18), new Date(y + 1, 0, 6)), // Noël (→ début janvier)
    );
    if (nights >= needed) return ['A', 'B', 'C'];
  }
  return [];
}

// Une semaine est « passée » dès que sa date de départ est atteinte : elle ne peut plus
// être louée, donc on ne l'affiche plus. Rendu côté client à chaque chargement → le
// filtrage suit la vraie date du visiteur (le SSR figé au build est corrigé par le fetch
// de /api/rates). Sans dates lisibles → jamais masquée (prudence).
function isPastWeek(w: Week, today: Date): boolean {
  const d = weekDates(w);
  return d ? d.end.getTime() <= today.getTime() : false;
}

export function renderAvailability(weeks: Week[], opts: AvailabilityOpts): string {
  const fr = (opts.lang ?? 'fr') === 'fr';
  const months = fr ? MONTHS_FR : MONTHS_EN;
  const euro = (n: number) => Number(n).toLocaleString(fr ? 'fr-FR' : 'en-GB');
  const weekday = (d: Date) => d.toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { weekday: 'long' });

  // « 1er » en français pour le premier du mois.
  const day = (d: Date) => (fr && d.getDate() === 1 ? '1er' : String(d.getDate()));
  // Libellé humain « 18 → 25 juillet 2026 » (même mois) ou « 29 août → 5 septembre 2026 ».
  const humanRange = (s: Date, e: Date) => {
    const y = s.getFullYear() === e.getFullYear() ? ` ${e.getFullYear()}` : '';
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
      return `${day(s)} → ${day(e)} ${months[e.getMonth()]}${y}`;
    if (s.getFullYear() === e.getFullYear())
      return `${day(s)} ${months[s.getMonth()]} → ${day(e)} ${months[e.getMonth()]}${y}`;
    return `${day(s)} ${months[s.getMonth()]} ${s.getFullYear()} → ${day(e)} ${months[e.getMonth()]} ${e.getFullYear()}`;
  };

  // Valeur transmise (e-mail au propriétaire + lien #week=) : dates explicites, sans ambiguïté.
  const weekValue = (w: Week) => {
    const d = weekDates(w);
    if (!d) return fr ? 'Semaine (dates à préciser)' : 'Week (dates to confirm)';
    return fr
      ? `Semaine du ${ddmmyyyy(d.start)} au ${ddmmyyyy(d.end)}`
      : `Week of ${ddmmyyyy(d.start)} to ${ddmmyyyy(d.end)}`;
  };

  const t = {
    available: fr ? 'Disponible' : 'Available',
    booked: fr ? 'Déjà loué' : 'Booked',
    unavail: fr ? 'Indisponible' : 'Unavailable',
    book: fr ? 'Réserver' : 'Book',
    perweek: fr ? 'sem.' : 'wk',
    onrequest: fr ? 'Sur demande' : 'On request',
    h_week: fr ? 'Semaine' : 'Week',
    h_zone: fr ? 'Zone de vacances scolaire' : 'School holiday area',
    h_price: fr ? 'Prix' : 'Price',
    h_status: fr ? 'Disponibilité' : 'Availability',
  };
  const head =
    `<div class="av-head"><div>${t.h_week}</div><div>${t.h_zone}</div><div class="av-head-price">${t.h_price}</div><div>${t.h_status}</div><div></div></div>`;

  // Filtre : masquées manuellement (show=false) OU passées (départ atteint, date du visiteur).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = weeks.filter((w) => w.show !== false && weekDates(w) && !isPastWeek(w, today));
  const list = opts.onlyAvailable ? current.filter((w) => w.status === 'available') : current;

  // Regroupement par mois d'arrivée (dans l'ordre chronologique des semaines).
  const monthKey = (w: Week) => {
    const d = weekDates(w)!;
    return `${d.start.getFullYear()}-${d.start.getMonth()}`;
  };
  const monthLabel = (w: Week) => {
    const d = weekDates(w)!;
    return months[d.start.getMonth()];
  };
  const orderedKeys: string[] = [];
  for (const w of list) { const k = monthKey(w); if (!orderedKeys.includes(k)) orderedKeys.push(k); }

  const statusLabel = (w: Week) => ({ free: t.available, booked: t.booked, unavail: t.unavail }[weekKind(w)]);

  // Semaine louée ou indisponible : le prix reste affiché, barré. Il donne au visiteur une idée
  // du tarif pratiqué sur cette période sans laisser croire que la semaine est réservable.
  //
  // Le « / sem. » reste volontairement HORS du <s> : il est composé dans une autre police
  // et deux tailles en dessous, or chaque boîte inline trace la barre à la hauteur de SA
  // propre police. Barré avec le montant, le trait décrochait de 5 px sur le suffixe — on
  // lisait deux traits au lieu d'un. On barre donc le montant seul, comme un prix soldé.
  const priceCell = (w: Week) => {
    const free = w.status === 'available';
    if (!(w.price > 0)) return free ? `<span class="av-req">${t.onrequest}</span>` : '<span class="av-nozone">—</span>';
    const amount = `${euro(w.price)} €`;
    const unit = `<small> / ${t.perweek}</small>`;
    return (free ? amount : `<s class="av-was" title="${statusLabel(w)}">${amount}</s>`) + unit;
  };
  // zones absent → déduction automatique ; zones = [] → « aucune » demandé dans la feuille.
  const zonesCell = (w: Week) => {
    const d = weekDates(w)!;
    const zones = w.zones ?? autoZones(d.start, d.end);
    return zones.length
      ? zones.map((z) => `<span class="zone zone-${esc(z.toLowerCase())}">${esc(z)}</span>`).join('')
      : '<span class="av-nozone">—</span>';
  };

  const inner = (w: Week) => {
    const d = weekDates(w)!;
    const nights = Math.round((d.end.getTime() - d.start.getTime()) / 86400000);
    const wk = `${fr ? 'S' : 'W'}${isoWeek(d.end)}`;
    const sub = `${wk} · ${weekday(d.start)} → ${weekday(d.end)} · ${nights} ${fr ? (nights > 1 ? 'nuits' : 'nuit') : nights > 1 ? 'nights' : 'night'}`;
    return `
    <div class="av-c av-dates"><span class="av-label">${esc(humanRange(d.start, d.end))}</span><span class="av-sub">${esc(sub)}</span></div>
    <div class="av-c av-zones" title="${fr ? 'Zones scolaires' : 'French school holiday areas'}">${zonesCell(w)}</div>
    <div class="av-c av-price">${priceCell(w)}</div>
    <div class="av-c av-status"><span class="badge ${KIND_CLASS[weekKind(w)].badge}">${statusLabel(w)}</span></div>`;
  };

  const row = (w: Week) => {
    const cls = KIND_CLASS[weekKind(w)].row;
    if (opts.mode === 'select') {
      // Cases à cocher : les clients demandent souvent plusieurs semaines consécutives.
      // Seules les semaines disponibles sont cochables (louées ET indisponibles exclues).
      return w.status === 'available'
        ? `<label class="av-row av-free av-pick">${inner(w)}<div class="av-c av-action"><input type="checkbox" name="week" value="${esc(weekValue(w))}" class="sr-only" /><span class="av-radio" aria-hidden="true"></span></div></label>`
        : `<div class="av-row ${cls}">${inner(w)}<div class="av-c av-action"></div></div>`;
    }
    return `<div class="av-row ${cls}">${inner(w)}<div class="av-c av-action">${
      w.status === 'available'
        ? `<a href="${resBase(opts)}#week=${encodeURIComponent(weekValue(w))}" class="btn btn-primary av-btn">${t.book}</a>`
        : ''
    }</div></div>`;
  };

  if (!list.length) {
    return `<div class="av-empty px-5 py-6 text-center">${
      fr
        ? 'Toutes les semaines de la saison sont louées. Contactez-nous pour un court séjour hors saison ou la liste d’attente.'
        : 'Every week of the season is booked. Contact us for a short off-season stay or the waiting list.'
    }</div>`;
  }

  // Le tableau couvre maintenant deux saisons (2026 ET 2027) : sans repère, « juillet » de
  // l'une et « juillet » de l'autre se ressemblent trop. Dès que plusieurs années sont
  // listées, on intercale un bandeau d'année et on rappelle l'année à droite de chaque mois.
  const yearOf = (w: Week) => weekDates(w)!.start.getFullYear();
  const multiYear = new Set(list.map(yearOf)).size > 1;

  let shownYear: number | null = null;
  const blocks = orderedKeys.map((k) => {
    const weeksOfMonth = list.filter((w) => monthKey(w) === k);
    const y = yearOf(weeksOfMonth[0]);
    const band = multiYear && y !== shownYear ? `<div class="av-year">${y}</div>` : '';
    shownYear = y;
    const yearTag = multiYear ? `<span class="av-month-year">${y}</span>` : '';
    return `${band}<div class="av-month"><span>${esc(monthLabel(weeksOfMonth[0]))}</span>${yearTag}</div>${weeksOfMonth.map(row).join('')}`;
  });

  return head + blocks.join('');
}
