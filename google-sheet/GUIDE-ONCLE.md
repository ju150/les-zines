# 📊 Gérer les tarifs & disponibilités — Guide simple

Le site affiche automatiquement les tarifs et les disponibilités depuis **une feuille Google** que vous
modifiez comme d'habitude. Rien à toucher dans le site : vous changez un prix ou une disponibilité dans
la feuille, et le site se met à jour tout seul.

## 1) Créer la feuille (une seule fois)

1. Ouvrez **Google Sheets** (sheets.google.com) → nouvelle feuille de calcul.
2. Importez le modèle `tarifs-modele.csv` (Fichier → Importer → Importer le fichier), **ou** recopiez les colonnes :

| Mois | Semaine | Du | Au | Prix | Disponibilité |
|------|---------|----|----|------|---------------|
| Juillet | S29 | 11 juil. | 18 juil. | 6900 | disponible |
| Août | S32 | 1 août | 8 août | 9500 | loué |

**Règles :**
- Colonne **Prix** : juste le nombre, sans le « € » (ex. `6900`).
- Colonne **Disponibilité** : écrire `disponible` ou `loué` (ou `réservé`).
- Une ligne = une semaine.

## 2) Publier la feuille sur le web (une seule fois)

1. Dans la feuille : **Fichier → Partager → Publier sur le web**.
2. Onglet **« Lien »** → choisir **« Valeurs séparées par des virgules (.csv) »**.
3. Cliquer **Publier** → copier le lien qui se termine par `output=csv`.
4. M'envoyer ce lien (ou le coller dans `src/data/site.ts`, champ `ratesSheetCsv`).

## 3) Au quotidien

- Une semaine est réservée ? Changez `disponible` → `loué`. **C'est tout.**
- Un prix change ? Modifiez la case **Prix**.
- Le site reprend automatiquement les nouvelles valeurs (rafraîchissement à chaque visite).

> Tant que le lien n'est pas renseigné, le site affiche les valeurs de secours (`src/data/rates.json`),
> déjà remplies avec les tarifs 2026 actuels — donc rien n'est jamais cassé.
