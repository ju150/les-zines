// Envoi réel : e-mail par Resend, SMS par Twilio. Chaque fonction renvoie `false` plutôt que
// de lever une exception quand le service n'est pas configuré ou refuse l'envoi : c'est le
// gestionnaire de la demande qui décide quoi répondre au visiteur.
import type { ReservationFields } from './fields';
import type { Mail } from './emails';

export type ResendConfig = {
  apiKey?: string;
  /** « Villa Les Zines <reservation@leszines.fr> », domaine vérifié chez Resend. */
  from?: string;
};

export type TwilioConfig = {
  accountSid?: string;
  authToken?: string;
  from?: string;
  to?: string;
};

// Avant vérification du domaine chez Resend, seule cette adresse peut envoyer (et
// uniquement vers l'adresse du compte).
const RESEND_SANDBOX_FROM = 'Villa Les Zines <onboarding@resend.dev>';

export async function sendWithResend(mail: Mail, config: ResendConfig, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!config.apiKey) return false;
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: config.from || RESEND_SANDBOX_FROM,
      to: [mail.to],
      reply_to: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });
  return res.ok;
}

export async function sendSms(f: ReservationFields, config: TwilioConfig, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const { accountSid, authToken, from, to } = config;
  if (!accountSid || !authToken || !from || !to) return false;

  const body = `Villa Les Zines, nouvelle demande : ${f.name || '?'} pour ${f.week || '?'}. Tel: ${f.phone || ', '} / ${f.email || ', '}`;
  const params = new URLSearchParams({ To: to, From: from, Body: body.slice(0, 320) });
  const res = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      // `btoa` est natif partout (Workers comme Node ≥ 16), contrairement à `Buffer`
      // qui dépendrait du drapeau de compatibilité Node côté Cloudflare.
      Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  return res.ok;
}
