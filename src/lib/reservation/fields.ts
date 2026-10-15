// Champs des formulaires « Réservation » et « Contact » : nettoyage et validation.
// Tout ce qui arrive du navigateur est traité comme hostile jusqu'à preuve du contraire.

export type ReservationFields = {
  name: string;
  email: string;
  phone: string;
  guests: string;
  /** Peut contenir plusieurs semaines jointes (« S36 · 29/08/2026 → 05/09/2026 + S37 … »). */
  week: string;
  message: string;
  lang: 'fr' | 'en';
  form: 'reservation' | 'contact';
};

export type ValidationError = 'missing_fields' | 'invalid_email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Ne laisse passer que des chaînes, sans retours à la ligne ni tabulations (elles finissent
 * dans l'objet de l'e-mail : un « \n » y permettrait d'injecter des en-têtes), et coupées à
 * `max` caractères pour qu'un robot ne fasse pas transiter des mégaoctets par le site.
 */
export const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').slice(0, max).trim() : '';

export function sanitizeFields(raw: Record<string, unknown>): ReservationFields {
  return {
    name: clean(raw.name, 100),
    email: clean(raw.email, 200),
    phone: clean(raw.phone, 40),
    guests: clean(raw.guests, 10),
    week: clean(raw.week, 500),
    // Seul le message garde ses retours à la ligne : il ne va que dans le corps de l'e-mail.
    message: typeof raw.message === 'string' ? raw.message.slice(0, 4000).trim() : '',
    lang: raw.lang === 'en' ? 'en' : 'fr',
    form: raw.form === 'contact' ? 'contact' : 'reservation',
  };
}

export function validateFields(fields: ReservationFields): ValidationError | null {
  if (!fields.name || !fields.email) return 'missing_fields';
  if (!EMAIL_RE.test(fields.email)) return 'invalid_email';
  return null;
}

/**
 * Pot de miel : les formulaires embarquent un champ caché « website » qu'un humain ne voit
 * jamais. Rempli, c'est un robot.
 */
export const isHoneypotFilled = (raw: Record<string, unknown>): boolean =>
  typeof raw.website === 'string' && raw.website.trim() !== '';
