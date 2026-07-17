// Pop-up de confirmation après l'envoi d'un formulaire, puis retour à l'accueil.
// Partagé par les pages Réservation et Contact.

export interface ConfirmOpts {
  fr: boolean;
  /** URL de l'accueil dans la langue de la page ('/' ou '/en'). */
  home: string;
  title: string;
  message: string;
  /** Ligne complémentaire (ex. : e-mail de confirmation envoyé). */
  note?: string;
  delayMs?: number;
}

export function showConfirmation(o: ConfirmOpts): void {
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', o.title);
  overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center bg-pine-deep/70 backdrop-blur-sm p-6';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity .35s ease';

  const card = document.createElement('div');
  card.className = 'bg-paper rounded-3xl shadow-deep max-w-md w-full p-8 sm:p-10 text-center';
  card.innerHTML = `
    <div class="w-14 h-14 mx-auto mb-5 rounded-full bg-pine text-white flex items-center justify-center">
      <svg class="w-7 h-7 stroke-current fill-none" stroke-width="2.2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <h2 class="font-serif text-2xl sm:text-3xl text-pine mb-3"></h2>
    <p class="text-ink-soft"></p>
    <p class="cfm-note text-ink-soft mt-2"></p>
    <button type="button" class="btn btn-primary mt-7"></button>
    <p class="text-xs text-ink-mute mt-4"></p>`;
  (card.querySelector('h2') as HTMLElement).textContent = o.title;
  (card.querySelector('p') as HTMLElement).textContent = o.message;
  const note = card.querySelector('.cfm-note') as HTMLElement;
  if (o.note) note.textContent = o.note;
  else note.remove();
  const btn = card.querySelector('button') as HTMLButtonElement;
  btn.textContent = o.fr ? 'Retour à l’accueil' : 'Back to the homepage';
  (card.querySelector('p.text-xs') as HTMLElement).textContent = o.fr
    ? 'Retour automatique à l’accueil dans quelques secondes…'
    : 'Returning to the homepage in a few seconds…';

  overlay.appendChild(card);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  const go = () => { window.location.href = o.home; };
  btn.addEventListener('click', go);
  btn.focus();
  window.setTimeout(go, o.delayMs ?? 5000);
}
