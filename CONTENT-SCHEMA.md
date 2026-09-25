# Contrat de contenu du site Coolok (à lire avant d'écrire une page)

Le site est généré par `node build.js` à partir de `content/`. Une page = un fichier. Le générateur assemble les blocs, ajoute automatiquement le fil d'Ariane, le sommaire (au-delà de 10 000 caractères), la tarification, les témoignages, les pages liées, la bande d'action finale et les guides connexes selon le TYPE de page. Vous n'écrivez que ce qui est propre à la page.

Le build ÉCHOUE si : title > 65 caractères, meta description > 160, H1 absent ou en double, expression « gestion locative », tiret long ou demi-cadratin, lien interne mort, image absente, plus de 8 000 caractères sans action (bouton, formulaire, téléphone, WhatsApp), JSON-LD invalide. Lancez `node build.js --env dev` et corrigez avant de rendre la main.

## 1. Règles d'écriture (non négociables)
- Vouvoiement. Aucun tiret long ni demi-cadratin : virgule, deux-points, parenthèses, point. Aucun « gestion locative » (dire délégation, conciergerie, pilotage locatif).
- Chaque chiffre porte sa source et sa date dans la phrase ou dans un champ `source`. Rien d'inventé. Les chiffres de marché viennent des fichiers de recherche indiqués dans le brief (R8 réglementation, R9 faits, R10 marché, données Ville tarif dans `data`).
- Le fondateur ne dit que le réel : une citation neuve dans `quote.text` porte `"pending": true` (affiche un badge « à valider ») sauf si elle reprend un verbatim tracé.
- Marque : commission 20 % HT tout compris, +40 % de revenus en moyenne face à une gestion en solo, audit chiffré sous 48 h, 4,8/5 sur 21 avis Google. Ne pas répéter ces chiffres dans le corps des sections : ils sont déjà dans la barre de confiance, la tarification et les bandes d'action. Une seule promesse par page.
- Texte unique par page : deux pages géo ne partagent jamais un paragraphe. Ce qui est commun (services, tarif, avis) est fourni par les blocs automatiques ou reformulé dans l'angle de la page.
- Markdown autorisé dans `md`, `text`, `lead`, `a` (FAQ) : `**gras**`, `*italique*`, `[ancre](/url)`, listes `- `, tableaux GFM, titres `###` (jamais `##` dans un bloc rich qui a déjà un `h2`).

## 2. Fichiers
- `content/pages/<nom>.json` : accueil, services, tarifs, simulateur, contact, équipe, logements, blog, hub, mentions légales, merci, 404.
- `content/communes/<slug>.json` (type commune), `content/departements/<slug>.json` (type departement), `content/zones/<slug>.json` (type zone).
- `content/articles/<slug>.md` : guides (Markdown + frontmatter).
- Images : `/assets/img/heros/<slug>.webp` pour les pages, `/assets/img/articles/<slug>.webp` pour les guides. Si l'image n'existe pas encore, laisser le chemin prévu ET remplir `imageBrief` (une phrase, hors Paris, photo éditoriale réaliste, bleu nuit et or) : l'agent images la produira. Le build signale les images absentes : réutiliser provisoirement `/assets/img/heros/salon-bleu.webp` si nécessaire.

## 3. Champs d'une page JSON
```
{
  "url": "/conciergerie-airbnb-chessy",          // slug exact, jamais modifié sans redirection
  "type": "commune",                              // home|service|tarifs|simulateur|contact|equipe|logements|hub|zone|departement|commune|blog-index|legal|merci|404|generic
  "title": "…",                                   // 20 à 65 caractères, mot-clé principal devant, « | Coolok » en fin
  "description": "…",                             // 70 à 160 caractères, promesse + action
  "h1": "…",                                      // mot-clé principal + angle unique
  "image": "/assets/img/heros/chessy.webp", "imageAlt": "…", "imageWidth": 1200, "imageHeight": 800, "imageBrief": "…",
  "hero": { "eyebrow": "…", "lead": "2 à 3 phrases, l'angle unique de la page", "trust": ["…"], "ctas": [ {"label","href","style"} ] },   // trust et ctas optionnels (défauts du site)
  "sections": [ … blocs, voir § 4 … ],
  "quote": { "text": "citation du fondateur, 2 à 4 phrases", "pending": true },      // optionnel
  "faq": [ { "q": "question telle qu'un propriétaire la tape", "a": "réponse de 2 à 4 phrases, chiffrée et sourcée" } ],   // 5 à 6 pour les pages géo
  "keywords": ["mot-clé principal", "secondaire"],
  "ctaBand": { "h2": "…", "text": "…", "ctas": [ … ] },     // optionnel, sinon bande par défaut
  "faqTitle": "…", "relatedTitle": "…"                        // optionnels
}
```
Champs propres aux pages géo : `name` (nom affiché), `slug`, `dept` (code sur 2 chiffres, texte), `zone` (slug de zone si la commune appartient à une zone, ex. `val-d-europe`), `data` (`prix_nuitee`, `revenu_mensuel`, `taux_occupation`, `prix_m2`, `source` : affichés en carte de chiffres sous le héros ; `showData: false` pour la masquer), `linkText` (sous-titre de 5 à 8 mots dans les grilles de liens), `pricing: false` pour retirer le bloc tarif, `testimonials: { "limit": 3 }`.
Pour un département : `code` (texte). Pour une zone : `shortName`, `dept`.

## 4. Bibliothèque de blocs (`sections[]`)
Chaque bloc accepte `bg` (`white` | `cream` | `dark`), `anchor` (id d'ancre) et `tight` (moins d'espace au-dessus). Les blocs avec `h2` alimentent le sommaire.

| type | champs | usage |
|---|---|---|
| `rich` | `h2`, `intro`, `md` (Markdown), `cta` {label, href, style}, `narrow` | texte de fond, tableaux, listes. Le bloc principal des pages géo et service |
| `cards` | `h2`, `intro`, `cols` (2, 3, 4), `items[]` {icon, title, text, list[], href, linkLabel}, `cta` | services, quartiers, profils, avantages |
| `steps` | `h2`, `intro`, `items[]` {title, text}, `cta` | processus en 3 ou 4 étapes |
| `stats` | `h2`, `intro`, `items[]` {value, label, note}, `source` | chiffres clés locaux, toujours avec `source` |
| `table` | `h2`, `intro`, `caption`, `head[]`, `rows[][]`, `source`, `after` (Markdown) | comparatifs communes, calendriers, tarifs |
| `callout` | `variant` (info, warning, success), `icon`, `title`, `md`, `cta` | réglementation locale, avertissement, la phrase actionnable |
| `quote` | `text`, `author`, `role`, `image`, `pending` | mot du fondateur (préférer le champ `quote` de la page) |
| `testimonials` | `h2`, `limit`, `items[]` {name, place, text, stars} | par défaut les 6 avis Google du site |
| `logos` | `h2`, `intro` | partenaires (par défaut ceux du site) |
| `pricing` | `h2`, `intro`, `included[]`, `note`, `cta`, `cta2`, `unit` | bloc tarif 20 % HT (automatique sur les pages géo) |
| `faq` | `h2`, `intro`, `items[]` | préférer le champ `faq` de la page (schéma FAQPage automatique) |
| `cta` | `variant` (dark, gold), `h2`, `text`, `ctas[]` | bande d'action intermédiaire |
| `links` | `h2`, `intro`, `cols`, `items[]` {title, href, text} | grilles de pages (communes, zones) |
| `articles` | `h2`, `limit`, `exclude[]` | guides connexes |
| `logements` | `h2`, `intro`, `limit`, `cta` | galerie des biens confiés |
| `checklist` | `h2`, `intro`, `items[]`, `cta` | liste de vérification |
| `image` | `src`, `alt`, `caption`, `width`, `height` | illustration seule |
| `contactForm` | `h2`, `intro`, `submit`, `note` | formulaire de contact |
| `simulateur` | (aucun) | le simulateur interactif (page simulateur uniquement) |
| `datacard` | `h2`, `intro`, `data`, `source`, `cta` | carte de chiffres (automatique sur les pages géo avec `data`) |
| `html` | `html` | HTML brut, en dernier recours |

Icônes disponibles : key, clean, chart, shield, clock, euro, home, map, star, phone, calendar, doc, check, camera, users, train, law, bed, wallet, target, info, warning.
Styles de bouton : `primary` (or), `secondary` (vert), `ghost`, `ghost-light` (sur fond sombre). Destinations habituelles : `/simulateur-locatif`, `/contact`, `/tarifs`, l'URL WhatsApp du site.

Rythme d'action : le héros porte déjà deux boutons. Placez ensuite un `callout` avec `cta`, un `cta` ou un `rich` avec `cta` au moins tous les 6 000 caractères de texte. Sur les pages géographiques (commune, département, zone, hub), le gabarit le garantit de toute façon : il insère un rappel d'action (bloc `midcta`, simulateur plus un contact direct) avant le bloc qui ferait dépasser 4 000 caractères sans action ; inutile de l'écrire dans le JSON. Le bloc `pricing` porte par défaut un second bouton « Réserver un appel » (`cta2: false` pour le retirer, ou un autre `cta2`), et chaque bloc `faq` se termine par une relance WhatsApp et téléphone (`more: false` pour la retirer). Les blocs `rich` et `logements` acceptent un `cta2` à côté de leur `cta`. Ordre recommandé d'une page géo : rich (marché local, chiffré) · callout (réglementation locale) · cards (quartiers ou profils) · table (calendrier ou comparatif) · cards (services reformulés dans l'angle) · les blocs automatiques suivent.

## 5. Articles Markdown (`content/articles/<slug>.md`)
```
---
title: "Titre affiché (H1)"
seo_title: "Titre SEO, 65 caractères maximum"
meta_description: "155 caractères"
slug: tarif-conciergerie-airbnb
date: 2026-07-14
updated: 2026-09-05
category: "Tarifs et contrat"          // Tarifs et contrat | Réglementation | Rentabilité et investissement | Conciergerie | Méthode
image: /assets/img/articles/tarif-conciergerie-airbnb.webp
image_alt: "…"
keywords: ["mot-clé principal", "secondaire"]
related: ["/blog/loi-le-meur", "/conciergerie-airbnb-vincennes"]
tribune_a_valider: true                 // si la tribune n'est pas un verbatim validé
---
```
Corps : pas de `# H1` (le titre vient du frontmatter). Sections `##` et `###`. Sections spéciales reconnues par leur titre `##` :
- `## L'essentiel` : liste à puces de 4 à 6 points chiffrés (rendue en encadré en tête d'article).
- `## Le mot de Thierry Moraldo, fondateur de Coolok` : paragraphes à la première personne (rendus en citation du fondateur).
- `## Questions fréquentes` : chaque question en `###`, réponse en paragraphes (schéma FAQPage automatique).
- `## Sources` : liste de liens `- [Nom de la source](https://…), date`.
Les encarts d'action sont insérés automatiquement dans le corps. Maillage : au moins un lien vers le simulateur, une page ville pertinente, le hub du pilier et un guide frère, dans le corps du texte.

## 6. Contrôle final
`node build.js --env dev` : zéro erreur. Relire la page dans `dist/` (ou sur le site dev) : H1 avec le mot-clé, une seule promesse, chaque chiffre daté et sourcé, FAQ locales, aucun paragraphe partagé avec une autre page.
