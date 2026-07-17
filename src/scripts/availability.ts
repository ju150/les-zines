// Shared availability-table renderer. Returns an HTML string so the SAME markup is used
// both server-side (Astro set:html) and client-side (innerHTML after fetching /api/rates).

export type Week = {
  id: string;
  month: string;
  label: string;
  price: number;
  status: string;
  zones?: string[];
};

export interface AvailabilityOpts {
  mode: 'links' | 'select';
  lang?: string;
  reservationBase?: string;
  onlyAvailable?: boolean;
}

const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const euro = (n: number) => Number(n).toLocaleString('fr-FR');

export function renderAvailability(weeks: Week[], opts: AvailabilityOpts): string {
  const fr = (opts.lang ?? 'fr') === 'fr';
  const t = {
    available: fr ? 'Disponible' : 'Available',
    booked: fr ? 'Déjà loué' : 'Booked',
    book: fr ? 'Réserver' : 'Book',
    perweek: fr ? 'sem.' : 'wk',
    onrequest: fr ? 'Sur demande' : 'On request',
    sat: fr ? 'sam. → sam.' : 'Sat → Sat',
    h_week: fr ? 'Semaine' : 'Week',
    h_zone: fr ? 'Zone de vacances' : 'Holiday zone',
    h_price: fr ? 'Prix' : 'Price',
    h_status: fr ? 'Disponibilité' : 'Availability',
  };
  // Column header row (desktop only; mobile uses the card layout + the legend below the table).
  const head =
    `<div class="av-head"><div>${t.h_week}</div><div>${t.h_zone}</div><div class="av-head-price">${t.h_price}</div><div>${t.h_status}</div><div></div></div>`;
  const list = opts.onlyAvailable ? weeks.filter((w) => w.status === 'available') : weeks;
  const months = [...new Set(list.map((w) => w.month))];

  const priceCell = (w: Week) =>
    w.price > 0 ? `${euro(w.price)} €<small> / ${t.perweek}</small>` : `<span class="av-req">${t.onrequest}</span>`;
  const zonesCell = (w: Week) =>
    w.zones && w.zones.length
      ? w.zones.map((z) => `<span class="zone zone-${esc(z.toLowerCase())}">${esc(z)}</span>`).join('')
      : '<span class="av-nozone">—</span>';

  const inner = (w: Week) => `
    <div class="av-c av-dates"><span class="av-label">${esc(w.label)}</span><span class="av-sub">${esc(w.id)} · ${t.sat}</span></div>
    <div class="av-c av-zones" title="Zones scolaires">${zonesCell(w)}</div>
    <div class="av-c av-price">${w.status === 'available' ? priceCell(w) : '<span class="av-nozone">—</span>'}</div>
    <div class="av-c av-status"><span class="badge ${w.status === 'available' ? 'badge-free' : 'badge-booked'}">${w.status === 'available' ? t.available : t.booked}</span></div>`;

  const row = (w: Week) => {
    if (opts.mode === 'select') {
      return w.status === 'available'
        ? `<label class="av-row av-free av-pick">${inner(w)}<div class="av-c av-action"><input type="radio" name="week" value="${esc(w.label)}" class="sr-only" /><span class="av-radio" aria-hidden="true"></span></div></label>`
        : `<div class="av-row av-booked">${inner(w)}<div class="av-c av-action"></div></div>`;
    }
    return `<div class="av-row ${w.status === 'available' ? 'av-free' : 'av-booked'}">${inner(w)}<div class="av-c av-action">${
      w.status === 'available'
        ? `<a href="${opts.reservationBase || '/reservation'}?week=${encodeURIComponent(w.label)}" class="btn btn-primary av-btn">${t.book}</a>`
        : ''
    }</div></div>`;
  };

  return head + months
    .map((m) => `<div class="av-month">${esc(m)}</div>${list.filter((w) => w.month === m).map(row).join('')}`)
    .join('');
}
