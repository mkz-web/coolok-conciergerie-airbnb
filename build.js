#!/usr/bin/env node
'use strict';
/*
 * Générateur du site statique Coolok (hébergement Cloudflare).
 * ---------------------------------------------------------------
 * Exécution : node build.js [--env dev|prod] [--out dist] [--strict]
 * Runtime minimal : Node >= 18 (fs, path, crypto natifs). Dépendances : aucune.
 * Entrées : content/ (site.json, pages/*.json, communes/*.json, departements/*.json, zones/*.json, articles/*.md),
 *           assets/ (css, js, img). Sorties : dist/ complet (HTML, sitemap, robots, llms, _headers, _redirects, manifest).
 * Le build ÉCHOUE (code 1) si une règle de livraison n'est pas respectée : title > 65, meta > 160, H1 absent ou multiple,
 * mot interdit, tiret long, lien interne mort, image absente, JSON-LD invalide, action absente sur plus de 8 000 caractères.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { esc, stripTags, wordCount, slugify, truncate } = require('./lib/html');
const md = require('./lib/md');
const schema = require('./lib/schema');
const layout = require('./templates/layout');
const blocks = require('./templates/blocks');
const pages = require('./templates/pages');

const ROOT = __dirname;
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const ENV = opt('env', 'dev');
const OUT = path.resolve(ROOT, opt('out', 'dist'));
const STRICT = args.includes('--strict');

const DASH_LONG = String.fromCharCode(0x2014);
const DASH_DEMI = String.fromCharCode(0x2013);
const FORBIDDEN = [
  { re: /gestion locative/i, why: 'expression interdite (carte G)' },
  { re: new RegExp('[' + DASH_LONG + DASH_DEMI + ']'), why: 'tiret long ou demi-cadratin' },
  { re: /à partir de 14\s?%/i, why: 'ancien tarif' },
  { re: new RegExp("(^|[^" + "a-zà-ÿ" + "])(tres|deja|apres|annee|annees|proprietaire|proprietaires|reglementation|sejour|sejours|numero|declaration|periode|elevee|specifique|verifie|copropriete|evenement|immatriculee|reservation|geree|gerer)([^" + "a-zà-ÿ" + "]|$)", "i"), why: "orthographe : accents manquants" },
  { re: new RegExp("plus de 200\\s?000 habitants", "i"), why: "regle perimee : le changement d usage ne depend plus du seuil de population" },
  { re: new RegExp("usufruit[^.]{0,60}60 jours|60 jours[^.]{0,60}usufruit", "i"), why: "limite d usage personnel de 60 jours, contredite par le contrat" },
  { re: new RegExp("50\\s?000\\s?(EUR|euros)[^.]{0,80}enregistrement|enregistrement[^.]{0,80}50\\s?000\\s?(EUR|euros)", "i"), why: "montant d amende faux (la loi Le Meur prevoit 10 000 EUR)" },
  { re: new RegExp("\\b(ton|ta|tes|toi)\\s+(bien|marge|logement|annonce|projet|prix|calcul)\\b|\\btu\\s+(peux|dois|as|vas|veux|fais|gagnes|loues)\\b", "i"), why: "tutoiement (le site vouvoie)" },
  { re: /\b2025\b(?!.*(bilan|dernière année|année complète|depuis|janvier|novembre|mai|loi|décret|arrêté|Le Meur|source|publié|mis à jour))/i, why: 'date 2025 non contextualisée', warn: true },
];

const errors = [];
const warnings = [];
const err = (p, m) => errors.push(`${p} : ${m}`);
const warn = (p, m) => warnings.push(`${p} : ${m}`);

function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
function listFiles(dir, ext) { return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f)) : []; }
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  ensureDir(dst);
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
function hash8(buf) { return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8); }
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function dateLabel(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; }

// ---------- Site
const site = readJson(path.join(ROOT, 'content', 'site.json'));
site.env = ENV;
site.buildDate = new Date().toISOString().slice(0, 10);
site.buildYear = site.buildDate.slice(0, 4);
if (ENV !== 'prod') site.baseUrl = site.devBaseUrl || site.baseUrl;

// ---------- Assets
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(path.join(OUT, 'assets'));
copyDir(path.join(ROOT, 'assets', 'img'), path.join(OUT, 'assets', 'img'));
const css = fs.readFileSync(path.join(ROOT, 'assets', 'css', 'site.css'));
const js = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'site.js'));
site.assets.css = `/assets/site.${hash8(css)}.css`;
site.assets.js = `/assets/site.${hash8(js)}.js`;
fs.writeFileSync(path.join(OUT, site.assets.css), css);
fs.writeFileSync(path.join(OUT, site.assets.js), js);

// ---------- Contenu
const allPages = [];
for (const f of listFiles(path.join(ROOT, 'content', 'pages'), '.json')) allPages.push(Object.assign({ _file: f }, readJson(f)));
for (const f of listFiles(path.join(ROOT, 'content', 'communes'), '.json')) allPages.push(Object.assign({ type: 'commune', _file: f }, readJson(f)));
for (const f of listFiles(path.join(ROOT, 'content', 'departements'), '.json')) allPages.push(Object.assign({ type: 'departement', _file: f }, readJson(f)));
for (const f of listFiles(path.join(ROOT, 'content', 'zones'), '.json')) allPages.push(Object.assign({ type: 'zone', _file: f }, readJson(f)));

function extractArticleSections(html, headings) {
  // sépare les sections spéciales (L'essentiel, Le mot de Thierry, Questions fréquentes, Sources) du corps
  html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, '');
  const out = { body: [], tldr: [], tribune: '', faq: [], sources: [], tribuneTitle: '' };
  const bq = html.match(/^\s*<blockquote>([\s\S]*?)<\/blockquote>/);
  if (bq && /(tl;dr|l'essentiel|à retenir|en bref)/i.test(stripTags(bq[1]).slice(0, 80))) {
    out.tldr = (bq[1].match(/<li>([\s\S]*?)<\/li>/g) || []).map((li) => li.replace(/<\/?li>/g, ''));
    html = html.replace(bq[0], '');
  }
  const parts = html.split(/(?=<h2 )/);
  for (const p of parts) {
    const m = p.match(/^<h2 id="([^"]+)">([^<]+)<\/h2>/);
    const title = m ? stripTags(m[2]).toLowerCase() : '';
    if (/^(l'essentiel|tl;dr|à retenir|en bref)/.test(title)) {
      out.tldr = (p.match(/<li>([\s\S]*?)<\/li>/g) || []).map((li) => li.replace(/<\/?li>/g, ''));
    } else if (/^(le mot de thierry|tribune|le regard du fondateur|la parole du fondateur)/.test(title)) {
      out.tribuneTitle = stripTags(m[2]);
      out.tribune = (p.replace(m[0], '').match(/<p>([\s\S]*?)<\/p>/g) || []).map((x) => stripTags(x)).join('\n\n');
    } else if (/^(questions fréquentes|faq|vos questions)/.test(title)) {
      const qs = p.replace(m[0], '').split(/(?=<h3 )/).filter((x) => x.startsWith('<h3'));
      out.faq = qs.map((q) => { const qm = q.match(/^<h3 id="[^"]+">([\s\S]*?)<\/h3>/); return { q: stripTags(qm ? qm[1] : ''), a: q.replace(qm ? qm[0] : '', '').trim() }; });
      // Une FAQ écrite en questions en gras (sans ###) ne produit ni accordéon ni FAQPage : trois guides livrés ainsi le 03/09/2026, vu le 08/09.
      if (!out.faq.length) out.faqEmpty = true;
    } else if (/^sources?$/.test(title)) {
      out.sources = (p.match(/<li>([\s\S]*?)<\/li>/g) || []).map((li) => {
        const a = li.match(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        return a ? { href: a[1], label: stripTags(a[2]), date: stripTags(li.replace(a[0], '')).replace(/^[\s,;:]+/, '') } : { label: stripTags(li) };
      });
    } else out.body.push(p);
  }
  return out;
}

for (const f of listFiles(path.join(ROOT, 'content', 'articles'), '.md')) {
  const src = fs.readFileSync(f, 'utf8');
  const { meta, body } = md.parseFrontmatter(src);
  const slug = meta.slug || path.basename(f, '.md');
  const r = md.render(body);
  const ex = extractArticleSections(r.html, r.headings);
  const bodyHtml = ex.body.join('');
  const words = wordCount(bodyHtml + ' ' + ex.tribune + ' ' + ex.faq.map((q) => q.q + ' ' + q.a).join(' '));
  allPages.push({
    _file: f,
    type: 'article',
    url: meta.url || ('/blog/' + slug.replace(/^\/?blog\//, '')),
    title: meta.seo_title || meta.title,
    description: meta.meta_description || meta.description,
    h1: meta.title,
    chapo: meta.chapo || meta.excerpt,
    excerpt: meta.excerpt || meta.meta_description,
    image: meta.image,
    imageAlt: meta.image_alt,
    imageWidth: meta.image_width, imageHeight: meta.image_height,
    datePublished: meta.date,
    dateModified: meta.updated || meta.date,
    category: meta.category || 'Guides',
    keywords: meta.keywords,
    relatedUrls: meta.related || [],
    tldr: ex.tldr,
    tribune: ex.tribune,
    tribuneTitle: ex.tribuneTitle,
    tribunePending: meta.tribune_a_valider === true || meta.tribune_a_valider === 'true',
    faq: ex.faq,
    faqEmpty: !!ex.faqEmpty,
    sources: ex.sources,
    bodyHtml,
    headings: r.headings.filter((h) => h.level === 2 && ex.body.some((p) => p.includes(`id="${h.id}"`))),
    wordCount: words,
    readingTime: Math.max(1, Math.round(words / 200)),
    noindex: meta.noindex === true,
    draft: meta.draft === true,
  });
}

const pagesByUrl = {};
for (const p of allPages) {
  if (!p.url) err(p._file, 'url manquante');
  if (pagesByUrl[p.url]) err(p.url, 'URL en double avec ' + pagesByUrl[p.url]._file);
  pagesByUrl[p.url] = p;
}

// ---------- Données dérivées
const communes = allPages.filter((p) => p.type === 'commune').map((p) => Object.assign(p, { slug: p.slug || p.url.replace(/^\/conciergerie-airbnb-/, ''), deptName: (site.departements[p.dept] || {}).name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
const departements = allPages.filter((p) => p.type === 'departement').map((p) => Object.assign(p, { slug: p.slug || p.url.slice(1) })).sort((a, b) => String(a.code).localeCompare(String(b.code)));
const zones = allPages.filter((p) => p.type === 'zone').map((p) => Object.assign(p, { slug: p.slug || p.url.slice(1) }));
const articles = allPages.filter((p) => p.type === 'article' && !p.draft).map((a) => Object.assign(a, { dateLabel: dateLabel(a.datePublished), dateModifiedLabel: dateLabel(a.dateModified) })).sort((a, b) => (b.datePublished || '').localeCompare(a.datePublished || ''));
for (const a of articles) a.related = (a.relatedUrls || []).map((u) => pagesByUrl[u]).filter(Boolean).map((p) => ({ url: p.url, h1: p.h1 }));
const data = { communes, departements, zones, articles, pages: pagesByUrl };

// plan du site automatique si absent
if (!pagesByUrl['/plan-du-site']) {
  const item = (p) => ({ title: p.h1 || p.title, href: p.url });
  const plan = {
    url: '/plan-du-site', type: 'sitemap', title: 'Plan du site Coolok | Conciergerie Airbnb Île-de-France', description: 'Toutes les pages du site Coolok : services, tarifs, simulateur de revenus, zones et communes couvertes en Île-de-France, guides de la location courte durée.', h1: 'Plan du site',
    hero: { lead: 'Toutes les pages de Coolok, par famille.' },
    groups: [
      { title: 'Coolok', items: allPages.filter((p) => ['home', 'service', 'tarifs', 'simulateur', 'contact', 'equipe', 'logements', 'generic'].includes(p.type)).map(item) },
      { title: 'Zones et départements', bg: 'cream', items: [...allPages.filter((p) => p.type === 'hub'), ...zones, ...departements].map(item) },
      { title: 'Communes', items: communes.map((c) => ({ title: c.name, href: c.url })) },
      { title: 'Guides', bg: 'cream', items: [pagesByUrl['/blog'], ...articles].filter(Boolean).map(item) },
    ],
  };
  allPages.push(plan); pagesByUrl[plan.url] = plan;
}

// fil d'Ariane
const HUB = '/conciergerie-airbnb-ile-de-france';
for (const p of allPages) {
  const crumbs = [{ name: 'Accueil', url: '/' }];
  const hub = pagesByUrl[HUB];
  if (p.type === 'home') p.breadcrumb = [];
  else if (p.type === 'hub') p.breadcrumb = [...crumbs, { name: p.breadcrumbName || 'Zones d\'intervention', url: p.url }];
  else if (p.type === 'departement') p.breadcrumb = [...crumbs, { name: 'Zones d\'intervention', url: HUB }, { name: p.name, url: p.url }];
  else if (p.type === 'zone' || p.type === 'commune') {
    const dept = departements.find((d) => d.code === p.dept);
    p.breadcrumb = [...crumbs, { name: 'Zones d\'intervention', url: HUB }];
    if (dept) p.breadcrumb.push({ name: dept.name, url: dept.url });
    if (p.type === 'commune' && p.zone) { const z = zones.find((z) => z.slug === p.zone); if (z) p.breadcrumb.push({ name: z.shortName || z.name, url: z.url }); }
    p.breadcrumb.push({ name: p.name, url: p.url });
  } else if (p.type === 'article') p.breadcrumb = [...crumbs, { name: 'Guides', url: '/blog' }, { name: p.breadcrumbName || truncate(p.h1, 60), url: p.url }];
  else p.breadcrumb = [...crumbs, { name: p.breadcrumbName || p.h1 || p.title, url: p.url }];
  if (!hub && (p.type === 'departement' || p.type === 'commune')) warn(p.url, 'hub Île-de-France absent, fil d\'Ariane incomplet');
}

// ---------- Rendu
function htmlToText(html) {
  return String(html)
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav class="toc"[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<(h1)[^>]*>/gi, '\n# ').replace(/<(h2)[^>]*>/gi, '\n\n## ').replace(/<(h3)[^>]*>/gi, '\n\n### ').replace(/<(h4)[^>]*>/gi, '\n\n#### ')
    .replace(/<\/(h1|h2|h3|h4)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ').replace(/<\/(p|div|section|tr|blockquote|figure|figcaption|dt|dd|summary|details|article|aside|header)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/td>|<\/th>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const CTA_RE = /class="btn|<form|href="tel:|wa\.me\//g;
function ctaGaps(html) {
  const gaps = [];
  let last = 0;
  let m;
  const re = new RegExp(CTA_RE.source, 'g');
  while ((m = re.exec(html))) { gaps.push(stripTags(html.slice(last, m.index)).length); last = m.index; }
  gaps.push(stripTags(html.slice(last)).length);
  return gaps;
}

const manifest = [];
const llmsFull = [];
const validUrls = new Set(Object.keys(pagesByUrl).concat(['/api/lead', '/llms.txt', '/llms-full.txt', '/sitemap.xml', '/robots.txt']));

for (const page of allPages) {
  if (page.draft) continue;
  const ctx = { site, page, pages: pagesByUrl, data, md };
  let composed;
  try { composed = pages.compose(site, page, data); } catch (e) { err(page.url, e.message); continue; }
  // rendu bloc par bloc, sommaire décidé après coup
  let rendered;
  try { rendered = composed.blocks.map((b) => (b.type === 'toc' ? null : blocks.renderBlocks([b], ctx))); } catch (e) { err(page.url, e.message); continue; }
  const tocIdx = composed.blocks.findIndex((b) => b.type === 'toc');
  const joined = rendered.filter(Boolean).join('\n');
  const textLen = stripTags(joined).length;
  const h2s = [];
  const h2re = /<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = h2re.exec(joined))) h2s.push({ id: m[1], text: stripTags(m[2]) });
  const tocItems = h2s.filter((h) => !/^(questions fréquentes|sources|nos derniers guides|pour aller plus loin|ce que disent|nos conciergeries autour|les communes que nous)/i.test(h.text));
  if (tocIdx >= 0) rendered[tocIdx] = (textLen > 10000 && tocItems.length >= 3) ? blocks.renderBlocks([{ type: 'toc', items: tocItems, inline: composed.blocks[tocIdx].inline }], ctx) : '';
  const body = rendered.filter(Boolean).join('\n');

  // JSON-LD
  let jsonld = '';
  if (composed.schemas && composed.schemas.length) {
    const g = schema.graph(composed.schemas);
    jsonld = schema.serialize(g);
    const errs = schema.validate(JSON.parse(jsonld));
    errs.forEach((e) => err(page.url, 'JSON-LD : ' + e));
  }

  const html = layout.render(site, page, body, jsonld);

  // Contrôles
  const main = (html.match(/<main id="contenu">([\s\S]*)<\/main>/) || [])[1] || '';
  const mainText = stripTags(main);
  const words = wordCount(main);
  if (!page.title) err(page.url, 'title manquant'); else if (page.title.length > 65) err(page.url, `title de ${page.title.length} caractères (max 65)`); else if (page.title.length < 20) warn(page.url, 'title très court');
  if (!page.description) err(page.url, 'meta description manquante'); else if (page.description.length > 160) err(page.url, `meta de ${page.description.length} caractères (max 160)`); else if (page.description.length < 70) warn(page.url, `meta courte (${page.description.length})`);
  const h1n = (main.match(/<h1[\s>]/g) || []).length;
  if (h1n !== 1) err(page.url, `${h1n} balise(s) H1 (attendu 1)`);
  if (page.type === 'article' && page.faqEmpty) err(page.url, 'section FAQ sans aucune question en ### (questions en gras ?) : ni accordéon ni FAQPage ne seraient produits');
  for (const f of FORBIDDEN) {
    const hay = (mainText + ' ' + page.title + ' ' + page.description).replace(/https?:\/\/\S+/g, ' ').replace(/[\w.-]+\.(fr|com|org|gouv\.fr|net)\/\S*/g, ' ');
    const mm = hay.match(f.re);
    if (mm) (f.warn ? warn : err)(page.url, `${f.why} : « ${hay.slice(Math.max(0, mm.index - 40), mm.index + 40).replace(/\s+/g, ' ')} »`);
  }
  // Un objet interpolé dans une chaîne est un défaut de génération, jamais un contenu voulu (17 pages le 03/09/2026).
  if (mainText.includes('[object Object]')) err(page.url, 'valeur non convertie en texte : « [object Object] »');
  // Une adresse brute dans le corps du texte est illisible, et non sécable elle casse la mise en page mobile.
  const urlNue = mainText.match(/https?:\/\/[^\s<)]{12,}/);
  if (urlNue) err(page.url, `URL brute dans le texte, utiliser un lien : « ${urlNue[0].slice(0, 60)} »`);
  // Du HTML échappé deux fois s'affiche en toutes lettres au lecteur (« <strong> », « &#39; »).
  const echappe = main.match(/&lt;\/?(strong|em|a|p|ul|ol|li|br|h[1-6])[ &>]|&amp;#\d+;/i);
  if (echappe) err(page.url, `balise échappée visible dans le texte : « ${echappe[0]} »`);
  // Un acronyme ne prend pas d'accent : « INSée » venait d'une règle d'accentuation trop large.
  const acro = mainText.match(/[A-Z]{2,}[éèêàùô]/);
  if (acro) err(page.url, `acronyme accentué par erreur : « ${acro[0]} »`);
  // Un nom de domaine non plus : « sante.defense.gouv.fr » était devenu « santé.défense.gouv.fr ».
  const dom = mainText.match(/[a-z0-9-]*[éèêàûôç][a-z0-9-]*\.(fr|com|net|org|gouv|io|co)\b/i);
  if (dom) err(page.url, `nom de domaine accentué : « ${dom[0]} »`);
  // Une phrase tronquée en plein mot ou sur un mot-outil trahit une coupe automatique mal réglée.
  // « un. » et « une. » terminent des phrases correctes (« si vous en avez un. ») : hors liste.
  const coupe = mainText.match(/\s(de|du|des|et|ou|au|aux|pour|avec|sur|dans|par|à)\.(?=\s|$)/i);
  if (coupe) err(page.url, `phrase coupée sur un mot-outil : « ${coupe[0].trim()} »`);
  if (!['legal', 'merci', '404', 'sitemap'].includes(page.type)) {
    const gaps = ctaGaps(main);
    const worst = Math.max(...gaps);
    if (worst > 8000) err(page.url, `aucune action sur ${worst} caractères (max 8 000)`);
    if (gaps[0] > 1500) warn(page.url, `première action après ${gaps[0]} caractères`);
  }
  const hrefs = main.match(/href="([^"]+)"/g) || [];
  for (const h of hrefs) {
    const u = h.slice(6, -1);
    if (!u.startsWith('/') || u.startsWith('//')) continue;
    const p = u.split('#')[0].split('?')[0];
    if (p && !validUrls.has(p) && !p.startsWith('/assets/')) err(page.url, `lien interne mort : ${u}`);
  }
  const imgs = main.match(/<img [^>]+>/g) || [];
  for (const im of imgs) {
    const src = (im.match(/src="([^"]+)"/) || [])[1] || '';
    if (src.startsWith('/assets/') && !fs.existsSync(path.join(OUT, src))) err(page.url, `image absente : ${src}`);
    if (/alt=""/.test(im) && !/logo/i.test(src)) warn(page.url, `image sans alt : ${src}`);
  }
  if (!['legal', 'merci', '404', 'sitemap', 'contact', 'blog-index'].includes(page.type) && words < 300) warn(page.url, `page courte : ${words} mots`);
  if (['commune', 'departement', 'zone', 'hub'].includes(page.type) && (page.faq || []).length < 4) warn(page.url, `FAQ de ${(page.faq || []).length} question(s)`);

  // écriture
  const rel = page.type === '404' ? '404.html' : page.url === '/' ? 'index.html' : page.url.replace(/^\//, '') + '.html';
  ensureDir(path.dirname(path.join(OUT, rel)));
  fs.writeFileSync(path.join(OUT, rel), html);
  manifest.push({ url: page.url, type: page.type, title: page.title, titleLen: page.title ? page.title.length : 0, descLen: page.description ? page.description.length : 0, h1: page.h1, words, chars: mainText.length, faq: (page.faq || []).length, noindex: !!page.noindex || page.type === '404', file: rel });
  if (!['legal', 'merci', '404', 'sitemap'].includes(page.type) && !page.noindex) {
    llmsFull.push({ url: page.url, type: page.type, h1: page.h1 || page.title, text: htmlToText(main) });
  }
}

// ---------- Fichiers de site
const indexable = manifest.filter((m) => !m.noindex);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((m) => { const p = pagesByUrl[m.url]; return `  <url><loc>${esc(schema.abs(site, m.url))}</loc><lastmod>${(p.dateModified || site.buildDate).slice(0, 10)}</lastmod></url>`; }).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site.baseUrl}/sitemap.xml\n\n# Contenu structuré pour agents IA / LLM :\n# ${site.baseUrl}/llms.txt\n# ${site.baseUrl}/llms-full.txt\n`);

// llms.txt
const L = site.llms;
const line = (p, d) => `- [${p.h1 || p.title}](${schema.abs(site, p.url)})${d ? ' : ' + d : ''}`;
const geoLines = departements.map((d) => {
  const cs = communes.filter((c) => c.dept === d.code);
  const zs = zones.filter((z) => z.dept === d.code);
  return `- [${d.name} (${d.code})](${schema.abs(site, d.url)})${zs.length ? ' · ' + zs.map((z) => `[${z.name}](${schema.abs(site, z.url)})`).join(', ') : ''}${cs.length ? ' : ' + cs.map((c) => `[${c.name}](${schema.abs(site, c.url)})`).join(', ') : ''}`;
});
const llms = `# ${site.org.name}\n\n> ${L.intro}\n\n${L.zonesIntro}\n\n## Pages clés\n${L.keyPages.map((u) => pagesByUrl[u]).filter(Boolean).map((p) => line(p, p.llmsLine || p.description)).join('\n')}\n\n## Zones d'intervention\n- [Île-de-France (hub)](${schema.abs(site, HUB)})\n${geoLines.join('\n')}\n\n## Guides location courte durée\n${articles.map((a) => line(a, a.llmsLine || a.description)).join('\n')}\n- [Tous les guides](${schema.abs(site, '/blog')})\n\n## Données citables\n- [Texte intégral et données par commune (llms-full.txt)](${site.baseUrl}/llms-full.txt) : ${L.fullLine}\n\n## Contact\n- Email : ${site.org.email} · Téléphone : ${site.org.telephoneDisplay} · [Formulaire](${schema.abs(site, '/contact')}) · [Simulateur](${schema.abs(site, '/simulateur-locatif')})\n- Mentions : ${site.org.legalName}, SIREN ${site.org.siren}, ${site.org.address.street}, ${site.org.address.postalCode} ${site.org.address.locality}. Licence des données : ${L.licence}\n`;
fs.writeFileSync(path.join(OUT, 'llms.txt'), llms);
const order = { home: 0, service: 1, tarifs: 2, simulateur: 3, equipe: 4, logements: 5, hub: 6, zone: 7, departement: 8, commune: 9, 'blog-index': 10, article: 11 };
llmsFull.sort((a, b) => (order[a.type] || 50) - (order[b.type] || 50) || a.url.localeCompare(b.url));
fs.writeFileSync(path.join(OUT, 'llms-full.txt'), `# ${site.org.name} : texte intégral du site\n\n> ${L.intro}\n\nGénéré le ${site.buildDate}. Index : ${site.baseUrl}/llms.txt · Sitemap : ${site.baseUrl}/sitemap.xml · Licence : ${L.licence}\n\n` + llmsFull.map((p) => `\n\n---\n\n# ${p.h1}\nURL : ${schema.abs(site, p.url)}\n\n${p.text.replace(/^# .*\n/, '')}`).join('') + '\n');

// _headers et _redirects
fs.writeFileSync(path.join(OUT, '_headers'), `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`);
fs.writeFileSync(path.join(OUT, '_redirects'), (site.redirects || []).map((r) => `${r.from} ${r.to} 301`).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ env: ENV, buildDate: site.buildDate, pages: manifest }, null, 1));

// ---------- Rapport
const byType = {};
manifest.forEach((m) => { byType[m.type] = (byType[m.type] || 0) + 1; });
console.log(`Coolok build (${ENV}) : ${manifest.length} pages -> ${OUT}`);
console.log('  ' + Object.entries(byType).map(([t, n]) => `${t}=${n}`).join(' · '));
console.log(`  mots : ${manifest.reduce((s, m) => s + m.words, 0)} · sitemap : ${indexable.length} URLs · llms-full : ${llmsFull.length} pages`);
if (warnings.length) { console.log(`\nAvertissements (${warnings.length}) :`); warnings.forEach((w) => console.log('  ! ' + w)); }
if (errors.length) { console.log(`\nERREURS (${errors.length}) :`); errors.forEach((e) => console.log('  x ' + e)); process.exit(1); }
if (STRICT && warnings.length) process.exit(1);
console.log('\nOK : aucune erreur.');
