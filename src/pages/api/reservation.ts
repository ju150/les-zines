import type { APIRoute } from 'astro';

export const prerender = false;

// Sur Cloudflare Workers les variables du tableau de bord n'arrivent pas par
// `process.env` mais par `locals.runtime.env`. On mémorise cette référence au début
// de chaque requête : elle est identique pour toutes les requêtes d'un même isolate,
// donc rien ne peut fuiter d'une demande à l'autre. Les deux autres sources restent
// pour le dev local (fichier .env) et pour un éventuel retour à un runtime Node.
let runtimeEnv: Record<string, string | undefined> = {};

const env = (k: string): string | undefined =>
  runtimeEnv[k] ??
  (typeof process !== 'undefined' ? process.env[k] : undefined) ??
  (import.meta.env as any)[k];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// Sanitize a form value: only strings pass, newlines/tabs stripped (they end up in
// the email subject), length capped so a bot can't relay megabytes through us.
const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').slice(0, max).trim() : '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const escHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

type Fields = {
  name: string;
  email: string;
  phone: string;
  guests: string;
  week: string;
  message: string;
  lang: 'fr' | 'en';
  form: 'reservation' | 'contact';
};

function sanitizeFields(raw: Record<string, unknown>): Fields {
  return {
    name: clean(raw.name, 100),
    email: clean(raw.email, 200),
    phone: clean(raw.phone, 40),
    guests: clean(raw.guests, 10),
    // Peut contenir plusieurs semaines jointes (« S36 · 29/08/2026 → 05/09/2026 + S37 … »)
    week: clean(raw.week, 500),
    // The message is the only field allowed to keep its newlines (email body only).
    message: typeof raw.message === 'string' ? raw.message.slice(0, 4000).trim() : '',
    lang: raw.lang === 'en' ? 'en' : 'fr',
    form: raw.form === 'contact' ? 'contact' : 'reservation',
  };
}

// ——— Adresses ———
// Expéditeur : reservation@leszines.fr (variable RESERVATION_FROM, domaine vérifié
// chez Resend) ; les réponses des clients partent vers contact@.
const ownerTo = () => env('RESERVATION_TO') || 'contact@leszines.fr';
const contactEmail = () => env('CONTACT_EMAIL') || 'contact@leszines.fr';
const fromName = () => 'Villa Les Zines';

type Mail = { to: string; replyTo?: string; replyToName?: string; subject: string; text: string; html?: string };

// ——— E-mail au propriétaire (mise en page soignée, aux couleurs du site) ———
function buildOwnerEmail(f: Fields): Mail {
  const resa = f.form !== 'contact';
  const kind = resa ? 'Demande de réservation' : 'Message via le site';
  const subject = `${kind}, ${f.week || 'sans objet'}, ${f.name}`.trim();

  const text = [
    `${kind} — www.leszines.fr`,
    '',
    `Nom : ${f.name}`,
    `Email : ${f.email}`,
    `Téléphone : ${f.phone || '—'}`,
    resa ? `Personnes : ${f.guests || '—'}` : null,
    resa ? `Semaine(s) : ${f.week || '—'}` : `Objet : ${f.week || '—'}`,
    `Langue du visiteur : ${f.lang.toUpperCase()}`,
    '',
    'Message :',
    f.message || '(aucun)',
    '',
    `Répondre : ${f.email}`,
  ].filter((l) => l !== null).join('\n');

  // Lignes du récapitulatif (label + valeur), échappées.
  const row = (label: string, value: string, isLink?: 'mail' | 'tel') => {
    const v = isLink === 'mail'
      ? `<a href="mailto:${escHtml(value)}" style="color:#A5482B;text-decoration:none;">${escHtml(value)}</a>`
      : isLink === 'tel'
        ? `<a href="tel:${escHtml(value.replace(/\s+/g, ''))}" style="color:#A5482B;text-decoration:none;">${escHtml(value)}</a>`
        : escHtml(value);
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #EDE6D8;color:#5F6D68;font-size:13px;vertical-align:top;width:40%;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #EDE6D8;color:#20302C;font-size:15px;font-weight:600;">${v}</td>
    </tr>`;
  };

  const weeksHtml = resa && f.week
    ? f.week.split(' + ').map((w) => `<div>${escHtml(w)}</div>`).join('')
    : escHtml(f.week || '—');

  const rows = [
    row('Nom', f.name),
    row('Email', f.email, 'mail'),
    f.phone ? row('Téléphone', f.phone, 'tel') : '',
    resa && f.guests ? row('Personnes', f.guests) : '',
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #EDE6D8;color:#5F6D68;font-size:13px;vertical-align:top;">${resa ? 'Semaine(s)' : 'Objet'}</td>
      <td style="padding:10px 0;border-bottom:1px solid #EDE6D8;color:#123F39;font-size:15px;font-weight:700;">${weeksHtml}</td>
    </tr>`,
    row('Langue', f.lang.toUpperCase()),
  ].join('');

  const messageBlock = f.message
    ? `<div style="margin:22px 0 4px;color:#5F6D68;font-size:13px;">Message</div>
       <div style="background:#F5F0E6;border-radius:12px;padding:16px 18px;color:#20302C;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escHtml(f.message)}</div>`
    : '';

  const html = `
<div style="background:#F5F0E6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#20302C;">
  <div style="max-width:580px;margin:0 auto;background:#FBF8F2;border:1px solid #E4DBCB;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(14,50,45,.08);">
    <div style="background:#123F39;padding:24px 30px;">
      <div style="font-style:italic;font-weight:600;font-size:22px;color:#FBF8F2;letter-spacing:.3px;">Villa Les Zines</div>
      <div style="color:#C9A24B;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">${resa ? 'Nouvelle demande de réservation' : 'Nouveau message'}</div>
    </div>
    <div style="padding:30px;">
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#465651;">
        ${resa
          ? 'Une nouvelle demande de réservation vient d’arriver via le site.'
          : 'Un nouveau message vient d’arriver via le site.'}
      </p>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">${rows}</table>
      ${messageBlock}
      <div style="margin-top:28px;text-align:center;">
        <a href="mailto:${escHtml(f.email)}?subject=${encodeURIComponent('Votre demande — Villa Les Zines')}"
           style="display:inline-block;background:#BF5836;color:#fff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;">
          Répondre à ${escHtml(f.name)}
        </a>
      </div>
    </div>
    <div style="padding:16px 30px;border-top:1px solid #E4DBCB;font-size:12px;color:#5F6D68;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
      Reçu via <a href="https://www.leszines.fr" style="color:#5F6D68;">www.leszines.fr</a> — répondez directement à cet e-mail pour joindre ${escHtml(f.name)}.
    </div>
  </div>
</div>`;

  return { to: ownerTo(), replyTo: f.email, replyToName: f.name || undefined, subject, text, html };
}

// ——— Confirmation au client (signée Jean-Louis et Jean-Christophe Bernard) ———
function buildConfirmation(f: Fields): Mail {
  const fr = f.lang === 'fr';
  const resa = f.form === 'reservation';
  const subject = fr
    ? resa
      ? 'Votre demande de réservation est bien reçue — Villa Les Zines'
      : 'Votre message est bien reçu — Villa Les Zines'
    : resa
      ? 'Your booking request has been received — Villa Les Zines'
      : 'Your message has been received — Villa Les Zines';

  const recap = resa && f.week ? (fr ? `Votre demande : ${f.week}` : `Your request: ${f.week}`) : '';
  const guests = resa && f.guests ? (fr ? `Nombre de personnes : ${f.guests}` : `Guests: ${f.guests}`) : '';

  const text = fr
    ? [
        `Bonjour ${f.name},`,
        '',
        resa
          ? 'Merci pour votre demande de réservation à la Villa Les Zines : elle nous est bien parvenue.'
          : 'Merci pour votre message : il nous est bien parvenu.',
        recap, guests,
        '',
        'Nous vous répondons personnellement très vite, en général sous 24 heures' +
          (resa ? ', pour confirmer la disponibilité et organiser la suite.' : '.'),
        '',
        'D’ici là, si vous souhaitez ajouter une précision, répondez simplement à ce message ou appelez-nous au 07 66 42 33 32.',
        '',
        'Au plaisir de vous accueillir au Cap Ferret,',
        '',
        'Jean-Louis et Jean-Christophe Bernard',
        'Villa Les Zines · Cap Ferret',
        'www.leszines.fr · contact@leszines.fr · 07 66 42 33 32',
      ].filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n')
    : [
        `Hello ${f.name},`,
        '',
        resa
          ? 'Thank you for your booking request at Villa Les Zines: it has reached us safely.'
          : 'Thank you for your message: it has reached us safely.',
        recap, guests,
        '',
        'We reply personally and quickly, usually within 24 hours' +
          (resa ? ', to confirm availability and arrange the next steps.' : '.'),
        '',
        'In the meantime, if you would like to add anything, simply reply to this email or call us on +33 7 66 42 33 32.',
        '',
        'Looking forward to welcoming you in Cap Ferret,',
        '',
        'Jean-Louis and Jean-Christophe Bernard',
        'Villa Les Zines · Cap Ferret',
        'www.leszines.fr · contact@leszines.fr · +33 7 66 42 33 32',
      ].join('\n').replace(/\n{3,}/g, '\n\n');

  const p = (s: string) => `<p style="margin:0 0 16px;">${s}</p>`;
  const html = `
<div style="background:#F5F0E6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#20302C;">
  <div style="max-width:560px;margin:0 auto;background:#FBF8F2;border:1px solid #E4DBCB;border-radius:16px;overflow:hidden;">
    <div style="background:#123F39;padding:20px 28px;">
      <span style="font-style:italic;font-weight:600;font-size:24px;color:#FBF8F2;">Villa Les Zines</span>
    </div>
    <div style="padding:28px;line-height:1.65;font-size:16px;">
      ${p(fr ? `Bonjour ${escHtml(f.name)},` : `Hello ${escHtml(f.name)},`)}
      ${p(
        fr
          ? resa
            ? 'Merci pour votre demande de réservation à la Villa Les Zines&nbsp;: elle nous est bien parvenue.'
            : 'Merci pour votre message&nbsp;: il nous est bien parvenu.'
          : resa
            ? 'Thank you for your booking request at Villa Les Zines: it has reached us safely.'
            : 'Thank you for your message: it has reached us safely.',
      )}
      ${
        recap
          ? `<p style="margin:0 0 16px;background:#F5F0E6;border-radius:10px;padding:14px 18px;">
               <strong>${fr ? 'Votre demande' : 'Your request'}&nbsp;:</strong> ${escHtml(f.week)}${
                 guests ? `<br>${fr ? 'Nombre de personnes' : 'Guests'}&nbsp;: ${escHtml(f.guests)}` : ''
               }</p>`
          : ''
      }
      ${p(
        fr
          ? 'Nous vous répondons personnellement très vite, en général <strong>sous 24&nbsp;heures</strong>' +
              (resa ? ', pour confirmer la disponibilité et organiser la suite.' : '.')
          : 'We reply personally and quickly, usually <strong>within 24 hours</strong>' +
              (resa ? ', to confirm availability and arrange the next steps.' : '.'),
      )}
      ${p(
        fr
          ? 'D’ici là, si vous souhaitez ajouter une précision, répondez simplement à ce message ou appelez-nous au <a href="tel:+33766423332" style="color:#A5482B;text-decoration:none;font-weight:bold;">07&nbsp;66&nbsp;42&nbsp;33&nbsp;32</a>.'
          : 'In the meantime, if you would like to add anything, simply reply to this email or call us on <a href="tel:+33766423332" style="color:#A5482B;text-decoration:none;font-weight:bold;">+33&nbsp;7&nbsp;66&nbsp;42&nbsp;33&nbsp;32</a>.',
      )}
      <p style="margin:26px 0 0;">${fr ? 'Au plaisir de vous accueillir au Cap Ferret,' : 'Looking forward to welcoming you in Cap Ferret,'}<br>
      <strong>Jean-Louis et Jean-Christophe Bernard</strong></p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #E4DBCB;font-size:13px;color:#5F6D68;line-height:1.6;">
      Villa Les Zines · 10 rue des Arbousiers, 33950 Lège-Cap-Ferret<br>
      <a href="https://www.leszines.fr" style="color:#5F6D68;">www.leszines.fr</a> · contact@leszines.fr · 07 66 42 33 32
    </div>
  </div>
</div>`;

  // Les réponses du client arrivent sur contact@ (reservation@ n'est qu'un expéditeur).
  return { to: f.email, replyTo: contactEmail(), replyToName: fromName(), subject, text, html };
}

// ——— Envoi (Resend) ———
async function sendResend(mail: Mail): Promise<boolean> {
  const key = env('RESEND_API_KEY');
  if (!key) return false;
  // Avant vérification du domaine leszines.fr chez Resend, seul onboarding@resend.dev
  // peut envoyer (et uniquement vers l'adresse du compte). Une fois vérifié :
  // RESERVATION_FROM = "Villa Les Zines <reservation@leszines.fr>".
  const from = env('RESERVATION_FROM') || 'Villa Les Zines <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [mail.to],
      reply_to: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });
  return res.ok;
}

async function send(mail: Mail): Promise<boolean> {
  return sendResend(mail).catch(() => false);
}

async function sendSms(f: Fields): Promise<boolean> {
  const sid = env('TWILIO_ACCOUNT_SID');
  const token = env('TWILIO_AUTH_TOKEN');
  const from = env('TWILIO_FROM');
  const to = env('TWILIO_TO');
  if (!sid || !token || !from || !to) return false;

  const body = `Villa Les Zines, nouvelle demande : ${f.name || '?'} pour ${f.week || '?'}. Tel: ${f.phone || ', '} / ${f.email || ', '}`;
  const params = new URLSearchParams({ To: to, From: from, Body: body.slice(0, 320) });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      // `btoa` est natif partout (Workers comme Node ≥ 16), contrairement à `Buffer`
      // qui dépendrait du drapeau de compatibilité Node côté Cloudflare.
      Authorization: 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  return res.ok;
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Cloudflare range les variables du tableau de bord ici ; en local, l'objet est absent
  // et `env()` retombe sur le fichier .env.
  runtimeEnv = ((locals as any)?.runtime?.env as Record<string, string | undefined>) ?? {};

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
    if (typeof raw !== 'object' || raw === null) throw new Error('not an object');
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  // Honeypot: the visible forms ship a hidden "website" field that humans never fill.
  // A bot that fills it gets a fake success and nothing is sent.
  if (typeof raw.website === 'string' && raw.website.trim() !== '') {
    return json({ ok: true, email: true, sms: false });
  }

  const fields = sanitizeFields(raw);

  if (!fields.name || !fields.email) {
    return json({ ok: false, error: 'missing_fields' }, 422);
  }
  if (!EMAIL_RE.test(fields.email)) {
    return json({ ok: false, error: 'invalid_email' }, 422);
  }

  const providersConfigured = Boolean(env('RESEND_API_KEY')) || Boolean(env('TWILIO_ACCOUNT_SID'));
  // No provider configured yet → tell the client to fall back to a mailto link.
  if (!providersConfigured) {
    return json({ ok: false, fallback: true, error: 'no_provider' }, 501);
  }

  const [emailOk, smsOk] = await Promise.all([
    send(buildOwnerEmail(fields)).catch(() => false),
    sendSms(fields).catch(() => false),
  ]);

  if (!emailOk && !smsOk) {
    return json({ ok: false, error: 'send_failed' }, 502);
  }

  // Accusé de réception au client — best effort : son échec (domaine non vérifié,
  // quota…) ne doit jamais faire échouer la demande elle-même.
  const confirmationOk = emailOk ? await send(buildConfirmation(fields)).catch(() => false) : false;

  return json({ ok: true, email: emailOk, sms: smsOk, confirmation: confirmationOk });
};
