# 📊 Gérer les disponibilités & les tarifs — Guide simple

Le site lit votre **feuille Google** et se met à jour tout seul (en ~2 minutes).
Le format est désormais **le plus simple possible** : **4 colonnes**.

## La feuille : 4 colonnes, une ligne par semaine

| A — Arrivée | B — Départ | C — Prix | D — Disponibilité |
|-------------|------------|----------|-------------------|
| 04/07/2026  | 11/07/2026 | 7000     | loué              |
| 11/07/2026  | 18/07/2026 | 7900     | disponible        |
| 18/07/2026  | 25/07/2026 | 7900     | disponible        |

C'est tout. **Vous ne saisissez que les dates, le prix et la disponibilité.**
Le site s'occupe du reste automatiquement :
- il calcule le mois, l'année et le nombre de nuits à partir des dates ;
- il affiche « samedi → samedi » selon les vraies dates ;
- il ajoute les **zones de vacances scolaires** (A/B/C) tout seul pour les semaines d'été ;
- une semaine **disparaît automatiquement** du site le jour de son départ (plus besoin de la retirer).

## Règles (très courtes)

- **Colonnes A et B** : les dates d'arrivée et de départ, au format `JJ/MM/AAAA`
  (ex. `25/07/2026`). Vous pouvez aussi utiliser le format date de Google Sheets — les deux marchent.
- **Colonne C — Prix** : juste le nombre (`7900` ou `7 900 €`, peu importe).
- **Colonne D — Disponibilité** : écrire `disponible` (ou `libre`), ou `loué` (ou `réservé`).
- La **première ligne** peut rester les titres (Arrivée / Départ / Prix / Disponibilité) : elle est ignorée.

## Au quotidien

- **Une semaine est louée ?** Colonne D → `loué`. **C'est tout.**
- **Une semaine se libère ?** Colonne D → `disponible`.
- **Changer un prix ?** Modifiez la colonne C.
- **Ajouter une semaine (ou préparer l'année suivante) ?** Ajoutez une ligne avec les
  deux dates, le prix et `disponible`. Rien d'autre à faire — même pour une **nouvelle année**,
  il suffit de mettre les dates de 2027, 2028… le site suit automatiquement.
- **Retirer une semaine ?** Supprimez sa ligne.

## Publier la feuille (une seule fois)

1. Dans la feuille : **Fichier → Partager → Publier sur le web** → format **CSV** → **Publier**.
2. Vérifier aussi que le partage est « Tout le monde avec le lien : Lecteur ».
3. (Le lien est déjà connecté au site ; en cas de nouvelle feuille, transmettez-le au développeur.)

## ⚠️ Confidentialité

La feuille est **publique** (lisible par quiconque a le lien). **N'y notez jamais** de noms de
locataires, d'acomptes ou de numéros — uniquement les dates, prix et disponibilités. Pour votre
suivi des locataires, utilisez un autre document non publié.

## En cas de pépin

Si la feuille est vide, supprimée ou illisible, le site bascule tout seul sur ses valeurs de
secours (`src/data/rates.json`) : rien n'est jamais cassé. Prévenez le développeur pour resynchroniser.
