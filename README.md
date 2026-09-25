# Coolok, conciergerie Airbnb en Île-de-France : le site et son générateur

> Code © MKZ Consulting, contenus, textes et images © Coolok Services. Tous droits réservés : ce dépôt est public pour la transparence et la référence, il n'accorde aucune licence de réutilisation du code ni des contenus. Site en production : https://www.coolok.co

Ce dépôt contient le site de [Coolok](https://www.coolok.co), conciergerie Airbnb et location courte durée en Île-de-France, et le générateur statique qui le produit. La première partie présente l'entreprise, son offre et ses pages. La seconde documente le code : générateur Node sans aucune dépendance, contrôles de livraison bloquants, déploiement sur Cloudflare Workers.

## Coolok en bref

Coolok Services est une conciergerie de meublés de tourisme basée à Joinville-le-Pont, dans le Val-de-Marne, fondée par Thierry Moraldo, investisseur immobilier depuis plus de dix ans et propriétaire bailleur avant d'être concierge. Coolok s'occupe de votre logement sur Airbnb et Booking.com dans les huit départements d'Île-de-France, avec un ancrage fort autour de Disneyland Paris et du Val d'Europe, dans le Val-de-Marne, à Versailles et à Fontainebleau, ainsi qu'à Reims.

Les repères affichés sur le site :

- Une commission unique de 20 % HT des revenus encaissés, tout compris, payée au résultat : pas de revenus, pas de commission.
- Une note Google de 4,8 sur 5 pour 21 avis, relevée le 2 septembre 2026.
- Un audit chiffré du logement sous 48 heures, gratuit et sans engagement, réalisé par le fondateur.
- Tous les clients de Coolok sont Superhôtes sur Airbnb.
- Plus 40 % de revenus en moyenne face à une location pilotée en solo, selon les relevés de Coolok.

Pour en savoir plus sur l'équipe : [qui sommes-nous](https://www.coolok.co/qui-sommes-nous) et [les logements que Coolok fait vivre](https://www.coolok.co/logements).

## Ce que Coolok prend en charge

Le parcours d'un propriétaire tient en trois étapes.

1. **Vous recevez votre audit chiffré sous 48 h.** Vous renseignez votre commune et votre logement en deux minutes, puis Thierry vous rappelle avec un audit réel du marché, la réglementation de votre commune et ce qu'il faut préparer.
2. **Coolok prépare l'annonce et le logement.** Photos professionnelles, annonce rédigée, équipements et linge conseillés, boîtier à clé connecté, diffusion sur Airbnb et Booking.com avec calendriers synchronisés par Beds24, grille de prix construite sur les données de votre marché local.
3. **Vous encaissez, Coolok travaille.** Sélection des voyageurs, assistance 24/7, ménage et linge entre chaque séjour, maintenance, échanges avec les voyageurs.

Tout est compris dans la commission :

- Annonce rédigée et photos professionnelles
- Diffusion Airbnb et Booking.com, calendriers synchronisés
- Tarification dynamique ajustée en temps réel, orchestrée avec PriceLabs à partir des données de marché AirDNA
- Sélection et messages avec les voyageurs
- Accueil, boîtiers connectés Igloohome ou TTLock, assistance 24/7
- Ménage professionnel et linge hôtelier entre chaque séjour
- Maintenance et petites réparations coordonnées avec des artisans qualifiés
- Suivi de la réglementation et conformité : numéro d'enregistrement, changement d'usage, loi Le Meur
- Accès à votre tableau de bord 24/7
- Vos dates bloquées quand vous le souhaitez

Ce que Coolok ne fait pas : ni prestation à la carte (pas de ménage seul, pas d'accueil seul), ni location longue durée, ni bail mobilité, ni intermédiation immobilière. Coolok refuse les logements que la réglementation locale ne permet pas d'exploiter, même quand le propriétaire insiste. Le détail est sur la page [services de conciergerie Airbnb](https://www.coolok.co/services).

## Une commission unique de 20 % HT, payée au résultat

- 20 % HT des revenus que votre logement encaisse réellement, sans frais d'entrée ni forfait mensuel.
- Le ménage est facturé au voyageur selon la typologie du logement.
- Le contrat court sur douze mois, le temps d'une saison complète : c'est la durée nécessaire pour construire l'historique de réservations et les avis qui font monter une annonce.
- À titre de comparaison, les commissions relevées sur les pages tarifs publiques du marché français en juin 2026 vont de 15 à 30 %.

Le [simulateur de revenus Airbnb](https://www.coolok.co/simulateur-locatif) donne en trois questions, sans adresse exacte, la fourchette de revenus observée dans votre commune, puis Thierry envoie l'audit chiffré sous 48 h. La page tarifs détaillée arrive avec la migration du site vers cette version : sa source est dans ce dépôt, [content/pages/tarifs.json](content/pages/tarifs.json).

## Où Coolok intervient

Chaque page de zone porte ses propres données : prix par nuit observé, taux d'occupation et revenu mensuel estimé (données AirDNA croisées avec les plateformes, juillet 2026), réglementation relevée commune par commune sur les sources officielles en septembre 2026, faits locaux sourcés et datés, questions fréquentes locales. Le catalogue complet est sur la page [conciergerie Airbnb en Île-de-France, département par département](https://www.coolok.co/conciergerie-airbnb-ile-de-france).

| Département | Page | Communes |
|---|---|---|
| Seine-et-Marne (77) | [Conciergerie Airbnb en Seine-et-Marne](https://www.coolok.co/conciergerie-airbnb-seine-et-marne) | [Chessy](https://www.coolok.co/conciergerie-airbnb-chessy), [Serris](https://www.coolok.co/conciergerie-airbnb-serris), [Magny-le-Hongre](https://www.coolok.co/conciergerie-airbnb-magny-le-hongre), [Bailly-Romainvilliers](https://www.coolok.co/conciergerie-airbnb-bailly-romainvilliers), [Bussy-Saint-Georges](https://www.coolok.co/conciergerie-airbnb-bussy-saint-georges), [Chalifert](https://www.coolok.co/conciergerie-airbnb-chalifert), Fontainebleau et Melun (pages à venir avec la migration) |
| Val-de-Marne (94) | [Conciergerie Airbnb dans le Val-de-Marne](https://www.coolok.co/conciergerie-airbnb-val-de-marne) | [Vincennes](https://www.coolok.co/conciergerie-airbnb-vincennes), [Saint-Mandé](https://www.coolok.co/conciergerie-airbnb-saint-mande), [Joinville-le-Pont](https://www.coolok.co/conciergerie-airbnb-joinville-le-pont), [Nogent-sur-Marne](https://www.coolok.co/conciergerie-airbnb-nogent-sur-marne), [Saint-Maur-des-Fossés](https://www.coolok.co/conciergerie-airbnb-saint-maur-des-fosses), [Charenton-le-Pont](https://www.coolok.co/conciergerie-airbnb-charenton-le-pont), [Saint-Maurice](https://www.coolok.co/conciergerie-airbnb-saint-maurice), [Maisons-Alfort](https://www.coolok.co/conciergerie-airbnb-maisons-alfort), [Alfortville](https://www.coolok.co/conciergerie-airbnb-alfortville), [Ivry-sur-Seine](https://www.coolok.co/conciergerie-airbnb-ivry-sur-seine), [Villejuif](https://www.coolok.co/conciergerie-airbnb-villejuif), [Chennevières-sur-Marne](https://www.coolok.co/conciergerie-airbnb-chennevieres-sur-marne) |
| Seine-Saint-Denis (93) | [Conciergerie Airbnb en Seine-Saint-Denis](https://www.coolok.co/conciergerie-airbnb-seine-saint-denis) | [Montreuil](https://www.coolok.co/conciergerie-airbnb-montreuil), [Pantin](https://www.coolok.co/conciergerie-airbnb-pantin) |
| Hauts-de-Seine (92) | [Conciergerie Airbnb dans les Hauts-de-Seine](https://www.coolok.co/conciergerie-airbnb-hauts-de-seine) | [Clichy](https://www.coolok.co/conciergerie-airbnb-clichy), [Vanves](https://www.coolok.co/conciergerie-airbnb-vanves), [Asnières-sur-Seine](https://www.coolok.co/conciergerie-airbnb-asnieres-sur-seine) |
| Yvelines (78) | [Conciergerie Airbnb dans les Yvelines](https://www.coolok.co/conciergerie-airbnb-yvelines) | [Versailles](https://www.coolok.co/conciergerie-airbnb-versailles), [Saint-Germain-en-Laye](https://www.coolok.co/conciergerie-airbnb-saint-germain-en-laye) |
| Paris (75) | [Conciergerie Airbnb à Paris : ce qui reste possible](https://www.coolok.co/conciergerie-airbnb-paris) | intra-muros, au cas par cas selon la réglementation |
| Essonne (91) | [Conciergerie Airbnb en Essonne](https://www.coolok.co/conciergerie-airbnb-essonne) | grande couronne sud |
| Val-d'Oise (95) | [Conciergerie Airbnb dans le Val-d'Oise](https://www.coolok.co/conciergerie-airbnb-val-d-oise) | grande couronne nord |
| Marne (51) | [Conciergerie à Reims](https://www.coolok.co/conciergerie-airbnb-reims) | Reims, au pied de la cathédrale |

La page dédiée au Val d'Europe, à Marne-la-Vallée et à Disneyland Paris arrive avec la migration : sa source est dans [content/zones/val-d-europe.json](content/zones/val-d-europe.json).

## Les guides de la location courte durée

Neuf guides écrits pour les propriétaires, chiffrés et sourcés, avec le mot du fondateur et une FAQ :

- [Conciergerie location courte durée : le guide complet 2026](https://www.coolok.co/blog/conciergerie-courte-duree)
- [Tarif d'une conciergerie Airbnb : ce que vous payez vraiment](https://www.coolok.co/blog/tarif-conciergerie-airbnb)
- [Meilleure conciergerie Airbnb : les 10 questions à poser avant de signer](https://www.coolok.co/blog/meilleure-conciergerie-airbnb)
- [Loi Le Meur : ce qui change vraiment pour votre location courte durée](https://www.coolok.co/blog/loi-le-meur)
- [Location courte durée : les nouvelles règles 2026 et la règle des 90 jours](https://www.coolok.co/blog/lcd-guide-complet)
- [DPE et Airbnb : obligatoire ou pas ? Le vrai calendrier](https://www.coolok.co/blog/dpe-airbnb)
- [Rentabilité Airbnb en Île-de-France : brut, net, cashflow](https://www.coolok.co/blog/rentabilite-airbnb-ile-de-france-methode)
- [Investissement locatif Airbnb : réussir en Île-de-France en 2026](https://www.coolok.co/blog/investir-location)
- [Location courte durée à Paris : les règles 2026 et où va la rentabilité](https://www.coolok.co/blog/location-paris-courte-duree)

Tous les guides : [www.coolok.co/blog](https://www.coolok.co/blog).

## Contact

- Téléphone : 06 73 93 75 01, WhatsApp sur le même numéro
- Email : contact@coolok.co
- Rendez-vous de 30 minutes avec le fondateur et formulaire : [page contact](https://www.coolok.co/contact)
- Coolok Services SASU, 4 avenue Oudinot, 94340 Joinville-le-Pont

## Le dépôt : un site statique sans dépendance, déployé sur Cloudflare Workers

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
| Action (lien vers le simulateur ou le contact, téléphone, e-mail, WhatsApp, rendez-vous, formulaire ; un bouton vers une autre page ne compte pas) | au moins une tous les 8 000 caractères de texte |
| JSON-LD | valide, et conforme aux règles Search Console (ItemList à items complets, BreadcrumbList, FAQPage, Article) |
| FAQ d'article | au moins une question en ### sous le H2 FAQ, sinon ni accordéon ni FAQPage |
| Valeur non convertie en texte | interdite (« [object Object] ») |
| Adresse web brute dans le texte | interdite (illisible, et insécable elle casse la mise en page mobile) |
| Balise HTML échappée visible | interdite (« <strong> » affiché en toutes lettres) |
| Acronyme ou nom de domaine accentué | interdits (« INSée », « sante.defense.gouv.fr ») |
| Phrase coupée sur un mot-outil | interdite (« 41,7 % de. ») |

Avertissements non bloquants : page de moins de 300 mots, FAQ de moins de 4 questions, image sans alt, première action après 1 500 caractères, date 2025 non contextualisée.

## Recette avant toute livraison

La recette se juge sur un build de PRODUCTION écrit hors du dépôt : le build de dev pose `noindex` partout et produit une erreur par page. Commande complète, à lancer depuis PowerShell (Git Bash réécrit les arguments qui commencent par une barre) :

```powershell
node build.js --env prod --out "$env:TEMP\coolok-dist-prod"
node check-duplication.js --dist "$env:TEMP\coolok-dist-prod"
node "$env:USERPROFILE\.claude\skills\livraison-web\scripts\verify-livraison.js" --local "$env:TEMP\coolok-dist-prod" "--noindex=/merci-contact,/merci-simulateur" "--cta=(^|/)(contact|simulateur-locatif)/?($|[?#])|calendly\.com|^tel:|^mailto:|wa\.me"
```

Deux réglages propres à Coolok, à garder tels quels dans chaque recette :

- `--cta` : sur ce site, le simulateur de revenus EST l'action principale (événement clé GA4 `simulateur_complete`), le motif par défaut du script ne le compte pas. Mesuré le 25/09/2026 sur le même build : 42 erreurs au motif par défaut, 19 au motif Coolok, dont 13 pages géographiques réellement au-delà de 8 000 caractères sans action. Toujours comparer un avant et un après au même motif.
- `--noindex` : `/merci-contact` et `/merci-simulateur` sont volontairement hors index (pages de conversion GA4, absentes du sitemap). L'option rend leur `noindex` obligatoire : s'il disparaît, la recette sort en erreur.

Résultat attendu au 25/09/2026 : 0 erreur, 1 attention (la page 404 n'a pas de JSON-LD, ce qui est normal). `check-duplication.js` mesure ce que deux pages du même type partagent réellement, hors blocs communs par construction (tarif, avis, bandes et rappels d'action, relance de fin de FAQ, grilles de liens). Le seuil de recette est de 30 % : au-delà, le script sort en code 1. Mesure de référence sur l'ancien site : 63 % entre communes et 81 % entre départements ; sur ce site au 25/09/2026, 11,8 % entre communes, 5,4 % entre départements, 6,1 % entre guides.

Passe mobile : à 375 px, `scrollWidth` égal à la largeur de l'écran sur chaque page, cibles d'au moins 44 px, et au plus 5 000 px entre deux liens d'action (correction obligatoire au-delà de 6 000). Après un déploiement, comparer l'ETag servi au sha256 tronqué à 32 caractères du fichier de `dist` avant de mesurer, depuis le client qui mesure.

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
- Parcours visiteur, 25 septembre 2026 : la recette `verify-livraison.js` sortait 42 erreurs, identiques sur le dernier commit et sur l'arbre de travail du jour, donc préexistantes. Les 36 pages géographiques tenaient 8 600 à 13 400 caractères sans lien d'action entre le héros et la bande finale, parce que les sections écrites pour chaque commune n'en portent pas. Correction dans le gabarit, aucun texte de page modifié : `templates/pages.js` (fonction `rythmerActions`) rend chaque bloc d'une page géographique, compte son texte, et insère un rappel d'action (bloc `midcta`, trois formulations en rotation, toujours un contact direct : WhatsApp, rendez-vous ou téléphone) avant le bloc qui ferait dépasser 4 000 caractères sans action ; le bloc tarif porte par défaut un second bouton « Réserver un appel » (`cta2: false` pour le retirer) ; chaque FAQ se termine par une relance WhatsApp et téléphone (`more: false` pour la retirer). Mesuré à 375 px sur les 38 pages géographiques : 3 000 à 5 222 px au plus entre deux actions, contre 8 600 à 13 400 caractères avant. Même passe : un sommaire automatique sur l'accueil (10 249 caractères), un bouton « Découvrir Coolok et son fondateur » vers /qui-sommes-nous dans le corps de l'accueil (entrée de la barre absente du corps), un bouton « Estimer les revenus de mon logement » sous la galerie de l'accueil (6 749 px sans action à 375 px, ramenés à 4 092), les guides déjà proposés dans « À lire aussi » retirés de la grille « Nos derniers guides » (même titre listé deux fois), des liens de sommaire portés à 44 px de haut, et un encadré qui ne déborde plus quand son texte contient un mot insécable (Charenton, 452 px pour un écran de 375). Trois constats venaient de la sonde et non du site, corrigés dans `verify-livraison.js` : la page légale sans barre finale n'était pas reconnue, les pages merci n'avaient aucune option pour déclarer leur noindex voulu, et deux cellules identiques d'un tableau réglementaire (Hauts-de-Seine : même régime pour Grand Paris Seine Ouest et pour Vanves) comptaient comme un bloc répété.
- FAQ des guides, 8 septembre 2026 : trois guides (meilleure conciergerie, DPE, tarif) avaient leur FAQ écrite en questions en gras sous un H2 « FAQ », format que le générateur n'extrait pas : aucun accordéon, aucune FAQPage, et le manifeste disait faq: 0 sans que rien n'échoue. Les trois sont passés au format du contrat (questions en ###), les neuf guides produisent désormais une FAQPage, et le build refuse depuis ce jour toute section FAQ d'article sans question en ### (garde contre-mesurée par un guide de test). Même jour, débordement mobile trouvé sur les guides DPE (503 px) et tarif (693 px) pour un écran de 375 : dans l'encadré « L'essentiel » et les listes à coche, la puce était en display: flex, et un mot en gras dans la puce devenait un enfant flex séparé posé à droite du texte. Les puces sont désormais en block avec l'icône en position absolue ; vérifié à 375 px sur les deux guides et la page tarifs (scrollWidth = 375, icônes à gauche à 0 px).
