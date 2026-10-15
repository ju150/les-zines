import type { APIRoute } from 'astro';
import { SITE } from '../../data/site';
import { readEnv } from '../../lib/env';
import { handleReservation, type ReservationConfig } from '../../lib/reservation/handler';

export const prerender = false;

const config = (): ReservationConfig => ({
  ownerTo: readEnv('RESERVATION_TO') ?? SITE.email,
  contactEmail: readEnv('CONTACT_EMAIL') ?? SITE.email,
  resend: { apiKey: readEnv('RESEND_API_KEY'), from: readEnv('RESERVATION_FROM') },
  twilio: {
    accountSid: readEnv('TWILIO_ACCOUNT_SID'),
    authToken: readEnv('TWILIO_AUTH_TOKEN'),
    from: readEnv('TWILIO_FROM'),
    to: readEnv('TWILIO_TO'),
  },
});

export const POST: APIRoute = async ({ request }) => {
  const raw: unknown = await request.json().catch(() => undefined);
  const { status, body } = await handleReservation(raw, config());
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
};
