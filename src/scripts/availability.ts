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
  status: string; // 'available' | 'booked'
  /** Zones scolaires (A/B/C). Absent → déduites automatiquement (été = toutes zones). */
  zones?: string[];
  /** Identifiant d'affichage optionnel (ex. « S30 »). Non requis. */
  id?: string;
};

export interface AvailabilityOpts {
  mode: 'links' | 'select';
  lang?: string;
  reservationBase?: string;
  onlyAvailable?: boolean;
}

const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

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

// Zones scolaires déduites : les grandes vacances (juillet-août) concernent toutes les
// zones (A, B et C). Une semaine qui les chevauche affiche donc A/B/C ; hors été, aucune.
function autoZones(start: Date, end: Date): string[] {
  const y = start.getFullYear();
  const summerStart = new Date(y, 6, 1); // 1er juillet
  const summerEnd = new Date(y, 8, 1); // 1er septembre
  return start < summerEnd && end > summerStart ? ['A', 'B', 'C'] : [];
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

  // Valeur transmise (e-mail au propriétaire + lien ?week=) : dates explicites, sans ambiguïté.
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

  // Filtre les semaines passées (départ atteint), à la date du visiteur.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = weeks.filter((w) => weekDates(w) && !isPastWeek(w, today));
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

  const priceCell = (w: Week) =>
    w.price > 0 ? `${euro(w.price)} €<small> / ${t.perweek}</small>` : `<span class="av-req">${t.onrequest}</span>`;
  const zonesCell = (w: Week) => {
    const d = weekDates(w)!;
    const zones = w.zones && w.zones.length ? w.zones : autoZones(d.start, d.end);
    return zones.length
      ? zones.map((z) => `<span class="zone zone-${esc(z.toLowerCase())}">${esc(z)}</span>`).join('')
      : '<span class="av-nozone">—</span>';
  };

  const inner = (w: Week) => {
    const d = weekDates(w)!;
    const nights = Math.round((d.end.getTime() - d.start.getTime()) / 86400000);
    const sub = `${weekday(d.start)} → ${weekday(d.end)} · ${nights} ${fr ? (nights > 1 ? 'nuits' : 'nuit') : nights > 1 ? 'nights' : 'night'}`;
    return `
    <div class="av-c av-dates"><span class="av-label">${esc(humanRange(d.start, d.end))}</span><span class="av-sub">${esc(sub)}</span></div>
    <div class="av-c av-zones" title="${fr ? 'Zones scolaires' : 'French school holiday areas'}">${zonesCell(w)}</div>
    <div class="av-c av-price">${w.status === 'available' ? priceCell(w) : '<span class="av-nozone">—</span>'}</div>
    <div class="av-c av-status"><span class="badge ${w.status === 'available' ? 'badge-free' : 'badge-booked'}">${w.status === 'available' ? t.available : t.booked}</span></div>`;
  };

  const row = (w: Week) => {
    if (opts.mode === 'select') {
      // Cases à cocher : les clients demandent souvent plusieurs semaines consécutives.
      return w.status === 'available'
        ? `<label class="av-row av-free av-pick">${inner(w)}<div class="av-c av-action"><input type="checkbox" name="week" value="${esc(weekValue(w))}" class="sr-only" /><span class="av-radio" aria-hidden="true"></span></div></label>`
        : `<div class="av-row av-booked">${inner(w)}<div class="av-c av-action"></div></div>`;
    }
    return `<div class="av-row ${w.status === 'available' ? 'av-free' : 'av-booked'}">${inner(w)}<div class="av-c av-action">${
      w.status === 'available'
        ? `<a href="${opts.reservationBase || '/reservation'}?week=${encodeURIComponent(weekValue(w))}" class="btn btn-primary av-btn">${t.book}</a>`
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

  return head + orderedKeys
    .map((k) => {
      const weeksOfMonth = list.filter((w) => monthKey(w) === k);
      return `<div class="av-month">${esc(monthLabel(weeksOfMonth[0]))}</div>${weeksOfMonth.map(row).join('')}`;
    })
    .join('');
}
