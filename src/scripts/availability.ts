// Shared availability-table renderer. Returns an HTML string so the SAME markup is used
// both server-side (Astro set:html) and client-side (innerHTML after fetching /api/rates).

export type Week = {
  id: string;
  month: string;
  label: string;
  price: number;
  status: string;
  zones?: string[];
  /** Année de la saison (extraite des en-têtes de la feuille, ex. « MOIS JUILLET 2026 »). */
  year?: number;
};

export interface AvailabilityOpts {
  mode: 'links' | 'select';
  lang?: string;
  reservationBase?: string;
  onlyAvailable?: boolean;
}

const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// Sheet data is French; translate what we display on the EN pages.
const MONTHS_EN: Record<string, string> = {
  janvier: 'January', février: 'February', mars: 'March', avril: 'April', mai: 'May', juin: 'June',
  juillet: 'July', août: 'August', septembre: 'September', octobre: 'October', novembre: 'November', décembre: 'December',
};

const MONTH_IDX: Record<string, number> = {
  janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
};

// Real calendar dates of a "sam. X → sam. Y" week. The sheet's month grouping is loose
// (S27 sits under "juillet" but starts Sat June 27): resolve the month where the start
// day actually falls on a Saturday, looking at the hinted month ± 1.
function weekDates(w: Week): { start: Date; end: Date } | null {
  if (!w.year) return null;
  const m = w.label.match(/(\d{1,2})\D+(\d{1,2})/);
  const hint = MONTH_IDX[(w.month || '').toLowerCase()];
  if (!m || hint === undefined) return null;
  const startDay = Number(m[1]);
  for (const cand of [hint, hint - 1, hint + 1]) {
    const d = new Date(w.year, cand, startDay);
    if (d.getDay() === 6 && d.getDate() === startDay) {
      return { start: d, end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7) };
    }
  }
  return null;
}

const ddmmyyyy = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

// Une semaine est « passée » dès que son samedi de départ est atteint : elle ne peut
// plus être louée, donc on ne l'affiche plus. Rendu côté client à chaque chargement →
// le filtrage suit la vraie date du visiteur (le SSR, figé au build, est corrigé par le
// fetch de /api/rates). Sans date calculable → jamais masquée (prudence).
function isPastWeek(w: Week, today: Date): boolean {
  const d = weekDates(w);
  return d ? d.end.getTime() <= today.getTime() : false;
}

export function renderAvailability(weeks: Week[], opts: AvailabilityOpts): string {
  const fr = (opts.lang ?? 'fr') === 'fr';
  const euro = (n: number) => Number(n).toLocaleString(fr ? 'fr-FR' : 'en-GB');
  const trMonth = (m: string) => (fr ? m : MONTHS_EN[m.toLowerCase()] ?? m);
  const trLabel = (l: string) => (fr ? l : l.replace(/sam\./g, 'Sat'));
  // Sous-ligne « S31 · 25/07/2026 → 01/08/2026 » (repli sans année : « S31 · sam. → sam. »)
  const datesStr = (w: Week) => {
    const d = weekDates(w);
    return d ? `${ddmmyyyy(d.start)} → ${ddmmyyyy(d.end)}` : fr ? 'sam. → sam.' : 'Sat → Sat';
  };
  // Checkbox value AND ?week= link value — also what lands in the owner's email, so
  // make it unambiguous: week number + full dates.
  const weekValue = (w: Week) => {
    const d = weekDates(w);
    return d
      ? `${w.id} · ${ddmmyyyy(d.start)} → ${ddmmyyyy(d.end)}`
      : `${w.id} · ${trLabel(w.label)} (${trMonth(w.month)})`;
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
  // Column header row (desktop only; mobile uses the card layout + the legend below the table).
  const head =
    `<div class="av-head"><div>${t.h_week}</div><div>${t.h_zone}</div><div class="av-head-price">${t.h_price}</div><div>${t.h_status}</div><div></div></div>`;
  // Masque les semaines dont le départ est atteint (minuit, date du visiteur).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = weeks.filter((w) => !isPastWeek(w, today));
  const list = opts.onlyAvailable ? current.filter((w) => w.status === 'available') : current;
  const months = [...new Set(list.map((w) => w.month))];

  const priceCell = (w: Week) =>
    w.price > 0 ? `${euro(w.price)} €<small> / ${t.perweek}</small>` : `<span class="av-req">${t.onrequest}</span>`;
  const zonesCell = (w: Week) =>
    w.zones && w.zones.length
      ? w.zones.map((z) => `<span class="zone zone-${esc(z.toLowerCase())}">${esc(z)}</span>`).join('')
      : '<span class="av-nozone">—</span>';

  const inner = (w: Week) => `
    <div class="av-c av-dates"><span class="av-label">${esc(trLabel(w.label))}</span><span class="av-sub">${esc(w.id)} · ${esc(datesStr(w))}</span></div>
    <div class="av-c av-zones" title="${fr ? 'Zones scolaires' : 'French school holiday areas'}">${zonesCell(w)}</div>
    <div class="av-c av-price">${w.status === 'available' ? priceCell(w) : '<span class="av-nozone">—</span>'}</div>
    <div class="av-c av-status"><span class="badge ${w.status === 'available' ? 'badge-free' : 'badge-booked'}">${w.status === 'available' ? t.available : t.booked}</span></div>`;

  const row = (w: Week) => {
    if (opts.mode === 'select') {
      // Checkboxes: guests often ask for several consecutive weeks.
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

  return head + months
    .map((m) => `<div class="av-month">${esc(trMonth(m))}</div>${list.filter((w) => w.month === m).map(row).join('')}`)
    .join('');
}
