EVENTS by Raphaël — Guide de mise en route
==========================================

CONTENU DU DOSSIER
- index.html       : pages du site (invitation, connexion, tableau de bord)
- style.css       : apparence et couleurs
- app.js          : fonctionnement et connexion Supabase
- config.js       : URL et clé publique Supabase à compléter
- supabase.sql    : tables et règles de sécurité à exécuter dans Supabase

IMPORTANT AVANT DE COMMENCER
1. Demande à un parent de t'accompagner pour les comptes et la gestion des données familiales.
2. Ne publie pas l'adresse complète de la maison sur une invitation accessible par lien.
   Utilise par exemple « Clermont-Ferrand — adresse communiquée aux invités ».
3. Ne mets JAMAIS une clé Supabase service_role / secret dans config.js.
4. Le dépôt GitHub contient le code public du site. Ne mets aucun nom, adresse, mot de passe
   ou liste d'invités dans les fichiers du dépôt.

ÉTAPE A — CRÉER LE PROJET SUPABASE
1. Ouvre https://supabase.com et crée un projet (avec l'aide d'un parent).
2. Dans le projet, ouvre SQL Editor puis New query.
3. Ouvre le fichier supabase.sql de ce dossier, copie tout son contenu et colle-le dans SQL Editor.
4. Clique Run. Les tables events et rsvps et les règles RLS seront créées.

ÉTAPE B — CRÉER LE COMPTE ADMINISTRATEUR
1. Dans Supabase, ouvre Authentication > Users.
2. Ajoute un utilisateur avec une adresse e-mail et un mot de passe fort.
3. Dans Authentication > Providers / Sign In, désactive les inscriptions publiques (Allow new users to sign up).
4. Garde l'accès administrateur privé. Ne partage jamais le mot de passe.
Note : selon l'interface Supabase, la création d'utilisateur peut se trouver dans le bouton Add user.

ÉTAPE C — RÉCUPÉRER LES DEUX INFORMATIONS SUPABASE
1. Ouvre Project Settings > API (ou Connect).
2. Copie l'URL du projet.
3. Copie la clé publique « anon » ou « publishable ».
4. Ouvre config.js et remplace :
   COLLE_ICI_URL_SUPABASE
   COLLE_ICI_CLE_PUBLIQUE_SUPABASE
   par les valeurs de ton projet.
La clé publique est prévue pour le navigateur et doit toujours être protégée par les politiques RLS.
Ne copie jamais la clé service_role ou une clé secrète.

ÉTAPE D — ENVOYER LES FICHIERS SUR GITHUB
1. Ouvre https://github.com et crée un dépôt nommé events-by-raphael.
2. Choisis Public pour GitHub Pages.
3. Dans le dépôt, clique Add file > Upload files.
4. Décompresse le ZIP sur ton ordinateur.
5. Glisse les fichiers index.html, style.css, app.js et config.js à la racine du dépôt.
   (Tu peux aussi ajouter README-GUIDE.txt et supabase.sql, mais ces fichiers ne sont pas nécessaires
   au fonctionnement public. Pour plus de prudence, conserve supabase.sql hors du dépôt public.)
6. Clique Commit changes.

ÉTAPE E — PUBLIER AVEC GITHUB PAGES
1. Dans le dépôt GitHub, ouvre Settings > Pages.
2. Dans Build and deployment, choisis Deploy from a branch.
3. Sélectionne la branche main et le dossier /(root).
4. Clique Save.
5. Attends la fin de la publication. GitHub affichera l'adresse de ton site dans Settings > Pages.
6. Ouvre l'adresse publiée pour vérifier que la page d'accueil s'affiche.

UTILISER LE SITE
- Sur la page d'accueil, clique Administration.
- Connecte-toi avec le compte créé dans Supabase.
- Clique Nouvel événement pour créer un événement.
- Ouvre un événement pour voir ses réponses et copier son lien d'invitation.
- Les invités ouvrent le lien et remplissent le formulaire.
- Dans l'administration, clique Modifier pour changer une réponse.
- Clique Supprimer pour effacer une réponse.
- Tu peux aussi modifier ou supprimer un événement.
- La suppression d'un événement supprime également toutes ses réponses (confirmation demandée).
- Pour cacher temporairement une invitation, modifie l'événement et décoche « Invitation accessible aux invités ».

LIMITES ET CONSEILS
- Le formulaire public permet d'envoyer une réponse, mais pas de consulter ou modifier une réponse existante.
  L'administrateur peut modifier et supprimer toutes les réponses dans son espace.
- Les visiteurs ne peuvent pas lire la liste des invités ni les réponses des autres grâce à RLS.
- Cette première version n'a pas de validation par e-mail ni de protection anti-spam avancée.
  Ne diffuse le lien qu'aux personnes invitées et surveille les réponses.
- Les liens sont basés sur un identifiant lisible (slug). Pour une fête privée, partage le lien seulement
  avec les invités et ne publie pas l'adresse complète.
- Le nombre de personnes présentes est calculé à partir des réponses marquées « présent ».
- Pour une absence, le nombre de personnes est enregistré à zéro.
