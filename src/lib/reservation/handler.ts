// Traitement complet d'une demande envoyée par les formulaires « Réservation » et « Contact ».
// La route /api/reservation ne fait que lire la requête et la configuration, puis appelle
// cette fonction : toute la logique de décision est ici, testable sans réseau ni Cloudflare.
import { buildConfirmation, buildOwnerEmail, type Mail } from './emails';
import { isHoneypotFilled, sanitizeFields, validateFields, type ReservationFields } from './fields';
import { sendSms, sendWithResend, type ResendConfig, type TwilioConfig } from './providers';

export type ReservationConfig = {
  /** Destinataire des demandes (le propriétaire). */
  ownerTo: string;
  /** Adresse à laquelle le visiteur répond depuis son accusé de réception. */
  contactEmail: string;
  resend: ResendConfig;
  twilio: TwilioConfig;
};

export type Senders = {
  email: (mail: Mail) => Promise<boolean>;
  sms: (fields: ReservationFields) => Promise<boolean>;
};

export type ReservationResult = { status: number; body: Record<string, unknown> };

const defaultSenders = (config: ReservationConfig): Senders => ({
  email: (mail) => sendWithResend(mail, config.resend),
  sms: (fields) => sendSms(fields, config.twilio),
});

/** Un envoi qui échoue, quelle qu'en soit la raison, compte comme « non envoyé ». */
const settle = (attempt: () => Promise<boolean>) => attempt().catch(() => false);

/**
 * @param raw corps JSON déjà décodé (`undefined` si le JSON était invalide).
 * @returns le statut HTTP et le corps JSON à renvoyer au navigateur.
 */
export async function handleReservation(
  raw: unknown,
  config: ReservationConfig,
  senders: Senders = defaultSenders(config),
): Promise<ReservationResult> {
  if (typeof raw !== 'object' || raw === null) {
    return { status: 400, body: { ok: false, error: 'invalid_json' } };
  }
  const input = raw as Record<string, unknown>;

  // Un robot qui remplit le pot de miel reçoit un faux succès : rien n'est envoyé, et il
  // n'apprend pas qu'il a été repéré.
  if (isHoneypotFilled(input)) {
    return { status: 200, body: { ok: true, email: true, sms: false } };
  }

  const fields = sanitizeFields(input);
  const invalid = validateFields(fields);
  if (invalid) return { status: 422, body: { ok: false, error: invalid } };

  // Aucun service d'envoi configuré : le navigateur bascule sur un lien mailto pré-rempli,
  // la demande n'est jamais perdue.
  if (!config.resend.apiKey && !config.twilio.accountSid) {
    return { status: 501, body: { ok: false, fallback: true, error: 'no_provider' } };
  }

  const [emailOk, smsOk] = await Promise.all([
    settle(() => senders.email(buildOwnerEmail(fields, config.ownerTo))),
    settle(() => senders.sms(fields)),
  ]);
  if (!emailOk && !smsOk) {
    return { status: 502, body: { ok: false, error: 'send_failed' } };
  }

  // Accusé de réception au visiteur, au mieux : son échec (quota, domaine non vérifié…)
  // ne doit jamais faire échouer la demande elle-même, déjà transmise au propriétaire.
  const confirmationOk = emailOk
    ? await settle(() => senders.email(buildConfirmation(fields, config.contactEmail)))
    : false;

  return { status: 200, body: { ok: true, email: emailOk, sms: smsOk, confirmation: confirmationOk } };
}
