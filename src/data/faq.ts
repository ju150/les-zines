// Questions fréquentes, affichées en texte toujours visible (jamais en accordéon fermé).
//
// Pourquoi : les assistants (Copilot, ChatGPT, Perplexity…) reprennent beaucoup plus
// volontiers une réponse posée en clair sous sa question qu'un fait dispersé dans une page.
// Avant ce fichier, ces questions trouvaient leur réponse sur les annonces des plateformes,
// avec des données anciennes, et non sur le site de la villa.
//
// Règle absolue : chaque réponse ne contient que des faits déjà écrits ailleurs sur le site
// ou tirés de la feuille des tarifs. Ce que seul le propriétaire sait (heures d'arrivée et de
// départ, animaux, stationnement, caution, surface habitable…) n'est PAS ici : on ne publie
// pas une réponse devinée. À compléter quand il les aura confirmés.
import type { Lang } from '../i18n/ui';
import { SITE } from './site';

/**
 * Une question et sa réponse, en texte brut. La réponse peut contenir une fois le repère
 * SEASON : le composant Faq.astro le remplace par la phrase de synthèse des tarifs
 * (« Saison 2027 : de 5 000 € à 9 900 € la semaine selon la période »), que le navigateur
 * réécrit ensuite à partir de la feuille. Aucun prix n'est donc écrit dans ce fichier.
 */
export type Faq = { q: string; a: string };
export const SEASON = '{{saison}}';

/** Location : au bas de la page Séjours & Tarifs. */
export function rentalFaq(lang: Lang): Faq[] {
  const fr = lang === 'fr';
  return fr
    ? [
        {
          q: 'Combien de personnes la Villa Les Zines peut-elle accueillir ?',
          a: 'De 12 à 16 personnes : six chambres climatisées avec lit double 160×200, soit 12 personnes, et un grenier-dortoir de quatre couchages 80×200. La villa compte quatre salles d’eau, plus une douche et un WC extérieurs.',
        },
        {
          q: 'Où se trouve la villa ?',
          a: `Au ${SITE.street}, ${SITE.postcode} ${SITE.city}, au cœur du Cap Ferret, à 400 m de la jetée Bélisaire (navettes pour Arcachon, petit train vers l’océan). Le marché, le village, la plage des Américains côté Bassin, la plage océane de l’Horizon et le phare se rejoignent à pied ou à vélo.`,
        },
        {
          q: 'Quels sont les tarifs ?',
          a: `En juillet et août, la villa se loue à la semaine, du samedi au samedi. ${SEASON}. Les prix semaine par semaine et les disponibilités à jour sont dans le tableau en haut de cette page.`,
        },
        {
          q: 'Qu’est-ce qui est inclus dans le prix ?',
          a: 'Le ménage de fin de séjour, le linge de maison (draps, serviettes, torchons), la taxe de séjour, un forfait eau, gaz et électricité (usage limité), le wifi par fibre et l’usage du lave-linge.',
        },
        {
          q: 'Comment réserver ?',
          a: 'Sur la page Réservation : cochez une ou plusieurs semaines disponibles, ou indiquez vos dates hors saison, laissez vos coordonnées et envoyez. Nous répondons personnellement, en général sous 24 heures, pour confirmer. Vous pouvez aussi téléphoner ou écrire : les coordonnées sont sur la page Contact.',
        },
        {
          q: 'Peut-on venir hors saison ou pour un court séjour ?',
          a: 'Oui. En juillet et août, la location se fait à la semaine, du samedi au samedi. Hors saison, des courts séjours sont possibles : indiquez vos dates dans « Autres dates » sur la page Réservation.',
        },
        {
          q: 'La villa est-elle climatisée ? Y a-t-il le wifi ?',
          a: 'Oui : la climatisation équipe toute la maison, y compris les six chambres, et le wifi par fibre couvre toute la villa.',
        },
        {
          q: 'La villa est-elle accessible aux personnes à mobilité réduite ?',
          a: 'Une chambre et une salle d’eau sont de plain-pied et accessibles (PMR). Pour une question précise sur l’accès, le plus simple est de nous écrire.',
        },
        {
          q: 'Comment est le jardin ?',
          a: 'Un jardin de 700 m², clos par une murette surmontée d’une palissade en bois et planté de pins et d’arbres fruitiers. On y trouve plusieurs terrasses en caillebotis, un barbecue, trois tables de jardin, seize fauteuils, des transats, deux hamacs et de grands parasols.',
        },
      ]
    : [
        {
          q: 'How many guests can Villa Les Zines sleep?',
          a: '12 to 16: six air-conditioned bedrooms, each with a 160×200 double bed (12 guests), plus an attic dorm with four 80×200 single beds. There are four bathrooms, plus an outdoor shower and WC.',
        },
        {
          q: 'Where is the villa?',
          a: `At ${SITE.street}, ${SITE.postcode} ${SITE.city}, France, in the heart of Cap Ferret (Arcachon Bay), 400 m from the Bélisaire jetty (boats to Arcachon, little train to the ocean). The market, the village, the Bay-side Américains beach, the Horizon ocean beach and the lighthouse can be reached on foot or by bike.`,
        },
        {
          q: 'How much does it cost?',
          a: `In July and August the villa is rented by the week, Saturday to Saturday. ${SEASON}. Week-by-week prices and up-to-date availability are in the table at the top of this page.`,
        },
        {
          q: 'What is included in the price?',
          a: 'End-of-stay cleaning, household linen (sheets, towels, tea towels), tourist tax, a water, gas and electricity package (limited use), fibre wifi and use of the washing machine.',
        },
        {
          q: 'How do I book?',
          a: 'On the Booking page: tick one or more available weeks, or enter your off-season dates, leave your details and send. We reply personally, usually within 24 hours, to confirm. You can also call or email: details are on the Contact page.',
        },
        {
          q: 'Can I come off-season or for a short stay?',
          a: 'Yes. In July and August the villa is rented weekly, Saturday to Saturday. Off-season, short stays are possible: enter your dates under “Other dates” on the Booking page.',
        },
        {
          q: 'Is the villa air-conditioned? Is there wifi?',
          a: 'Yes: air conditioning throughout the house, including all six bedrooms, and fibre wifi throughout the villa.',
        },
        {
          q: 'Is the villa accessible to guests with reduced mobility?',
          a: 'One ground-floor bedroom and one bathroom have step-free access for guests with reduced mobility. For a specific question about access, the simplest thing is to write to us.',
        },
        {
          q: 'What is the garden like?',
          a: 'A 700 m² garden, enclosed by a low wall topped with a wooden fence and planted with pines and fruit trees. It has several wood-deck terraces, a barbecue, three garden tables, sixteen armchairs, sun loungers, two hammocks and large parasols.',
        },
      ];
}

/** Vente : au bas de la page À vendre. */
export function saleFaq(lang: Lang): Faq[] {
  return lang === 'fr'
    ? [
        {
          q: 'La Villa Les Zines est-elle à vendre ?',
          a: `Oui. Cette villa en bois de 8 pièces (6 chambres et un dortoir, 4 salles d’eau, terrain clos de 700 m², DPE C et GES B), située ${SITE.street}, ${SITE.postcode} ${SITE.city}, est proposée à la vente de gré à gré. Le prix est communiqué sur demande.`,
        },
        {
          q: 'La villa reste-t-elle louée pendant la vente ?',
          a: 'Oui. Elle continue d’être louée à la semaine en été, pour 12 à 16 personnes : les semaines déjà louées de la saison passée sont consultables sur la page Séjours & Tarifs.',
        },
        {
          q: 'Comment organiser une visite ?',
          a: 'Les visites se font sur rendez-vous. Écrivez-nous par la page Contact en choisissant l’objet « Visite / vente », ou appelez-nous : nous répondons personnellement et en toute confidentialité.',
        },
      ]
    : [
        {
          q: 'Is Villa Les Zines for sale?',
          a: `Yes. This 8-room timber villa (6 bedrooms and a dorm, 4 bathrooms, walled 700 m² plot, French energy rating DPE C, greenhouse-gas rating B), at ${SITE.street}, ${SITE.postcode} ${SITE.city}, France, is offered as a private sale. The price is given on request.`,
        },
        {
          q: 'Is the villa still rented while it is for sale?',
          a: 'Yes. It is still rented by the week in summer, for 12 to 16 guests: last season’s booked weeks can be seen on the Stays & Rates page.',
        },
        {
          q: 'How do I arrange a viewing?',
          a: 'Viewings are by appointment. Write to us through the Contact page, choosing the subject “Visit / sale”, or call us: we reply personally and in confidence.',
        },
      ];
}
