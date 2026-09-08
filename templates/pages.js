'use strict';
/*
 * Composition des pages par type : transforme le JSON de contenu d'une page en liste de blocs
 * (voir blocks.js) et en liste de schémas JSON-LD. Le générateur (build.js) rend ensuite les blocs.
 * Runtime : Node >= 14 natif. Dépendances : aucune.
 */
const schema = require('../lib/schema');
const { esc, inline, paragraphs, stripTags } = require('../lib/html');
const md = require('../lib/md');
const { btn, ic } = require('./blocks');

function defaultCtas(site, page) {
  return [
    Object.assign({}, site.defaultCta),
    { label: 'Nous contacter', href: '/contact', style: 'secondary' },
  ];
}

function heroFor(site, page) {
  const h = Object.assign({ type: 'hero' }, page.hero || {});
  h.h1 = h.h1 || page.h1;
  if (!h.ctas) h.ctas = defaultCtas(site, page);
  if (h.trust === undefined) h.trust = site.trustShort;
  if (!h.image && page.image) h.image = { src: page.image, alt: page.imageAlt || '', width: page.imageWidth || 960, height: page.imageHeight || 640 };
  return h;
}

function relatedLinks(page, data) {
  const items = [];
  const add = (p, text) => { if (p && p.url !== page.url && !items.find((x) => x.href === p.url)) items.push({ title: p.linkTitle || p.name || p.h1, href: p.url, text: text || p.linkText || '' }); };
  if (page.type === 'commune') {
    const zone = page.zone ? data.zones.find((z) => z.slug === page.zone) : null;
    const dept = data.departements.find((d) => d.code === page.dept);
    if (zone) add(zone, 'Toute la zone');
    if (dept) add(dept, 'Le département');
    const sisters = data.communes.filter((c) => c.url !== page.url && (page.zone ? c.zone === page.zone : c.dept === page.dept));
    sisters.forEach((c) => add(c, c.linkText || ''));
    if (items.length < 4) data.communes.filter((c) => c.dept === page.dept && c.url !== page.url).forEach((c) => add(c));
  } else if (page.type === 'departement') {
    data.zones.filter((z) => z.dept === page.code).forEach((z) => add(z, 'Zone'));
    data.communes.filter((c) => c.dept === page.code).forEach((c) => add(c));
    add(data.pages['/conciergerie-airbnb-ile-de-france'], 'Toute la région');
  } else if (page.type === 'zone') {
    data.communes.filter((c) => c.zone === page.slug).forEach((c) => add(c));
    const dept = data.departements.find((d) => d.code === page.dept);
    if (dept) add(dept, 'Le département');
  } else if (page.type === 'hub') {
    data.zones.forEach((z) => add(z, 'Zone'));
    data.departements.forEach((d) => add(d, d.linkText || ''));
  }
  return items;
}

function geoPage(site, page, data) {
  const blocks = [{ type: 'breadcrumb' }, heroFor(site, page)];
  if (page.data && page.data.revenu_mensuel && page.showData !== false) blocks.push({ type: 'datacard', intro: page.dataIntro, source: page.data.source, cta: { label: 'Estimer mes revenus à ' + page.name, href: '/simulateur-locatif', style: 'primary' } });
  blocks.push({ type: 'toc' });
  blocks.push(...(page.sections || []));
  if (page.quote) blocks.push(Object.assign({ type: 'quote', bg: 'cream' }, page.quote));
  if (page.pricing !== false) blocks.push(Object.assign({ type: 'pricing', bg: 'white' }, page.pricing || {}));
  const testis = page.testimonials || (page.type === 'commune' ? { limit: 3 } : { limit: 3 });
  blocks.push(Object.assign({ type: 'testimonials', bg: 'cream' }, testis));
  if ((page.faq || []).length) blocks.push({ type: 'faq', bg: 'white', h2: page.faqTitle || `Questions fréquentes sur la location courte durée à ${page.name}` });
  const rel = relatedLinks(page, data);
  if (rel.length) blocks.push({ type: 'links', bg: 'cream', h2: page.relatedTitle || (page.type === 'commune' ? 'Nos conciergeries autour de ' + page.name : page.type === 'hub' ? 'Nos zones d\'intervention' : 'Les communes que nous couvrons'), items: rel, cols: 3 });
  blocks.push(Object.assign({ type: 'cta', variant: 'dark' }, page.ctaBand || { h2: `Votre bien à ${page.name} mérite une estimation précise`, text: 'Simulation gratuite en 2 minutes, puis un audit chiffré par le fondateur sous 48 h.', ctas: [site.defaultCta, { label: 'Discuter sur WhatsApp', href: site.org.whatsappUrl, style: 'ghost-light' }] }));
  blocks.push({ type: 'articles', bg: 'white', limit: 3, h2: 'Pour aller plus loin' });

  const area = page.type === 'commune'
    ? { '@type': 'City', name: page.name, containedInPlace: { '@type': 'AdministrativeArea', name: page.deptName } }
    : page.type === 'departement' ? { '@type': 'AdministrativeArea', name: page.name }
    : { '@type': 'AdministrativeArea', name: page.name };
  const schemas = [
    schema.webPage(site, page),
    schema.service(site, page, area),
    schema.breadcrumb(site, page.breadcrumb),
  ];
  if ((page.faq || []).length) schemas.push(schema.faqPage(site, page, page.faq));
  if (rel.length && page.type !== 'commune') schemas.push(schema.itemList(site, page.h1, rel.map((r) => ({ name: r.title, url: r.href, type: 'WebPage' }))));
  return { blocks, schemas };
}

function servicePage(site, page, data) {
  const blocks = [{ type: 'breadcrumb' }, heroFor(site, page), { type: 'toc' }, ...(page.sections || [])];
  if (page.quote) blocks.push(Object.assign({ type: 'quote', bg: 'cream' }, page.quote));
  if ((page.faq || []).length) blocks.push({ type: 'faq', bg: 'white', h2: page.faqTitle });
  if (page.ctaBand !== false) blocks.push(Object.assign({ type: 'cta', variant: 'dark' }, page.ctaBand || { h2: 'Et si votre bien travaillait pour vous ?', text: 'Estimation gratuite en 2 minutes, audit chiffré sous 48 h par le fondateur.', ctas: [site.defaultCta, { label: 'Nous contacter', href: '/contact', style: 'ghost-light' }] }));
  if (page.articles !== false) blocks.push({ type: 'articles', bg: 'white', limit: 3 });
  const schemas = [schema.webPage(site, page), schema.breadcrumb(site, page.breadcrumb)];
  if (page.type === 'service' || page.type === 'tarifs') schemas.push(schema.service(site, page, (site.areaServed || []).map((n) => ({ '@type': 'AdministrativeArea', name: n }))));
  if ((page.faq || []).length) schemas.push(schema.faqPage(site, page, page.faq));
  return { blocks, schemas };
}

function homePage(site, page, data) {
  const blocks = [heroFor(site, page), ...(page.sections || [])];
  if ((page.faq || []).length) blocks.push({ type: 'faq', bg: 'white' });
  const schemas = [schema.organization(site), schema.website(site), schema.webPage(site, page)];
  if ((page.faq || []).length) schemas.push(schema.faqPage(site, page, page.faq));
  return { blocks, schemas };
}

function simulateurPage(site, page, data) {
  const blocks = [{ type: 'breadcrumb' }, heroFor(site, page), { type: 'simulateur', bg: 'cream' }, ...(page.sections || [])];
  if (page.quote) blocks.push(Object.assign({ type: 'quote', bg: 'cream' }, page.quote));
  if ((page.faq || []).length) blocks.push({ type: 'faq', bg: 'white' });
  blocks.push({ type: 'articles', bg: 'cream', limit: 3, h2: 'Comprendre les chiffres' });
  const schemas = [schema.webPage(site, page, { '@type': 'WebPage' }), {
    '@type': 'WebApplication', name: page.h1, url: schema.abs(site, page.url), applicationCategory: 'FinanceApplication', operatingSystem: 'Web', isAccessibleForFree: true, provider: { '@id': site.baseUrl + '/#organization' }, description: page.description,
  }, schema.breadcrumb(site, page.breadcrumb)];
  if ((page.faq || []).length) schemas.push(schema.faqPage(site, page, page.faq));
  return { blocks, schemas };
}

function contactPage(site, page, data) {
  const blocks = [{ type: 'breadcrumb' }, Object.assign(heroFor(site, page), { ctas: page.hero && page.hero.ctas ? page.hero.ctas : [{ label: 'Réserver un appel de 30 min', href: site.org.calendly, style: 'primary', icon: 'calendar' }, { label: 'WhatsApp', href: site.org.whatsappUrl, style: 'secondary' }] }), { type: 'contactForm', bg: 'cream', h2: page.formTitle || 'Écrivez-nous', intro: page.formIntro }, ...(page.sections || [])];
  if ((page.faq || []).length) blocks.push({ type: 'faq', bg: 'white' });
  const schemas = [schema.webPage(site, page, { '@type': 'ContactPage' }), schema.breadcrumb(site, page.breadcrumb)];
  if ((page.faq || []).length) schemas.push(schema.faqPage(site, page, page.faq));
  return { blocks, schemas };
}

function equipePage(site, page, data) {
  const blocks = [{ type: 'breadcrumb' }, heroFor(site, page), ...(page.sections || [])];
  if (page.quote) blocks.push(Object.assign({ type: 'quote', bg: 'cream' }, page.quote));
  blocks.push({ type: 'testimonials', bg: 'white', limit: 3 });
  if ((page.faq || []).length) blocks.push({ type: 'faq', bg: 'cream' });
  blocks.push(Object.assign({ type: 'cta', variant: 'dark' }, page.ctaBand || { h2: 'Un projet de location courte durée ?', text: 'Parlez-en directement au fondateur : appel de 30 minutes, gratuit.', ctas: [{ label: 'Réserver un appel', href: site.org.calendly, style: 'primary', icon: 'calendar' }, site.defaultCta] }));
  const schemas = [schema.webPage(site, page, { '@type': 'AboutPage' }), schema.person(site), schema.breadcrumb(site, page.breadcrumb)];
  if ((page.faq || []).length) schemas.push(schema.faqPage(site, page, page.faq));
  return { blocks, schemas };
}

function logementsPage(site, page, data) {
  const blocks = [{ type: 'breadcrumb' }, heroFor(site, page), { type: 'logements', bg: 'white', h2: page.galleryTitle || 'Huit logements, huit histoires', intro: page.galleryIntro, limit: 12 }, ...(page.sections || [])];
  blocks.push({ type: 'testimonials', bg: 'cream', limit: 3 });
  blocks.push(Object.assign({ type: 'cta', variant: 'dark' }, page.ctaBand || { h2: 'Votre logement pourrait figurer ici', text: 'Estimation gratuite, puis un audit chiffré sous 48 h.', ctas: [site.defaultCta, { label: 'Nous contacter', href: '/contact', style: 'ghost-light' }] }));
  const schemas = [schema.webPage(site, page, { '@type': 'CollectionPage' }), schema.breadcrumb(site, page.breadcrumb)];
  return { blocks, schemas };
}

function blogIndexPage(site, page, data) {
  const arts = data.articles;
  const cats = {};
  arts.forEach((a) => { (cats[a.category || 'Guides'] = cats[a.category || 'Guides'] || []).push(a); });
  const blocks = [{ type: 'breadcrumb' }, Object.assign(heroFor(site, page), { image: null, trust: null })];
  blocks.push(...(page.sections || []));
  for (const cat of Object.keys(cats)) {
    blocks.push({ type: 'html', html: `<section class="section articles bg-white"><div class="container"><h2 class="section-title" id="${esc(cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">${esc(cat)}</h2><div class="grid grid-3 article-grid">${cats[cat].map((a) => `<article class="article-card"><a href="${esc(a.url)}"><img src="${esc(a.image)}" alt="${esc(a.imageAlt || '')}" width="640" height="400" loading="lazy"><h3>${esc(a.h1)}</h3><p>${esc(a.excerpt || a.description)}</p><span class="card-meta">${esc(a.dateLabel)} · ${a.readingTime} min de lecture</span></a></article>`).join('')}</div></div></section>` });
  }
  blocks.push(Object.assign({ type: 'cta', variant: 'dark' }, page.ctaBand || { h2: 'Des questions sur votre projet ?', text: 'Le fondateur vous répond, chiffres en main.', ctas: [site.defaultCta, { label: 'Nous contacter', href: '/contact', style: 'ghost-light' }] }));
  const schemas = [schema.webPage(site, page, { '@type': 'CollectionPage', mainEntity: schema.itemList(site, page.h1, arts.map((a) => ({ name: a.h1, url: a.url, type: 'Article', date: a.datePublished, image: a.image, description: a.description }))) }), schema.breadcrumb(site, page.breadcrumb)];
  return { blocks, schemas };
}

function insertMidCtas(html, site, page) {
  // insère un encart d'action avant un <h2> dès que 6 500 caractères de texte se sont écoulés depuis la dernière action
  const parts = html.split(/(?=<h2 |<h3 |<h4 |<p>|<ul>|<ol>|<blockquote>|<div class="table-wrap">)/);
  let acc = 0;
  const out = [];
  const ctas = page.midCtas || [
    { title: 'Combien rapporterait votre bien ?', text: 'Fourchettes observées par commune, puis audit chiffré par le fondateur sous 48 h.', label: 'Estimer mes revenus', href: '/simulateur-locatif' },
    { title: 'Une question sur votre situation ?', text: 'Réponse directe, sans démarchage.', label: 'Écrire sur WhatsApp', href: site.org.whatsappUrl },
    { title: 'Tarif tout compris, 20 % HT', text: 'Ce qui est inclus, ce qui ne l\'est jamais, et comment comparer.', label: 'Voir nos tarifs', href: '/tarifs' },
  ];
  let k = 0;
  for (const p of parts) {
    const len = stripTags(p).length;
    if (acc > 0 && ((acc + len > 3800 && /^<h[23] /.test(p)) || acc > 4800)) {
      const c = ctas[k % ctas.length]; k++;
      out.push(`<aside class="mid-cta"><div><strong>${inline(c.title)}</strong><p>${inline(c.text)}</p></div>${btn({ label: c.label, href: c.href, style: 'primary' }, 'btn-sm')}</aside>`);
      acc = 0;
    }
    out.push(p);
    acc += len;
  }
  return out.join('');
}

function articlePage(site, page, data) {
  const body = page.bodyHtml;
  const f = site.founder;
  const byline = `<p class="byline">Par <a href="/qui-sommes-nous">${esc(f.name)}</a>, ${esc(f.jobTitle)} · Publié le ${esc(page.dateLabel)}${page.dateModified && page.dateModified !== page.datePublished ? ` · Mis à jour le ${esc(page.dateModifiedLabel)}` : ''} · ${page.readingTime} min de lecture</p>`;
  // Les items viennent déjà rendus par le Markdown (build.js) : les repasser dans inline() les
  // ré-échappait, et « <strong> » s'affichait en toutes lettres au lecteur (mesuré le 03/09/2026).
  const tldr = page.tldr && page.tldr.length ? `<div class="tldr"><p class="tldr-title">L'essentiel</p><ul>${page.tldr.map((t) => `<li>${ic('check')}${t}</li>`).join('')}</ul></div>` : '';
  const blocks = [{ type: 'breadcrumb' }, { type: 'html', html: `<header class="article-hero"><div class="container"><div class="article-hero-text"><p class="eyebrow">${esc(page.category || 'Guide')}</p><h1>${inline(page.h1)}</h1>${page.chapo ? `<p class="lead">${inline(page.chapo)}</p>` : ''}${byline}<p class="cta-row article-cta">${btn({ label: 'Estimer mes revenus', href: '/simulateur-locatif', style: 'primary', icon: 'calc' }, 'btn-sm')}<a class="btn btn-ghost btn-sm" href="${esc(site.org.whatsappUrl)}" rel="noopener" target="_blank">Une question ? WhatsApp</a></p></div>${page.image ? `<figure class="article-hero-media"><img src="${esc(page.image)}" alt="${esc(page.imageAlt || '')}" width="${page.imageWidth || 1200}" height="${page.imageHeight || 700}" fetchpriority="high"></figure>` : ''}</div></header>` }, { type: 'html', html: `<div class="container article-layout"><div class="prose article-body">${tldr}` }, { type: 'toc', inline: true }, { type: 'html', html: insertMidCtas(body, site, page) }];
  if (page.tribune) blocks.push({ type: 'html', html: `<figure class="founder-quote in-article${page.tribunePending ? ' pending' : ''}"><img src="${esc(f.image)}" alt="${esc(f.name)}" width="120" height="120" loading="lazy"><blockquote>${ic('quote', 'ic-quote')}<p class="quote-title">${esc(page.tribuneTitle || 'Le mot de Thierry')}</p>${paragraphs(page.tribune)}</blockquote><figcaption><strong>${esc(f.name)}</strong>, ${esc(f.jobTitle)}${page.tribunePending ? ' <span class="badge">à valider</span>' : ''}</figcaption></figure>` });
  blocks.push({ type: 'html', html: `<aside class="mid-cta"><div><strong>Vous avez un bien en tête ?</strong><p>Fourchettes observées par commune, puis audit chiffré par le fondateur sous 48 h, gratuit.</p></div>${btn({ label: 'Estimer mes revenus', href: '/simulateur-locatif', style: 'primary' }, 'btn-sm')}</aside>` });
  if ((page.faq || []).length) blocks.push({ type: 'html', html: `<section class="faq in-article"><h2 id="questions-frequentes">${esc(page.faqTitle || 'Questions fréquentes')}</h2><div class="faq-list">${page.faq.map((q) => `<details class="faq-item"><summary><h3>${inline(q.q)}</h3></summary><div class="faq-answer">${md.render(q.a).html}</div></details>`).join('')}</div><p class="faq-more">Une question qui n'est pas dans la liste ? <a href="${esc(site.org.whatsappUrl)}" rel="noopener" target="_blank">Posez-la sur WhatsApp</a> ou <a href="tel:${esc(site.org.telephoneRaw)}">appelez le ${esc(site.org.telephoneDisplay)}</a>.</p></section>` });
  if ((page.sources || []).length) blocks.push({ type: 'html', html: `<section class="sources"><h2 id="sources">Sources</h2><ul>${page.sources.map((s) => `<li>${s.href ? `<a href="${esc(s.href)}" rel="noopener nofollow" target="_blank">${esc(s.label)}</a>` : esc(s.label)}${s.date ? `, ${esc(s.date)}` : ''}</li>`).join('')}</ul></section>` });
  blocks.push({ type: 'html', html: `<aside class="author-box"><img src="${esc(f.image)}" alt="${esc(f.name)}" width="96" height="96" loading="lazy"><div><p class="author-name">${esc(f.name)}</p><p>${esc(f.bio)}</p><p><a href="/qui-sommes-nous">Découvrir Coolok</a> · <a href="/simulateur-locatif">Estimer mes revenus</a></p></div></aside></div><aside class="article-side"><div class="side-card"><p class="side-title">Combien rapporte votre bien ?</p><p>Fourchettes observées par commune, puis audit chiffré sous 48 h.</p>${btn({ label: 'Estimer mes revenus', href: '/simulateur-locatif' })}<p class="side-alt"><a href="${esc(site.org.whatsappUrl)}" rel="noopener" target="_blank">Une question ? WhatsApp</a></p></div>${page.related && page.related.length ? `<div class="side-card side-links"><p class="side-title">À lire aussi</p><ul>${page.related.map((r) => `<li><a href="${esc(r.url)}">${esc(r.h1)}</a></li>`).join('')}</ul></div>` : ''}</aside></div>` });
  blocks.push({ type: 'articles', bg: 'cream', limit: 3, h2: 'Nos derniers guides' });
  blocks.push(Object.assign({ type: 'cta', variant: 'dark' }, page.ctaBand || { h2: 'Passez du calcul à l\'action', text: 'Estimation gratuite en 2 minutes, audit chiffré par le fondateur sous 48 h.', ctas: [site.defaultCta, { label: 'Nous contacter', href: '/contact', style: 'ghost-light' }] }));
  const schemas = [schema.article(site, page), schema.breadcrumb(site, page.breadcrumb)];
  if ((page.faq || []).length) schemas.push(schema.faqPage(site, page, page.faq));
  return { blocks, schemas };
}

function legalPage(site, page, data) {
  const blocks = [{ type: 'breadcrumb' }, Object.assign(heroFor(site, page), { image: null, trust: null, ctas: [] }), { type: 'toc' }, ...(page.sections || [])];
  return { blocks, schemas: [schema.webPage(site, page), schema.breadcrumb(site, page.breadcrumb)] };
}

function merciPage(site, page, data) {
  const blocks = [{ type: 'html', html: `<section class="section merci"><div class="container narrow"><h1>${inline(page.h1)}</h1>${paragraphs(page.text)}<ul class="check-list">${(page.next || []).map((n) => `<li>${ic('check')}${inline(n)}</li>`).join('')}</ul><div class="cta-row">${(page.ctas || []).map((c) => btn(c)).join('')}</div></div></section>` }, { type: 'articles', bg: 'cream', limit: 3, h2: 'En attendant notre réponse' }];
  return { blocks, schemas: [schema.webPage(site, page)] };
}

function notFoundPage(site, page, data) {
  const blocks = [{ type: 'html', html: `<section class="section merci"><div class="container narrow"><h1>${inline(page.h1)}</h1>${paragraphs(page.text)}<div class="cta-row">${(page.ctas || []).map((c) => btn(c)).join('')}</div></div></section>` }, { type: 'links', bg: 'cream', h2: 'Les pages les plus consultées', items: page.links || [], cols: 3 }];
  return { blocks, schemas: [] };
}

function sitemapPage(site, page, data) {
  const groups = page.groups || [];
  const blocks = [{ type: 'breadcrumb' }, Object.assign(heroFor(site, page), { image: null, trust: null, ctas: [] })];
  for (const g of groups) blocks.push({ type: 'links', bg: g.bg || 'white', h2: g.title, items: g.items, cols: 3 });
  return { blocks, schemas: [schema.webPage(site, page), schema.breadcrumb(site, page.breadcrumb)] };
}

const COMPOSERS = {
  home: homePage,
  service: servicePage,
  tarifs: servicePage,
  simulateur: simulateurPage,
  contact: contactPage,
  equipe: equipePage,
  logements: logementsPage,
  hub: geoPage,
  zone: geoPage,
  departement: geoPage,
  commune: geoPage,
  'blog-index': blogIndexPage,
  article: articlePage,
  legal: legalPage,
  merci: merciPage,
  '404': notFoundPage,
  sitemap: sitemapPage,
  generic: servicePage,
};

function compose(site, page, data) {
  const fn = COMPOSERS[page.type];
  if (!fn) throw new Error(`Type de page inconnu « ${page.type} » (${page.url})`);
  return fn(site, page, data);
}

module.exports = { compose, relatedLinks };
