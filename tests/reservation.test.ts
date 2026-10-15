import { describe, expect, it, vi } from 'vitest';
import { buildConfirmation, buildOwnerEmail, type Mail } from '../src/lib/reservation/emails';
import { sanitizeFields } from '../src/lib/reservation/fields';
import { handleReservation, type ReservationConfig, type Senders } from '../src/lib/reservation/handler';
import { sendSms, sendWithResend } from '../src/lib/reservation/providers';

const config: ReservationConfig = {
  ownerTo: 'proprietaire@example.com',
  contactEmail: 'contact@example.com',
  resend: { apiKey: 'cle-de-test' },
  twilio: {},
};

const request = {
  name: 'Marie Durand',
  email: 'marie@example.com',
  week: 'Semaine du 18/07/2026 au 25/07/2026',
  guests: '12',
  lang: 'fr',
  form: 'reservation',
};

const senders = (email = true, sms = false) => ({
  email: vi.fn<Senders['email']>(async () => email),
  sms: vi.fn<Senders['sms']>(async () => sms),
});

describe('handleReservation', () => {
  it('refuse un corps qui n’est pas un objet JSON', async () => {
    expect(await handleReservation(undefined, config, senders())).toEqual({
      status: 400,
      body: { ok: false, error: 'invalid_json' },
    });
  });

  it('répond un faux succès à un robot et n’envoie rien', async () => {
    const s = senders();
    const result = await handleReservation({ ...request, website: 'https://spam.example' }, config, s);
    expect(result.status).toBe(200);
    expect(s.email).not.toHaveBeenCalled();
    expect(s.sms).not.toHaveBeenCalled();
  });

  it('exige un nom et un e-mail valide', async () => {
    expect((await handleReservation({ ...request, name: '' }, config, senders())).body.error).toBe('missing_fields');
    expect((await handleReservation({ ...request, email: 'marie@' }, config, senders())).body.error).toBe('invalid_email');
  });

  it('sans service d’envoi configuré, demande au navigateur de passer par mailto', async () => {
    const result = await handleReservation(request, { ...config, resend: {}, twilio: {} }, senders());
    expect(result).toEqual({ status: 501, body: { ok: false, fallback: true, error: 'no_provider' } });
  });

  it('prévient le propriétaire puis envoie l’accusé de réception au visiteur', async () => {
    const s = senders();
    const result = await handleReservation(request, config, s);

    expect(result).toEqual({ status: 200, body: { ok: true, email: true, sms: false, confirmation: true } });
    const [owner, confirmation] = s.email.mock.calls.map(([mail]) => mail as Mail);
    expect(owner).toMatchObject({ to: 'proprietaire@example.com', replyTo: 'marie@example.com' });
    expect(confirmation).toMatchObject({ to: 'marie@example.com', replyTo: 'contact@example.com' });
  });

  it('répond 502 quand ni l’e-mail ni le SMS ne partent', async () => {
    expect((await handleReservation(request, config, senders(false, false))).status).toBe(502);
  });

  it('compte un envoi qui lève une exception comme un échec, sans faire tomber la demande', async () => {
    const s = senders(true, true);
    s.email.mockRejectedValue(new Error('Resend indisponible'));
    const result = await handleReservation(request, config, s);
    expect(result).toEqual({ status: 200, body: { ok: true, email: false, sms: true, confirmation: false } });
  });

  it('n’échoue pas si seul l’accusé de réception ne part pas', async () => {
    const s = senders();
    s.email.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const result = await handleReservation(request, config, s);
    expect(result.body).toMatchObject({ ok: true, email: true, confirmation: false });
  });
});

describe('sanitizeFields', () => {
  it('retire les retours à la ligne des champs repris dans l’objet de l’e-mail', () => {
    // Un « \n » dans l’objet permettrait d’injecter des en-têtes (Bcc…).
    expect(sanitizeFields({ name: 'Eve\r\nBcc: x@example.com' }).name).toBe('Eve Bcc: x@example.com');
  });

  it('coupe les champs trop longs et ignore ce qui n’est pas du texte', () => {
    expect(sanitizeFields({ name: 'a'.repeat(500) }).name).toHaveLength(100);
    expect(sanitizeFields({ name: { toString: () => 'objet' } }).name).toBe('');
  });

  it('ramène langue et formulaire à des valeurs connues', () => {
    expect(sanitizeFields({ lang: 'de', form: 'autre' })).toMatchObject({ lang: 'fr', form: 'reservation' });
  });
});

describe('e-mails', () => {
  it('échappe tout le HTML saisi par le visiteur', () => {
    const fields = sanitizeFields({
      ...request,
      name: '<script>alert(1)</script>',
      message: '<img src=x onerror=alert(1)>',
    });
    for (const mail of [buildOwnerEmail(fields, config.ownerTo), buildConfirmation(fields, config.contactEmail)]) {
      expect(mail.html).not.toContain('<script>');
      expect(mail.html).not.toContain('<img src=x');
    }
  });

  it('écrit l’accusé de réception dans la langue du visiteur', () => {
    expect(buildConfirmation(sanitizeFields({ ...request, lang: 'en' }), 'c@example.com').subject).toMatch(/^Your booking request/);
    expect(buildConfirmation(sanitizeFields(request), 'c@example.com').subject).toMatch(/^Votre demande de réservation/);
  });
});

describe('providers', () => {
  const mail: Mail = { to: 'a@example.com', subject: 'Objet', text: 'Texte' };
  const ok = () => vi.fn(async () => new Response('{}', { status: 200 }));

  it('n’appelle pas Resend sans clé', async () => {
    const fetchImpl = ok();
    expect(await sendWithResend(mail, {}, fetchImpl)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('envoie à Resend avec la clé en en-tête, jamais dans le corps', async () => {
    const fetchImpl = ok();
    expect(await sendWithResend(mail, { apiKey: 'cle-de-test', from: 'Villa <r@example.com>' }, fetchImpl)).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer cle-de-test');
    expect(String(init.body)).not.toContain('cle-de-test');
    expect(JSON.parse(String(init.body))).toMatchObject({ from: 'Villa <r@example.com>', to: ['a@example.com'] });
  });

  it('n’envoie de SMS qu’avec une configuration Twilio complète', async () => {
    const fetchImpl = ok();
    const fields = sanitizeFields(request);
    expect(await sendSms(fields, { accountSid: 'AC1', authToken: 't' }, fetchImpl)).toBe(false);
    expect(await sendSms(fields, { accountSid: 'AC1', authToken: 't', from: '+1', to: '+2' }, fetchImpl)).toBe(true);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('AC1:t')}`);
  });
});
