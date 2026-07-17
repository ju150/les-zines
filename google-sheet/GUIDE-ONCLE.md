# 📊 Gérer les tarifs & disponibilités — Guide simple

Le site affiche automatiquement les tarifs et les disponibilités depuis **une feuille Google**.
Vous ne touchez jamais au site : vous cochez/décochez une case ou changez un prix dans la
feuille, et le site se met à jour tout seul (en quelques minutes).

La feuille est déjà créée et pré-remplie pour 2026 :
**« Villa Les Zines — Tarifs & disponibilités 2026 »** (dans votre Google Drive).

---

## Les colonnes

| Mois | Semaine | Du | Au | Prix | Loué | Zone A | Zone B | Zone C |
|------|---------|----|----|------|------|--------|--------|--------|
| Juillet | S31 | 25 juil. | 1 août | 7900 | ☐ | ☑ | ☑ | ☑ |
| Août | S32 | 1 août | 8 août | 9500 | ☑ | ☑ | ☑ | ☑ |

- **Prix** : juste le nombre, sans le « € » (ex. `7900`).
- **Loué** : une case à cocher. **Cochée = louée** (le site barre la semaine et masque le prix). Décochée = disponible.
- **Zone A / B / C** : cases à cocher des zones de vacances scolaires concernées par la semaine
  (l'été, les trois zones sont en vacances → cochez les trois ; en septembre, décochez tout).
- Une ligne = une semaine. Pour ajouter une semaine, ajoutez simplement une ligne en bas.

> 💡 Le site comprend aussi le texte : dans la colonne « Loué » vous pouvez écrire `oui`/`non`,
> et une seule colonne « Zones » avec `A B C` fonctionne aussi. Mais les **cases à cocher** sont
> le plus simple et le plus sûr.

---

## Une seule fois : transformer les colonnes en cases à cocher (2 min)

1. Ouvrez la feuille dans Google Sheets.
2. Sélectionnez la colonne **Loué** (les cellules, pas le titre) → menu **Insertion → Case à cocher**.
3. Faites pareil pour **Zone A**, **Zone B**, **Zone C**.
   → Les `TRUE`/`FALSE` deviennent de vraies cases à cocher.

*(Facultatif : c'est joli et pratique, mais même sans cette étape le site fonctionne, car il lit aussi `TRUE`/`FALSE`.)*

---

## Une seule fois : rendre la feuille visible par le site (1 min)

Le site a besoin de **lire** la feuille (jamais de la modifier). Deux options, au choix :

- **Simple** : bouton **Partager** (en haut à droite) → « Accès général » → **« Tout utilisateur disposant du lien »** → rôle **Lecteur** → Terminé.
- *(ou)* **Fichier → Partager → Publier sur le web**.

C'est tout : le site est déjà branché sur cette feuille. Dès qu'elle est partagée, les valeurs
s'affichent en ligne.

---

## Au quotidien

- Une semaine est réservée ? **Cochez la case « Loué ».** Le site la barre et masque le prix. ✅
- Une semaine se libère ? **Décochez** la case.
- Un prix change ? Modifiez la case **Prix**.
- Nouvelle semaine ? Ajoutez une ligne (Mois, Semaine `S40`, Du, Au, Prix, puis les cases).

> Tant que la feuille n'est pas partagée, le site affiche des valeurs de secours déjà correctes
> (`src/data/rates.json`) — donc rien n'est jamais cassé, même en cas de souci.
