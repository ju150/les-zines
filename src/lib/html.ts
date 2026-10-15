const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Échappe une valeur pour l'insérer dans du HTML, en texte comme dans un attribut entre
 * guillemets. Tout ce qui vient d'un visiteur ou de la feuille Google passe par ici avant
 * d'atterrir dans une page ou dans un e-mail.
 */
export const escapeHtml = (value: string): string =>
  String(value).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
