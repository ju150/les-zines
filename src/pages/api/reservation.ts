import type { APIRoute } from 'astro';

export const prerender = false;

const env = (k: string): string | undefined =>
  (typeof process !== 'undefined' ? process.env[k] : undefined) ?? (import.meta.env as any)[k];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

async function sendEmail(fields: Record<string, string>): Promise<boolean> {
  const key = env('RESEND_API_KEY');
  const to = env('RESERVATION_TO') || 'contact@leszines.fr';
  const from = env('RESERVATION_FROM') || 'Villa Les Zines <onboarding@resend.dev>';
  if (!key) return false;

  const subject = `Demande de réservation, ${fields.week || 'sans semaine'}, ${fields.name || ''}`.trim();
  const text = [
    `Nom : ${fields.name || ''}`,
    `Email : ${fields.email || ''}`,
    `Téléphone : ${fields.phone || ''}`,
    `Semaine / objet : ${fields.week || ''}`,
    '',
    fields.message || '',
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: fields.email, subject, text }),
  });
  return res.ok;
}

async function sendSms(fields: Record<string, string>): Promise<boolean> {
  const sid = env('TWILIO_ACCOUNT_SID');
  const token = env('TWILIO_AUTH_TOKEN');
  const from = env('TWILIO_FROM');
  const to = env('TWILIO_TO');
  if (!sid || !token || !from || !to) return false;

  const body = `Villa Les Zines, nouvelle demande : ${fields.name || '?'} pour ${fields.week || '?'}. Tel: ${fields.phone || ', '} / ${fields.email || ', '}`;
  const params = new URLSearchParams({ To: to, From: from, Body: body.slice(0, 320) });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  return res.ok;
}

export const POST: APIRoute = async ({ request }) => {
  let fields: Record<string, string>;
  try {
    fields = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  if (!fields?.name || !fields?.email) {
    return json({ ok: false, error: 'missing_fields' }, 422);
  }

  const providersConfigured = Boolean(env('RESEND_API_KEY')) || Boolean(env('TWILIO_ACCOUNT_SID'));
  // No provider configured yet → tell the client to fall back to a mailto link.
  if (!providersConfigured) {
    return json({ ok: false, fallback: true, error: 'no_provider' }, 501);
  }

  const [emailOk, smsOk] = await Promise.all([
    sendEmail(fields).catch(() => false),
    sendSms(fields).catch(() => false),
  ]);

  if (!emailOk && !smsOk) {
    return json({ ok: false, error: 'send_failed' }, 502);
  }
  return json({ ok: true, email: emailOk, sms: smsOk });
};
