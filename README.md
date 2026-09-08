# Site Coolok, version statique sur Cloudflare

> Code © MKZ Consulting, contenus, textes et images © Coolok Services. Tous droits réservés : ce dépôt est public pour la transparence et la référence, il n'accorde aucune licence de réutilisation du code ni des contenus. Site en production : https://www.coolok.co

Refonte du site www.coolok.co en HTML statique, généré par un script Node sans aucune dépendance et servi par un Worker Cloudflare. Version de développement en ligne : https://coolok-dev.mkzcons.workers.dev/ (fermée aux robots, canonicals pointant déjà vers www.coolok.co).

## Démarrer

```bash
node build.js --env dev
```

Le build écrit `dist/` (HTML, sitemap, robots, llms.txt, llms-full.txt, _headers, _redirects, manifest.json) et refuse de livrer si une règle est violée. Pour publier sur le site de développement :

```bash
node deploy.js --name coolok-dev
```

Le déploiement lit la variable d'environnement `CLOUDFLARE_API_TOKEN_COOLOK` et l'identifiant de compte Cloudflare (option `--account`, variable `CLOUDFLARE_ACCOUNT_ID_COOLOK`, ou fichier local `.deploy.json` ignoré par git), envoie `dist/` en assets statiques et met à jour le Worker. Ajouter `--no-subdomain` pour ne pas retoucher l'URL workers.dev, `--secret CLE=VALEUR` pour poser un secret.

## Ce que le build refuse (échec en code 1)

| Contrôle | Seuil |
|---|---|
| Title | 65 caractères au plus |
| Meta description | 160 caractères au plus |
| H1 | exactement un par page |
| Expression « gestion locative » | interdite (carte professionnelle non détenue) |
| Tiret long ou demi-cadratin | interdits |
| Tutoiement | interdit (le site vouvoie) |
| Ancien tarif « à partir de 14 % » | interdit |
| Lien interne | doit exister dans le site |
| Image | le fichier doit exister dans `assets/img` |
| Action (bouton, formulaire, téléphone, WhatsApp) | au moins une tous les 8 000 caractères de texte |
| JSON-LD | valide, et conforme aux règles Search Console (ItemList à items complets, BreadcrumbList, FAQPage, Article) |
| FAQ d'article | au moins une question en ### sous le H2 FAQ, sinon ni accordéon ni FAQPage |
| Valeur non convertie en texte | interdite (« [object Object] ») |
| Adresse web brute dans le texte | interdite (illisible, et insécable elle casse la mise en page mobile) |
| Balise HTML échappée visible | interdite (« <strong> » affiché en toutes lettres) |
| Acronyme ou nom de domaine accentué | interdits (« INSée », « sante.defense.gouv.fr ») |
| Phrase coupée sur un mot-outil | interdite (« 41,7 % de. ») |

Avertissements non bloquants : page de moins de 300 mots, FAQ de moins de 4 questions, image sans alt, première action après 1 500 caractères, date 2025 non contextualisée.

## Recette avant toute livraison

```bash
node build.js --env dev
node check-duplication.js
node "%USERPROFILE%/.claude/skills/livraison-web/scripts/verify-livraison.js" https://coolok-dev.mkzcons.workers.dev
```

`check-duplication.js` mesure ce que deux pages du même type partagent réellement, hors blocs communs par construction (tarif, avis, bandes d'action, grilles de liens). Le seuil de recette est de 30 % : au-delà, le script sort en code 1. Mesure de référence sur l'ancien site : 63 % entre communes et 81 % entre départements.

## Arborescence

```
site/
  build.js              générateur (entrée unique)
  deploy.js             déploiement Cloudflare Workers, sans wrangler
  CONTENT-SCHEMA.md     contrat de contenu : types de pages, blocs, champs (à lire avant d'écrire)
  content/
    site.json           identité, navigation, footer, tarifs, témoignages, partenaires, redirections, tracking
    pages/*.json        accueil, services, tarifs, simulateur, contact, équipe, logements, blog, hub, légal, merci, 404
    communes/*.json     26 communes + Fontainebleau et Melun
    departements/*.json 8 départements
    zones/*.json        zone Val d'Europe et Marne-la-Vallée
    articles/*.md       guides (Markdown + frontmatter)
  lib/                  html.js (échappement, slugs), md.js (Markdown), schema.js (JSON-LD + validateur)
  templates/            layout.js (head, header, footer), blocks.js (bibliothèque de blocs), pages.js (composition par type)
  assets/css/site.css   feuille de style unique, mobile first, sans police web externe
  assets/js/site.js     menu, formulaires, simulateur (le site fonctionne sans JavaScript, sauf le simulateur)
  assets/img/           images optimisées en WebP (heros, articles, logements, partenaires, logo)
  worker/index.js       Worker : assets, redirections 301, en-têtes de sécurité, API des formulaires
  dist/                 sortie du build (jamais éditée à la main)
```

## Dépôt git

Le dossier `site/` est un dépôt git depuis le 9 septembre 2026 (branche `main`, identité d'auteur locale MKZ, `dist/` ignoré car régénéré par le build, fins de ligne LF forcées par `.gitattributes`). Aucun dépôt distant configuré à ce jour. Le dossier client parent, lui, n'est pas un dépôt : il porte le `.env` et les documents du client.

## Formulaires et leads

Le Worker expose `POST /api/lead`. Chaque demande est écrite dans la table Softr « Leads site » (identifiants de base et de table dans les secrets du Worker), visible dans le studio Softr de Coolok, puis le visiteur est redirigé vers `/merci-contact` ou `/merci-simulateur`, pages qui déclenchent les événements clés GA4 déjà configurés.

Secrets attendus sur le Worker : `SOFTR_API_KEY`, `SOFTR_DB`, `SOFTR_TABLE`, `SOFTR_FIELDS` (correspondance champ vers identifiant Softr), et facultativement `LEAD_WEBHOOK` pour une notification par email. Un pot de miel bloque les robots sans message d'erreur, et le consentement est obligatoire.

## Migration vers www.coolok.co (non faite)

1. Construire en production : `node build.js --env prod` (active le tracking GA4, GTM, Clarity, Hotjar, pixel et la bannière iubenda, ouvre robots.txt).
2. Déployer sur un Worker de production, puis attacher le domaine `www.coolok.co` au Worker (Cloudflare, onglet Domaines et routes du Worker), après avoir retiré la route du Worker `coolok-seo-edge` qui sert aujourd'hui le site Softr.
3. Vérifier les 301 : elles sont dans `worker/index.js` et dans `content/site.json`, elles reprennent les redirections déjà en place plus les deux fusions d'articles décidées à la refonte.
4. Dérouler le skill `livraison-web` : `node verify-livraison.js https://www.coolok.co`, passe mobile 375 px, puis soumission du sitemap et demandes d'indexation dans Search Console.

## Décisions de fond, avec leur mesure

- Les 53 URL du sitemap actuel sont conservées à l'identique : aucune n'est à zéro impression sur 90 jours (Search Console, 2 juin au 31 août 2026).
- Deux articles sont fusionnés par 301 vers la page qui capte déjà la requête : `/blog/simulateur-airbnb-2026` vers `/simulateur-locatif` et `/blog/airbnb-ou-location-classique` vers `/blog/rentabilite-airbnb-ile-de-france-methode` (cannibalisation mesurée sur « simulateur airbnb » et « rentabilité location airbnb paris »).
- Trois pages nouvelles : `/tarifs` (1 680 recherches par mois sur le cluster prix), `/conciergerie-airbnb-val-d-europe` (140 plus 40 recherches par mois, aucune page aujourd'hui), `/conciergerie-airbnb-fontainebleau` et `/conciergerie-airbnb-melun` (90 et 50 recherches par mois).
- Le simulateur passe de huit champs obligatoires avec adresse exacte à trois questions sans adresse, avec l'estimation affichée avant toute demande de coordonnées.
- Chaque page géographique porte des données propres : réglementation relevée commune par commune sur les sources officielles en septembre 2026, faits locaux sourcés et datés, prix relevés sur Airbnb pour sept communes.
- Remontées de Thierry Moraldo du 5 septembre 2026 sur l'accueil (fichier update/Nouveau site web.docx) intégrées le jour même : nouveau H1, promesse d'audit chiffré portée de 24 h à 48 h sur tout le site (83 occurrences dans le contenu, les gabarits et le simulateur), les promesses de simple réponse à un message restant à 24 h ouvrées ; liste « tout compris », note de ménage et signature du pied de page alignées sur ses formulations. Après un déploiement, la première lecture du site peut encore servir l'ancienne version depuis le cache edge (CF-Cache-Status HIT malgré max-age=0) : attendre la propagation (une vingtaine de secondes) et comparer l'ETag servi au sha256 tronqué à 32 caractères du fichier de dist avant de conclure à un échec.
- Documents 2 et 3 de Thierry Moraldo du 8 septembre 2026 (dossier update) intégrés le jour même : texte sous le H1 de l'accueil (« on s'occupe de tout, et vous encaissez »), et vingt formulations de la page services (accompagnement à la place de mandat, boîtier connecté à la place de serrure, tableau de bord 24/7 à la place du relevé mensuel, accès autonome, phrase loi Hoguet retirée de l'encart, FAQ réécrites dont le plafond de 90 jours consécutifs). Thierry remplace systématiquement le verbe gérer (s'occuper, faire) : la passe globale est faite le jour même (ligne suivante). Preuve de la version servie après déploiement : l'ETag renvoyé par le worker est le sha256 du fichier de dist tronqué à 32 caractères ; un paramètre d'URL ne contourne rien, c'est la propagation (une vingtaine de secondes) qui joue.
- Le verbe gérer est banni du site depuis le 8 septembre 2026 (demande de Mickaël, dans la ligne des remontées de Thierry, qui n'a pas de carte professionnelle) : 43 occurrences réécrites dans 20 fichiers (alt des logements « confié à Coolok », pied de page « Logements confiés », meta description de l'accueil « Coolok s'occupe de », questions de FAQ en « acceptez-vous », « prenez-vous en charge », « organisez-vous », option du simulateur « déjà confié à une autre conciergerie », guides). Seule exception : l'avis Google de Nicolas (« la conciergerie gère les réservations »), verbatim client intouchable, visible sur l'accueil et dans llms-full.txt. Contrôle : chercher toutes les formes avec un motif qui couvre gér, gèr et ger (« gère » échappait à une première sonde en g[ée]r).
- Guide « meilleure conciergerie Airbnb » aligné le 8 septembre 2026 sur le DOCX corrigé par Thierry Moraldo (article/Article-Meilleure-Conciergerie-Airbnb-2026-corrige-thierry-20260908.docx), pendant qu'une autre session le mettait en production sur Softr : 12 questions deviennent 10 (la question sur le ménage encaissé et celle sur les références de propriétaires disparaissent, la simulation sur 12 mois, l'expertise locale et les dégâts sont réécrites), tableau et méthode refaits, tribune retouchée par Thierry donc publiée sans badge « à valider ». Écarts assumés par rapport au DOCX : le compte de questions harmonisé à 10 partout (le DOCX disait encore 12 dans l'encadré, l'intro et le titre du tableau), deux « gère » réécrits (règle du site), « salade niçoise où personne ne maîtrise plus rien » (grammaire). Au passage la FAQ de ce guide passe au format du contrat de contenu (« Questions fréquentes » et questions en ###) : elle ne produisait aucune FAQPage jusque-là, elle en produit une à 5 questions, et le champ related alimente l'encart « À lire aussi ».
- FAQ des guides, 8 septembre 2026 : trois guides (meilleure conciergerie, DPE, tarif) avaient leur FAQ écrite en questions en gras sous un H2 « FAQ », format que le générateur n'extrait pas : aucun accordéon, aucune FAQPage, et le manifeste disait faq: 0 sans que rien n'échoue. Les trois sont passés au format du contrat (questions en ###), les neuf guides produisent désormais une FAQPage, et le build refuse depuis ce jour toute section FAQ d'article sans question en ### (garde contre-mesurée par un guide de test). Même jour, débordement mobile trouvé sur les guides DPE (503 px) et tarif (693 px) pour un écran de 375 : dans l'encadré « L'essentiel » et les listes à coche, la puce était en display: flex, et un mot en gras dans la puce devenait un enfant flex séparé posé à droite du texte. Les puces sont désormais en block avec l'icône en position absolue ; vérifié à 375 px sur les deux guides et la page tarifs (scrollWidth = 375, icônes à gauche à 0 px).
