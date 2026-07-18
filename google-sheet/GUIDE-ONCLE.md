# 📊 Gérer les disponibilités & les tarifs — Guide simple

Le site lit votre **feuille Google** et se met à jour tout seul (en ~2 minutes).

## La feuille : 6 colonnes, une ligne par semaine

| A — Arrivée | B — Départ | C — Prix | D — Disponibilité | E — Zones | F — Afficher |
|-------------|------------|----------|-------------------|-----------|--------------|
| 18/07/2026  | 25/07/2026 | 7900     | disponible        | A B C     | ✅ (TRUE)     |
| 13/02/2027  | 20/02/2027 |          | disponible        | A C       | ⬜ (FALSE)    |

Le site s'occupe du reste automatiquement :
- il calcule le **mois, l'année, le nombre de nuits et le numéro de semaine** (S30…) à partir des dates ;
- il affiche « samedi → samedi » selon les vraies dates ;
- une semaine **disparaît automatiquement** du site le jour de son départ (plus besoin de la retirer).

## Règles (très courtes)

- **Colonnes A et B** : dates d'arrivée et de départ, format `JJ/MM/AAAA` (ex. `25/07/2026`).
- **Colonne C — Prix** : juste le nombre (`7900`). Laissée **vide** → le site affiche « Sur demande ».
- **Colonne D — Disponibilité** : `disponible` (ou `libre`), ou `loué` (ou `réservé`).
- **Colonne E — Zones** : les zones scolaires concernées (`A`, `B`, `C`, ou plusieurs `A C`).
  - **Laissez vide pour l'été, la Toussaint et Noël** : le site met « toutes zones » tout seul.
  - **Remplissez-la pour février et le printemps** (les vacances y sont décalées par zone).
  - Rappel : le Cap Ferret est en **zone A**.
- **Colonne F — Afficher** : une **case à cocher** (menu *Insertion → Case à cocher*).
  - **Cochée** = la semaine s'affiche sur le site. **Décochée** = elle reste cachée (même si sa date n'est pas passée).
  - Pratique pour **préparer la saison suivante** : saisissez les semaines à l'avance, décochées,
    puis cochez-les quand vous êtes prêt à les ouvrir à la location.

## Au quotidien

- **Une semaine est louée ?** Colonne D → `loué`. **C'est tout.**
- **Une semaine se libère ?** Colonne D → `disponible`.
- **Changer un prix ?** Colonne C.
- **Ouvrir une semaine préparée à l'avance ?** Cochez sa case en colonne F (et mettez un prix).
- **Ajouter une semaine ?** Nouvelle ligne : les 2 dates, le prix, `disponible`, les zones si besoin, cochez Afficher.
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

Si la feuille est vide, supprimée ou illisible, le site bascule tout seul sur ses valeurs de
secours (`src/data/rates.json`) : rien n'est jamais cassé. Prévenez le développeur pour resynchroniser.
