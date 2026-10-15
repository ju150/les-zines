# 📊 Gérer les disponibilités & les tarifs — Guide simple

Le site lit votre **feuille Google** et se met à jour tout seul (en ~2 minutes).

## La feuille : 6 colonnes, une ligne par semaine

| A — Arrivée | B — Départ | C — Prix | D — Disponibilité | E — Zones | F — Afficher |
|-------------|------------|----------|-------------------|-----------|--------------|
| 18/07/2026  | 25/07/2026 | 7900     | disponible        | A B C     | ✅ (TRUE)     |
| 25/07/2026  | 01/08/2026 | 9500     | loué              | A B C     | ✅ (TRUE)     |
| 29/08/2026  | 05/09/2026 | 5000     | indisponible      | A B C     | ✅ (TRUE)     |
| 26/06/2027  | 03/07/2027 | 5000     | disponible        | -         | ✅ (TRUE)     |
| 13/02/2027  | 20/02/2027 |          | disponible        | A C       | ⬜ (FALSE)    |

Le site s'occupe du reste automatiquement :
- il calcule le **mois, l'année, le nombre de nuits et le numéro de semaine** (S30…) à partir des dates ;
- il affiche « samedi → samedi » selon les vraies dates ;
- il sépare les années par un **bandeau 2026 / 2027** dès que la liste couvre deux saisons ;
- une semaine **disparaît automatiquement** du site le jour de son départ (plus besoin de la retirer).

## Règles (très courtes)

- **Colonnes A et B** : dates d'arrivée et de départ, format `JJ/MM/AAAA` (ex. `25/07/2026`).
- **Colonne C — Prix** : juste le nombre (`7900`). Laissée **vide** → le site affiche « Sur demande ».
- **Colonne D — Disponibilité** : trois valeurs possibles.

  | Ce que vous écrivez | Ce que le visiteur voit | Peut-il réserver ? |
  |---------------------|-------------------------|--------------------|
  | `disponible` (ou `libre`) | pastille verte **Disponible**, prix en vert, bouton *Réserver* | oui |
  | `loué` (ou `réservé`, `complet`) | pastille ambre **Déjà loué**, **prix barré** | non |
  | `indisponible` (ou `fermé`, `bloqué`, `travaux`) | pastille grise **Indisponible**, **prix barré** | non |

  *`loué` = quelqu'un l'a prise. `indisponible` = elle n'est pas proposée (vous l'occupez,
  travaux, etc.). Dans les deux cas la semaine reste visible, avec son prix barré.*

- **Colonne E — Zones** : les zones scolaires concernées.

  | Ce que vous écrivez | Résultat |
  |---------------------|----------|
  | `A`, `B`, `C`, ou plusieurs : `A C` | les pastilles correspondantes |
  | **vide** | le site devine (été, Toussaint, Noël → `A B C`) |
  | **`-`** (ou `aucune`, `non`) | **aucune pastille** : semaine hors vacances scolaires |

  - Rappel : le Cap Ferret est en **zone A**.
  - **Remplissez-la pour février et le printemps** (les vacances y sont décalées par zone).
  - **Mettez `-`** pour une semaine hors vacances que le site croirait à tort en vacances
    (ex. `26/06 → 03/07` : elle ne mord que de deux jours sur juillet).

- **Colonne F — Afficher** : une **case à cocher** (menu *Insertion → Case à cocher*).
  - **Cochée** = la semaine s'affiche sur le site. **Décochée** = elle reste cachée (même si sa date n'est pas passée).
  - Pratique pour **préparer la saison suivante** : saisissez les semaines à l'avance, décochées,
    puis cochez-les quand vous êtes prêt à les ouvrir à la location.
  - ⚠️ **Le piège classique** : quand on copie-colle une ligne préparée à l'avance, on copie
    aussi sa case **décochée** — la nouvelle semaine reste alors invisible sur le site.
    Si une semaine « ne se met pas à jour », **c'est presque toujours ça** : vérifiez sa case F.

## Au quotidien

- **Une semaine est louée ?** Colonne D → `loué`. **C'est tout.**
- **Une semaine se libère ?** Colonne D → `disponible`.
- **Vous gardez une semaine pour vous ?** Colonne D → `indisponible`.
- **Changer un prix ?** Colonne C.
- **Ouvrir une semaine préparée à l'avance ?** Cochez sa case en colonne F (et mettez un prix).
- **Ajouter une semaine ?** Nouvelle ligne : les 2 dates, le prix, `disponible`, les zones si besoin,
  **et cochez Afficher**.
- **Retirer une semaine ?** Supprimez sa ligne (ou décochez Afficher).

## Publier la feuille (une seule fois)

1. Dans la feuille : **Fichier → Partager → Publier sur le web** → format **CSV** → **Publier**.
2. Vérifier aussi que le partage est « Tout le monde avec le lien : Lecteur ».
3. (Le lien est déjà connecté au site ; en cas de nouvelle feuille, transmettez-le au développeur.)

## ⚠️ Confidentialité

La feuille est **publique** (lisible par quiconque a le lien). **N'y notez jamais** de noms de
locataires, d'acomptes ou de numéros — uniquement les dates, prix et disponibilités. Pour votre
suivi des locataires, utilisez un autre document non publié.

## En cas de pépin

- **Une modification n'apparaît pas ?** Le site garde la feuille en mémoire ~2 minutes :
  attendez, puis rechargez la page. Si rien ne bouge, vérifiez la case **Afficher** (colonne F)
  et que la date de départ n'est pas déjà passée.
- Si la feuille est vide, supprimée ou illisible, le site bascule tout seul sur ses valeurs de
  secours (`src/data/rates.json`) : rien n'est jamais cassé. Prévenez le développeur pour resynchroniser.
