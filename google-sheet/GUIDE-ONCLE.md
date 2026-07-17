# 📊 Gérer les tarifs & disponibilités — Guide simple

Le site affiche automatiquement les tarifs et les disponibilités depuis **la feuille Google
existante** (« Tarifs Les Zines »). Rien à toucher dans le site : vous changez un prix ou une
disponibilité dans la feuille, et le site se met à jour tout seul en ~2 minutes.

## Le format de la feuille (déjà en place — à respecter)

Le site lit les colonnes **dans cet ordre précis** :

| A — Mois | B — Semaine | C — Dates (une seule case) | D — Prix | E — Disponibilité | F, G, H — Zones |
|----------|-------------|----------------------------|----------|-------------------|-----------------|
| MOIS JUILLET 2026 | S 27 | du samedi 27 au samedi 4 | 5 000 € | déjà loué ! | A / B / C |
| *(vide)* | S 28 | du samedi 4 au samedi 11 | 7 000 € | déjà loué ! | A / B / C |
| SEPTEMBRE 2026 | S 36 | du samedi 29 au samedi 5 | *(vide)* | disponible | *(vides)* |

**Règles importantes :**
- Colonne **B** : le numéro de semaine avec un « S » (ex. `S 31` ou `S31`).
- Colonne **C** : les dates **dans une seule case**, sous la forme « du samedi 25 au samedi 1 ».
  ⚠️ Ne pas séparer en deux colonnes « Du » / « Au » : le site ne les lirait pas.
- Colonne **D** : le prix de la semaine (avec ou sans « € », peu importe : `9 500 €` ou `9500`).
  Si la case est vide, le site affiche le prix de secours enregistré dans le site.
- Colonne **E** : écrire `disponible` ou `déjà loué !` (tout texte contenant « loué » marche).
- Colonnes **F, G, H** : les zones scolaires concernées (`A`, `B`, `C`), une par case, ou vides.
- Le nom du mois (colonne A) suffit sur la **première ligne** de chaque mois.

## Au quotidien

- Une semaine est réservée ? Colonne E : `disponible` → `déjà loué !`. **C'est tout.**
- Un prix change ? Modifiez la case de la colonne D.
- Le site reprend les nouvelles valeurs automatiquement (petite mise en cache de 2 minutes).

## ⚠️ Confidentialité

La feuille est **publiée sur le web** : toute personne disposant du lien peut la lire.
**N'y notez jamais** de noms de locataires, d'acomptes, de numéros de téléphone ou toute autre
information personnelle — uniquement les semaines, prix, disponibilités et zones. Pour vos
suivis de locataires, utilisez un autre classeur (non publié).

## En cas de pépin

Si la feuille est supprimée ou change de format, le site bascule tout seul sur ses valeurs de
secours (`src/data/rates.json`) : rien n'est jamais cassé, mais les tarifs peuvent alors être
datés. Prévenez le développeur pour resynchroniser.
