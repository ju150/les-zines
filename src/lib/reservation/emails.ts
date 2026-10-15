// Les deux e-mails d'une demande : la notification au propriétaire et l'accusé de réception
// envoyé au visiteur. Fonctions pures : elles fabriquent le message, l'envoi est ailleurs.
import { SITE } from '../../data/site';
import { escapeHtml } from '../html';
import type { ReservationFields } from './fields';

export type Mail = {
  to: string;
  replyTo?: string;
  replyToName?: string;
  subject: string;
  text: string;
  html?: string;
};

const SIGNATURE = { fr: 'Jean-Louis et Jean-Christophe Bernard', en: 'Jean-Louis and Jean-Christophe Bernard' };

const phoneFr = SITE.phone; // « 07 66 42 33 32 »
const phoneIntl = `+33 ${SITE.phone.slice(1)}`; // « +33 7 66 42 33 32 »
const nbsp = (s: string) => s.replace(/ /g, '&nbsp;');

/** E-mail au propriétaire : mise en page soignée, aux couleurs du site. */
export function buildOwnerEmail(f: ReservationFields, to: string): Mail {
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

  // Lignes du récapitulatif (libellé + valeur), échappées.
  const row = (label: string, value: string, isLink?: 'mail' | 'tel') => {
    const v = isLink === 'mail'
      ? `<a href="mailto:${escapeHtml(value)}" style="color:#A5482B;text-decoration:none;">${escapeHtml(value)}</a>`
      : isLink === 'tel'
        ? `<a href="tel:${escapeHtml(value.replace(/\s+/g, ''))}" style="color:#A5482B;text-decoration:none;">${escapeHtml(value)}</a>`
        : escapeHtml(value);
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #EDE6D8;color:#5F6D68;font-size:13px;vertical-align:top;width:40%;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #EDE6D8;color:#20302C;font-size:15px;font-weight:600;">${v}</td>
    </tr>`;
  };

  const weeksHtml = resa && f.week
    ? f.week.split(' + ').map((w) => `<div>${escapeHtml(w)}</div>`).join('')
    : escapeHtml(f.week || '—');

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
       <div style="background:#F5F0E6;border-radius:12px;padding:16px 18px;color:#20302C;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(f.message)}</div>`
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
        <a href="mailto:${escapeHtml(f.email)}?subject=${encodeURIComponent('Votre demande — Villa Les Zines')}"
           style="display:inline-block;background:#BF5836;color:#fff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;">
          Répondre à ${escapeHtml(f.name)}
        </a>
      </div>
    </div>
    <div style="padding:16px 30px;border-top:1px solid #E4DBCB;font-size:12px;color:#5F6D68;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
      Reçu via <a href="https://www.leszines.fr" style="color:#5F6D68;">www.leszines.fr</a> — répondez directement à cet e-mail pour joindre ${escapeHtml(f.name)}.
    </div>
  </div>
</div>`;

  return { to, replyTo: f.email, replyToName: f.name || undefined, subject, text, html };
}

/**
 * Accusé de réception au visiteur, dans sa langue. `replyTo` est l'adresse de contact :
 * reservation@ n'est qu'un expéditeur, les réponses du client doivent arriver sur contact@.
 */
export function buildConfirmation(f: ReservationFields, replyTo: string): Mail {
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
        `D’ici là, si vous souhaitez ajouter une précision, répondez simplement à ce message ou appelez-nous au ${phoneFr}.`,
        '',
        'Au plaisir de vous accueillir au Cap Ferret,',
        '',
        SIGNATURE.fr,
        'Villa Les Zines · Cap Ferret',
        `www.leszines.fr · ${SITE.email} · ${phoneFr}`,
      ].join('\n').replace(/\n{3,}/g, '\n\n')
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
        `In the meantime, if you would like to add anything, simply reply to this email or call us on ${phoneIntl}.`,
        '',
        'Looking forward to welcoming you in Cap Ferret,',
        '',
        SIGNATURE.en,
        'Villa Les Zines · Cap Ferret',
        `www.leszines.fr · ${SITE.email} · ${phoneIntl}`,
      ].join('\n').replace(/\n{3,}/g, '\n\n');

  const telLink = (label: string) =>
    `<a href="tel:${SITE.phoneIntl}" style="color:#A5482B;text-decoration:none;font-weight:bold;">${nbsp(label)}</a>`;
  const p = (s: string) => `<p style="margin:0 0 16px;">${s}</p>`;
  const html = `
<div style="background:#F5F0E6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#20302C;">
  <div style="max-width:560px;margin:0 auto;background:#FBF8F2;border:1px solid #E4DBCB;border-radius:16px;overflow:hidden;">
    <div style="background:#123F39;padding:20px 28px;">
      <span style="font-style:italic;font-weight:600;font-size:24px;color:#FBF8F2;">Villa Les Zines</span>
    </div>
    <div style="padding:28px;line-height:1.65;font-size:16px;">
      ${p(fr ? `Bonjour ${escapeHtml(f.name)},` : `Hello ${escapeHtml(f.name)},`)}
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
               <strong>${fr ? 'Votre demande' : 'Your request'}&nbsp;:</strong> ${escapeHtml(f.week)}${
                 guests ? `<br>${fr ? 'Nombre de personnes' : 'Guests'}&nbsp;: ${escapeHtml(f.guests)}` : ''
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
          ? `D’ici là, si vous souhaitez ajouter une précision, répondez simplement à ce message ou appelez-nous au ${telLink(phoneFr)}.`
          : `In the meantime, if you would like to add anything, simply reply to this email or call us on ${telLink(phoneIntl)}.`,
      )}
      <p style="margin:26px 0 0;">${fr ? 'Au plaisir de vous accueillir au Cap Ferret,' : 'Looking forward to welcoming you in Cap Ferret,'}<br>
      <strong>${SIGNATURE.fr}</strong></p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #E4DBCB;font-size:13px;color:#5F6D68;line-height:1.6;">
      ${SITE.name} · ${SITE.addressLine}<br>
      <a href="https://www.leszines.fr" style="color:#5F6D68;">www.leszines.fr</a> · ${SITE.email} · ${phoneFr}
    </div>
  </div>
</div>`;

  return { to: f.email, replyTo, replyToName: SITE.name, subject, text, html };
}
