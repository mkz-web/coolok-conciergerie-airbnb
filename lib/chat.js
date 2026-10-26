'use strict';
/*
 * Index de recherche de l'assistant du site (prototype du 26/10/2026), construit par build.js.
 * Runtime : Node >= 14 natif. Dépendances : aucune.
 * Le texte des pages indexables (celui de llms-full.txt) est découpé en blocs d'environ 1 200 caractères par section ;
 * une ligne présente sur trois pages ou plus (texte de gabarit) n'est gardée qu'à sa première apparition. Chaque bloc
 * reçoit ses fréquences de termes (titre de page et de section comptés double), pour un classement BM25 fait par le
 * Worker sans aucun calcul lourd à l'exécution.
 * Le Worker (worker/index.js) normalise la question avec la même règle : toute modification de normaliser() ou de
 * termes() se reporte dans chatNormaliser() et chatTermes() du Worker. Le banc _build/tester-chat.mjs interroge
 * l'index réel avec des questions types et sort en échec si la page attendue n'est plus retrouvée.
 */

// Mots sans valeur de recherche, écrits déjà normalisés (minuscules, sans accent).
const VIDES = ('le la les un une des du de et ou en au aux ce ces cet cette se sa son ses sur dans par pour pas plus ne que qui quoi dont '
  + 'est sont etre ete avoir ai as avons avez ont il ils elle elles on nous vous je tu me te lui leur leurs mon ma mes ton ta tes '
  + 'notre nos votre vos quel quelle quels quelles comment combien pourquoi quand ceci cela ca tout tous toute toutes tres bien '
  + 'aussi mais donc ni car si avec sans sous entre chez vers apres avant depuis pendant comme meme autre autres faire fait fais '
  + 'peut peux peuvent puis doit dois doivent faut va vais vont ici la bonjour merci svp oui non deja encore alors ainsi chaque '
  + 'quoi y a d l j c s n m t qu jusqu lorsque puisque voici voila celui celle ceux celles dont').split(/\s+/).filter(Boolean);

// Rapprochements de vocabulaire (question du visiteur -> mots du site), normalisés au build.
const SYNONYMES = {
  prix: ['tarif', 'commission', 'cout'], tarif: ['prix', 'commission', 'cout'], cout: ['prix', 'tarif', 'commission'],
  coute: ['prix', 'tarif', 'commission'], frais: ['commission', 'tarif'], pourcentage: ['commission'],
  compris: ['inclus', 'comprend'], comprend: ['inclus', 'compris'], inclus: ['compris', 'comprend'], inclut: ['inclus', 'compris'],
  choisir: ['meilleure', 'comparer', 'signer'], bonne: ['meilleure'], bon: ['meilleure'], comparer: ['devis', 'meilleure'],
  gagner: ['revenus', 'rentabilite', 'estimation'], rapporter: ['revenus', 'rentabilite'], rapporte: ['revenus', 'rentabilite'],
  rentable: ['rentabilite', 'revenus'], revenus: ['rentabilite'],
  autorise: ['reglementation', 'autorisation', 'declaration', 'enregistrement'], autorisee: ['reglementation', 'autorisation'],
  legal: ['reglementation', 'autorisation', 'declaration'], interdit: ['reglementation', 'autorisation'],
  declarer: ['declaration', 'enregistrement', 'cerfa'], enregistrer: ['enregistrement', 'declaration'],
  amende: ['sanction', 'reglementation'], sanction: ['amende'],
  menage: ['linge', 'nettoyage'], nettoyage: ['menage', 'linge'],
  lcd: ['location', 'courte', 'duree'], meuble: ['tourisme', 'location'],
  impot: ['fiscalite', 'lmnp', 'impots'], impots: ['fiscalite', 'lmnp'], fiscalite: ['impot', 'lmnp'],
  contrat: ['mandat', 'engagement', 'resiliation'], resilier: ['resiliation', 'preavis', 'engagement'], engagement: ['preavis', 'resiliation'],
  cles: ['acces', 'boitier', 'accueil'], voyageurs: ['accueil', 'locataires'], locataires: ['voyageurs'],
  dpe: ['diagnostic', 'performance', 'energetique'], copropriete: ['reglement', 'syndic'],
  joindre: ['contact', 'telephone', 'whatsapp'], contacter: ['contact', 'telephone', 'whatsapp'], appeler: ['telephone', 'contact'],
};

function normaliser(t) {
  return String(t || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/\p{M}+/gu, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Termes d'un texte : mots normalisés de deux caractères ou plus, hors mots vides, pluriel en s ou x retiré au-delà de 4 lettres.
function termes(t, vides) {
  const out = [];
  for (let m of normaliser(t).split(' ')) {
    if (m.length < 2 || vides.has(m)) continue;
    if (m.length > 4 && /[sx]$/.test(m)) m = m.slice(0, -1);
    out.push(m);
  }
  return out;
}

const TAILLE_BLOC = 1200;
const SECTIONS_IGNOREES = /^(sources?|nos derniers guides|pour aller plus loin)$/i;

// ---------- Fiche de connaissances (26/10/2026, demande de Mickaël : « le modèle doit connaître parfaitement les données
// du site ») : toujours dans le contexte du modèle, mise en cache par le Worker. La recherche seule laissait passer des
// données publiées (encadrés « Ce que dit la loi » de Serris et de Montreuil absents des six extraits retenus).
// Contenu : pages principales en texte intégral ; pour chaque commune, département et zone, les chiffres et leurs sources,
// les encadrés et tableaux, les questions fréquentes (les sections narratives restent à la recherche) ; pour chaque
// guide, l'essentiel et les questions fréquentes (le corps reste à la recherche).
const CLES_IGNOREES = new Set(['type', 'bg', 'icon', 'variant', 'tight', 'narrow', 'cols', 'cta', 'image', 'imageAlt', 'imageWidth', 'imageHeight', 'href', 'url', 'layout', 'style', 'credit', 'id', 'pending', 'prix_m2_source', 'source_url']);

function texteSimple(t) {
  return String(t == null ? '' : t)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Toutes les chaînes d'un bloc de contenu, dans l'ordre, hors clés de mise en page ; un tableau devient des lignes « a | b | c ».
function texteDe(v, cle) {
  if (v == null || CLES_IGNOREES.has(cle)) return '';
  if (typeof v === 'string' || typeof v === 'number') return texteSimple(v);
  if (Array.isArray(v)) {
    if (v.every((x) => Array.isArray(x))) return v.map((ligne) => ligne.map((c) => texteSimple(c)).join(' | ')).join('\n');
    if (v.every((x) => typeof x === 'string')) return v.map((x) => (cle === 'head' ? texteSimple(x) : '- ' + texteSimple(x))).join(cle === 'head' ? ' | ' : '\n');
    return v.map((x) => texteDe(x)).filter(Boolean).join('\n');
  }
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => texteDe(x, k)).filter(Boolean).join('\n');
  return '';
}

function faqTexte(faq) {
  return (faq || []).map((f) => `Q : ${texteSimple(f.q)}\nR : ${texteSimple(f.a)}`).join('\n');
}

// Une ligne de 40 caractères ou plus déjà écrite plus haut (texte de gabarit, avis repris d'une page à l'autre) n'est
// gardée qu'une fois.
function dedoublonner(texte, vues) {
  return texte.split('\n').filter((l) => {
    const k = l.trim();
    if (k.length < 40 || /^#{1,3} /.test(k)) return true;
    if (vues.has(k)) return false;
    vues.add(k);
    return true;
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function chiffresGeo(g) {
  const d = g.data || {};
  const lignes = [];
  const chiffres = [['prix par nuit', d.prix_nuitee], ['revenu mensuel estimé', d.revenu_mensuel], ['taux d\'occupation', d.taux_occupation], ['prix au m²', d.prix_m2]].filter(([, x]) => x).map(([k, x]) => `${k} ${x}`);
  if (chiffres.length) lignes.push('Chiffres : ' + chiffres.join(' ; ') + '.');
  if (d.prix_m2_source) lignes.push(`Source du prix au m² : ${d.prix_m2_source.editeur}, ${d.prix_m2_source.indicateur}, ${d.prix_m2_source.date}.`);
  if (d.source) lignes.push('Source des fourchettes : ' + texteSimple(d.source));
  return lignes;
}
const ENCADRE_LOI = /loi|r[eè]glement/i;

// Fiche compacte, toujours dans le contexte (mise en cache) : pages principales en entier ; pour chaque commune, département
// et zone, les chiffres avec leurs sources et l'encadré « Ce que dit la loi » ; pour chaque guide, l'essentiel.
// La première version (tout le détail des communes et les questions fréquentes) pesait 122 930 jetons, mesurés par l'API le
// 26/10/2026, au-dessus du palier de 100 000 où le tarif de Claude Haiku 5.5 est multiplié par cinq ; le texte français et
// ses chiffres comptent environ 2,2 caractères par jeton, pas 3,8 comme estimé.
// coeur : [{ url, h1, text }] (texte rendu) ; geo : pages JSON des communes, départements et zones ;
// guides : [{ url, h1, tldr: [html] }] ; faits : phrases sur Coolok ; date : date du build.
function construireConnaissances({ coeur, geo, guides, faits, date }) {
  const parts = [`# Données du site de Coolok (www.coolok.co, générées le ${date})`, '', '## Faits sur Coolok', ...faits.map((f) => '- ' + f)];
  parts.push('', '## Pages principales');
  for (const p of coeur) parts.push('', `### ${p.h1} (${p.url})`, texteSimple(String(p.text).replace(/^# .*\n/, '')));
  parts.push('', '## Zones, départements et communes (chiffres et réglementation ; le détail de chaque page est joint à la question quand elle la nomme)');
  for (const g of geo) {
    const lignes = [`### ${g.h1 || g.name} (${g.url})`, ...chiffresGeo(g)];
    for (const s of g.sections || []) if (s.type === 'callout' && ENCADRE_LOI.test(s.title || '')) lignes.push(texteDe(s));
    parts.push('', lignes.filter(Boolean).join('\n'));
  }
  parts.push('', '## Guides (l\'essentiel ; le détail est sur chaque page)');
  for (const a of guides) {
    const lignes = [`### ${a.h1} (${a.url})`];
    if ((a.tldr || []).length) lignes.push('L\'essentiel :', ...a.tldr.map((x) => '- ' + texteSimple(x)));
    parts.push('', lignes.join('\n'));
  }
  return dedoublonner(parts.join('\n'), new Set()) + '\n';
}

// Détail complet d'une page de commune, de département ou de zone (tableaux, encadrés, questions fréquentes), joint à la
// question par le Worker quand la question, la question précédente ou la page consultée nomment cette page.
// noms : formes normalisées du nom (« saint maur des fosses », « val d europe ») cherchées dans la question normalisée.
function construireDetails(geo) {
  return geo.map((g) => {
    const lignes = [`Détail de la page ${g.h1 || g.name} (${g.url})`, ...chiffresGeo(g)];
    for (const s of g.sections || []) if (['callout', 'table'].includes(s.type)) lignes.push(texteDe(s));
    if ((g.faq || []).length) lignes.push('Questions fréquentes :', faqTexte(g.faq));
    const noms = [...new Set([g.name, g.shortName, g.inName && g.inName.replace(/^(à|en|au|aux|dans le|dans la|dans les)\s+/i, '')].filter(Boolean).map((n) => normaliser(n)).filter((n) => n.length >= 3))];
    return { u: g.url, noms, texte: dedoublonner(lignes.filter(Boolean).join('\n'), new Set()) };
  });
}

function decouper(pages) {
  const lignesDe = pages.map((p) => String(p.text).replace(/^# .*\n/, '').split('\n'));
  const compte = new Map();
  for (const ls of lignesDe) {
    const vues = new Set();
    for (const brute of ls) { const l = brute.trim(); if (!l || vues.has(l)) continue; vues.add(l); compte.set(l, (compte.get(l) || 0) + 1); }
  }
  const emises = new Set();
  const blocs = [];
  pages.forEach((p, pi) => {
    let section = '';
    let tampon = [];
    let taille = 0;
    const vider = (reporter) => {
      // Un intertitre (### question de FAQ) resté seul en fin de bloc passe au bloc suivant, avec sa réponse.
      let report = null;
      if (reporter && tampon.length && /^#{3,4} /.test(tampon[tampon.length - 1])) report = tampon.pop();
      const x = tampon.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (x.length >= 60) blocs.push({ p: pi, s: section, x });
      tampon = report ? [report] : [];
      taille = report ? report.length : 0;
    };
    let ignorer = false;
    for (const brute of lignesDe[pi]) {
      const l = brute.trim();
      // Listes de références et de liens (« Sources », « Nos derniers guides ») : du bruit pour la recherche
      // (mesuré le 26/10/2026 : quatre blocs « Sources » sur six extraits pour « Combien coûte la conciergerie ? »).
      if (/^## /.test(l)) { vider(false); section = l.slice(3).trim(); ignorer = SECTIONS_IGNOREES.test(section); continue; }
      if (ignorer) continue;
      if (!l) { if (tampon.length && tampon[tampon.length - 1] !== '') tampon.push(''); continue; }
      if (compte.get(l) >= 3) { if (emises.has(l)) continue; emises.add(l); }
      if (taille + l.length > TAILLE_BLOC && taille > 0) vider(true);
      tampon.push(l);
      taille += l.length + 1;
    }
    vider(false);
  });
  return blocs;
}

// pages : [{ url, h1, text }] (les entrées de llms-full.txt) ; interdits : règles du build (RegExp) ; faits : phrases sur Coolok.
function construireIndex({ pages, interdits, faits, contact, date, connaissances, details }) {
  const vides = new Set(VIDES);
  const blocs = decouper(pages);
  const termesIdx = {};
  let somme = 0;
  blocs.forEach((b, bi) => {
    const tf = {};
    const titre = pages[b.p].h1 + ' ' + b.s;
    for (const t of termes(titre, vides)) tf[t] = (tf[t] || 0) + 2;
    for (const t of termes(b.x, vides)) tf[t] = (tf[t] || 0) + 1;
    let n = 0;
    for (const [t, f] of Object.entries(tf)) { (termesIdx[t] = termesIdx[t] || []).push(bi, f); n += f; }
    b.n = n;
    somme += n;
  });
  const synonymes = {};
  for (const [cle, liste] of Object.entries(SYNONYMES)) {
    const k = termes(cle, vides)[0];
    if (!k) continue;
    const v = [...new Set(liste.map((m) => termes(m, vides)[0]).filter((m) => m && m !== k))];
    if (v.length) synonymes[k] = v;
  }
  return {
    v: 1,
    genere: date,
    faits,
    connaissances: connaissances || '',
    details: details || [],
    contact,
    vides: VIDES,
    synonymes,
    interdits: interdits.map((re) => ({ s: re.source, f: re.flags.replace(/[gy]/g, '') })),
    pages: pages.map((p) => ({ u: p.url, t: p.h1 })),
    blocs,
    termes: termesIdx,
    moy: blocs.length ? Math.round((somme / blocs.length) * 10) / 10 : 0,
  };
}

module.exports = { VIDES, SYNONYMES, normaliser, termes, decouper, construireIndex, construireConnaissances, construireDetails, texteSimple };
