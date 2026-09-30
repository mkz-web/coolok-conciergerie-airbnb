'use strict';
/*
 * Bibliothèque de blocs (sections) du site Coolok.
 * Chaque bloc : fonction (block, ctx) -> HTML. ctx = { site, page, pages, data, md }.
 * Runtime : Node >= 14 natif. Dépendances : aucune.
 */
const { esc, inline, paragraphs, slugify, nf, typo } = require('../lib/html');
const md = require('../lib/md');
const { icon } = require('./layout');

const ICONS = {
  key: '<svg viewBox="0 0 24 24"><path d="M14 2a6 6 0 0 0-5.7 7.9L2 16.2V22h5.8l1-1v-2h2v-2h2l1.6-1.6A6 6 0 1 0 14 2zm2 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>',
  clean: '<svg viewBox="0 0 24 24"><path d="M15 2 9 8l1.5 1.5-7 7A2 2 0 0 0 5 20h1.5a2 2 0 0 0 1.4-.6l7-7L16.4 14l6-6-1.4-1.4-1.3 1.3-4.6-4.6L16.4 2z"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M3 20h18v2H3zM5 10h3v8H5zm5-6h3v14h-3zm5 4h3v10h-3z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3zm-1.5 14-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4-6.5 6.5z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 11h-2V6h2v5.6l3.5 2-1 1.7L13 13z"/></svg>',
  euro: '<svg viewBox="0 0 24 24"><path d="M15 4a8 8 0 0 0-7.4 5H5v2h2.1a8 8 0 0 0 0 2H5v2h2.6A8 8 0 0 0 15 20c1.6 0 3-.4 4.3-1.2l-1-1.7A6 6 0 0 1 10 15h6v-2H9.6a6 6 0 0 1 0-2H16V9H10a6 6 0 0 1 8.3-2.1l1-1.7A8 8 0 0 0 15 4z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="m12 3 9 8h-3v9h-4v-6h-4v6H6v-9H3z"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1L6.6 10.8z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zm12 8H5v9h14v-9z"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M6 2h8l6 6v14H6zm7 1.5V9h5.5zM8 12h8v2H8zm0 4h8v2H8z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m9.5 16.2-3.7-3.7-1.4 1.4 5.1 5.1L20.6 8l-1.4-1.4z"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM8 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm8 1c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4zM8 13c-.4 0-.8 0-1.2.1C7.6 14 8 15.2 8 16.5V20H0v-2.5C0 14.8 5.3 13 8 13z"/></svg>',
  train: '<svg viewBox="0 0 24 24"><path d="M12 2C8 2 4 2.5 4 6v9.5A3.5 3.5 0 0 0 7.5 19L6 20.5V21h12v-.5L16.5 19a3.5 3.5 0 0 0 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3.5-7H6V6h5v4zm5.5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm1.5-7h-5V6h5v4z"/></svg>',
  law: '<svg viewBox="0 0 24 24"><path d="M12 3 2 8l1 2 1.5-.8L2 15c0 1.7 2 3 4 3s4-1.3 4-3L7.5 9.2 11 7.4V19H6v2h12v-2h-5V7.4l3.5 1.8L14 15c0 1.7 2 3 4 3s4-1.3 4-3l-2.5-5.8L21 10l1-2z"/></svg>',
  bed: '<svg viewBox="0 0 24 24"><path d="M2 5h2v8h8V7h6a4 4 0 0 1 4 4v8h-2v-3H4v3H2zm4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>',
  wallet: '<svg viewBox="0 0 24 24"><path d="M20 7H4a1 1 0 0 1 0-2h15V3H4a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm-3 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>',
  target: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-13a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>',
  warning: '<svg viewBox="0 0 24 24"><path d="M12 2 1 21h22zm1 15h-2v-2h2zm0-4h-2V9h2z"/></svg>',
  quote: '<svg viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>',
};

function ic(name, cls) {
  return `<span class="ic${cls ? ' ' + cls : ''}" aria-hidden="true">${ICONS[name] || ICONS.check}</span>`;
}

function heading(block, level, cls) {
  const text = block['h' + level] || block.h2 || block.title;
  if (!text) return '';
  const id = block.id || slugify(text);
  return `<h${level} id="${esc(id)}"${cls ? ` class="${cls}"` : ''}>${inline(text)}</h${level}>`;
}

function btn(c, cls) {
  if (!c) return '';
  const style = c.style || 'primary';
  const ext = /^https?:/.test(c.href || '');
  return `<a class="btn btn-${esc(style)}${cls ? ' ' + cls : ''}" href="${esc(c.href)}"${ext ? ' rel="noopener" target="_blank"' : ''}>${c.icon ? ic(c.icon) : ''}<span>${esc(c.label)}</span></a>`;
}

function sectionOpen(block, cls) {
  const bg = block.bg ? ` bg-${block.bg}` : '';
  const id = block.anchor ? ` id="${esc(block.anchor)}"` : '';
  return `<section class="section ${cls}${bg}${block.tight ? ' tight' : ''}"${id}><div class="container">`;
}
const sectionClose = '</div></section>';

// Crédit d'une photo sous licence libre (registre content/credits-photos.json, écrit par le skill
// photos-libres). La licence CC BY et CC BY-SA exige l'auteur, la licence et un lien vers l'œuvre :
// on les affiche au plus près de la photo, et build.js refuse une photo du registre sans son crédit.
// Les licences CC gardent leur nom international ; le domaine public se dit en français.
const libelleLicence = (l) => String(l || '').replace(/^Public domain$/i, 'Domaine public');

function creditPhoto(src, ctx) {
  const c = ctx && ctx.data && ctx.data.credits && ctx.data.credits[src];
  if (!c) return '';
  return `<span class="credit-photo" data-credit="${esc(src)}">Photo : <a href="${esc(c.source)}" rel="noopener nofollow" target="_blank">${esc(c.auteur)}</a>, <a href="${esc(c.licenceUrl)}" rel="license noopener nofollow" target="_blank">${esc(libelleLicence(c.licence))}</a>, via ${esc(c.plateforme)}</span>`;
}

function mdHtml(text, ctx) {
  if (!text) return '';
  return md.render(text, { shiftHeadings: 0 }).html;
}

const B = {};

B.hero = (b, ctx) => {
  const img = b.image;
  const trust = (b.trust || []).map((t) => `<li>${ic('check')}${inline(t)}</li>`).join('');
  return `<section class="hero${b.variant ? ' hero-' + esc(b.variant) : ''}"><div class="container hero-inner">
  <div class="hero-text">
    ${b.eyebrow ? `<p class="eyebrow">${inline(b.eyebrow)}</p>` : ''}
    <h1>${inline(b.h1 || ctx.page.h1)}</h1>
    ${b.lead ? `<p class="lead">${inline(b.lead)}</p>` : ''}
    ${b.ctas && b.ctas.length ? `<div class="cta-row">${b.ctas.map((c, i) => btn(c, i === 0 ? '' : '')).join('')}</div>` : ''}
    ${trust ? `<ul class="trust-list">${trust}</ul>` : ''}
  </div>
  ${img ? `<figure class="hero-media"><img src="${esc(img.src)}" alt="${esc(img.alt || '')}" width="${img.width || 960}" height="${img.height || 640}" fetchpriority="high" decoding="async">${creditPhoto(img.src, ctx) ? `<figcaption>${creditPhoto(img.src, ctx)}</figcaption>` : ''}</figure>` : ''}
</div></section>`;
};

B.trustbar = (b, ctx) => {
  const items = b.items || ctx.site.trust;
  return `<section class="trustbar" aria-label="Chiffres clés"><div class="container"><ul>${items.map((t) => `<li>${t.href ? `<a href="${esc(t.href)}"${/^https?:/.test(t.href) ? ' rel="noopener nofollow" target="_blank"' : ''}>` : ''}<strong>${esc(t.value)}</strong><span>${esc(t.label)}</span>${t.href ? '</a>' : ''}</li>`).join('')}</ul></div></section>`;
};

B.rich = (b, ctx) => `${sectionOpen(b, 'rich')}<div class="prose${b.narrow ? ' narrow' : ''}">${heading(b, 2)}${b.intro ? `<p class="lead">${inline(b.intro)}</p>` : ''}${mdHtml(b.md, ctx)}${b.cta ? `<p class="cta-inline${b.cta2 ? ' cta-row' : ''}">${btn(b.cta)}${b.cta2 ? btn(Object.assign({ style: 'ghost' }, b.cta2)) : ''}</p>` : ''}</div>${sectionClose}`;

B.cards = (b, ctx) => {
  const cols = b.cols || 3;
  const items = (b.items || []).map((it) => {
    const inner = `${it.icon ? ic(it.icon, 'ic-lg') : ''}<h3>${inline(it.title)}</h3>${it.text ? `<p>${inline(it.text)}</p>` : ''}${it.list ? `<ul class="check-list">${it.list.map((l) => `<li>${ic('check')}${inline(l)}</li>`).join('')}</ul>` : ''}${it.href ? `<span class="card-link">${esc(it.linkLabel || 'En savoir plus')} ${icon('arrow')}</span>` : ''}`;
    return it.href ? `<a class="card card-link-wrap" href="${esc(it.href)}">${inner}</a>` : `<div class="card">${inner}</div>`;
  }).join('');
  return `${sectionOpen(b, 'cards')}${heading(b, 2, 'section-title')}${b.intro ? `<p class="section-intro">${inline(b.intro)}</p>` : ''}<div class="grid grid-${cols}">${items}</div>${b.cta ? `<p class="section-cta">${btn(b.cta)}</p>` : ''}${sectionClose}`;
};

B.steps = (b, ctx) => `${sectionOpen(b, 'steps')}${heading(b, 2, 'section-title')}${b.intro ? `<p class="section-intro">${inline(b.intro)}</p>` : ''}<ol class="steps-list">${(b.items || []).map((s, i) => `<li><span class="step-num">${i + 1}</span><div><h3>${inline(s.title)}</h3><p>${inline(s.text)}</p></div></li>`).join('')}</ol>${b.cta ? `<p class="section-cta">${btn(b.cta)}</p>` : ''}${sectionClose}`;

B.stats = (b, ctx) => `${sectionOpen(b, 'stats')}${heading(b, 2, 'section-title')}${b.intro ? `<p class="section-intro">${inline(b.intro)}</p>` : ''}<dl class="stats-grid${(b.items || []).length === 3 ? ' stats-3' : ''}">${(b.items || []).map((s) => `<div class="stat"><dt>${inline(s.label)}</dt><dd>${esc(s.value)}</dd>${s.note ? `<p class="stat-note">${inline(s.note)}</p>` : ''}</div>`).join('')}</dl>${b.source ? `<p class="source">${inline(b.source)}</p>` : ''}${sectionClose}`;

B.table = (b, ctx) => {
  const head = b.head || [];
  const rows = (b.rows || []).map((r) => `<tr>${r.map((c, i) => `<td data-label="${esc(head[i] || '')}">${inline(String(c))}</td>`).join('')}</tr>`).join('');
  return `${sectionOpen(b, 'table-section')}<div class="prose">${heading(b, 2)}${b.intro ? `<p>${inline(b.intro)}</p>` : ''}<div class="table-wrap"><table>${b.caption ? `<caption>${inline(b.caption)}</caption>` : ''}<thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>${b.source ? `<p class="source">${inline(b.source)}</p>` : ''}${b.after ? mdHtml(b.after, ctx) : ''}</div>${sectionClose}`;
};

B.callout = (b, ctx) => `${sectionOpen(b, 'callout-section')}<div class="callout callout-${esc(b.variant || 'info')}">${ic(b.icon || (b.variant === 'warning' ? 'warning' : 'info'), 'ic-lg')}<div>${b.title ? `<h3>${inline(b.title)}</h3>` : ''}${mdHtml(b.md, ctx)}${b.cta ? `<p class="cta-inline">${btn(b.cta, 'btn-sm')}</p>` : ''}</div></div>${sectionClose}`;

B.quote = (b, ctx) => {
  const f = ctx.site.founder;
  const author = b.author || f.name;
  const role = b.role || f.jobTitle;
  const img = b.image || f.image;
  return `${sectionOpen(b, 'quote-section')}<figure class="founder-quote${b.pending ? ' pending' : ''}"><img src="${esc(img)}" alt="${esc(author)}" width="120" height="120" loading="lazy"><blockquote>${ic('quote', 'ic-quote')}${paragraphs(b.text)}</blockquote><figcaption><strong>${esc(author)}</strong>, ${esc(role)}${b.pending ? ' <span class="badge">à valider</span>' : ''}</figcaption></figure>${sectionClose}`;
};

B.testimonials = (b, ctx) => {
  const items = (b.items || ctx.site.testimonials).slice(0, b.limit || 6);
  const r = ctx.site.org.rating;
  return `${sectionOpen(b, 'testimonials')}${heading(Object.assign({ h2: 'Ce que disent les propriétaires' }, b), 2, 'section-title')}<p class="section-intro">${r ? `<a class="rating-link" href="${esc(r.url)}" rel="noopener nofollow" target="_blank"><span class="stars" aria-hidden="true">★★★★★</span> ${esc(String(r.value).replace('.', ','))}/5 sur ${r.count} avis Google</a>` : ''}${b.intro ? ' ' + inline(b.intro) : ''}</p><div class="grid grid-3 testimonial-grid">${items.map((t) => `<blockquote class="testimonial"><p>${inline(t.text)}</p><footer><strong>${esc(t.name)}</strong>${t.place ? `, ${esc(t.place)}` : ''}<span class="stars" aria-label="${t.stars || 5} étoiles sur 5">${'★'.repeat(t.stars || 5)}</span></footer></blockquote>`).join('')}</div>${sectionClose}`;
};

B.logos = (b, ctx) => {
  const items = b.items || ctx.site.partners;
  return `${sectionOpen(b, 'logos')}${heading(Object.assign({ h2: 'Nos outils et partenaires' }, b), 2, 'section-title')}${b.intro ? `<p class="section-intro">${inline(b.intro)}</p>` : ''}<ul class="logo-list">${items.map((p) => `<li><a href="${esc(p.href)}" rel="noopener nofollow" target="_blank" title="${esc(p.name)}"><img src="${esc(p.src)}" alt="${esc(p.name)}" width="${p.width || 120}" height="${p.height || 48}" loading="lazy"></a></li>`).join('')}</ul>${sectionClose}`;
};

B.pricing = (b, ctx) => {
  const o = ctx.site.org;
  // Second bouton par défaut : un contact direct à côté du prix (rendez-vous de 30 minutes avec le
  // fondateur), pour que le bloc tarif porte aussi une action de contact. `cta2: false` le retire.
  // Libellé court : « Réserver un appel de 30 min » passait sur deux lignes dans la carte à 375 px.
  const cta2 = b.cta2 === undefined ? { label: 'Réserver un appel', href: o.calendly, icon: 'calendar' } : b.cta2;
  return `${sectionOpen(b, 'pricing')}${heading(Object.assign({ h2: 'Une commission unique, tout compris' }, b), 2, 'section-title')}${b.intro ? `<p class="section-intro">${inline(b.intro)}</p>` : ''}<div class="price-card"><div class="price-head"><span class="price-value">${esc(o.commissionDisplay)}</span><span class="price-unit">${esc(b.unit || 'des revenus locatifs, au résultat')}</span></div><ul class="check-list two-cols">${(b.included || ctx.site.included).map((x) => `<li>${ic('check')}${inline(x)}</li>`).join('')}</ul>${b.note ? `<p class="price-note">${inline(b.note)}</p>` : ''}<div class="cta-row">${btn(b.cta || ctx.site.defaultCta)}${cta2 ? btn(Object.assign({ style: 'secondary' }, cta2)) : ''}</div></div>${sectionClose}`;
};

B.faq = (b, ctx) => {
  const items = b.items || ctx.page.faq || [];
  if (!items.length) return '';
  // Relance de fin de FAQ, comme dans les guides : la question suivante du visiteur a un canal direct.
  const o = ctx.site.org;
  const more = b.more === false ? '' : `<p class="faq-more">Une question qui n'est pas dans la liste ? <a href="${esc(o.whatsappUrl)}" rel="noopener" target="_blank">Posez-la sur WhatsApp</a> ou <a href="tel:${esc(o.telephoneRaw)}">appelez le ${esc(o.telephoneDisplay)}</a>.</p>`;
  return `${sectionOpen(b, 'faq')}${heading(Object.assign({ h2: 'Questions fréquentes' }, b), 2, 'section-title')}${b.intro ? `<p class="section-intro">${inline(b.intro)}</p>` : ''}<div class="faq-list">${items.map((q) => `<details class="faq-item"><summary><h3>${inline(q.q)}</h3>${icon('chevron')}</summary><div class="faq-answer">${/<[a-z]/.test(q.a) ? q.a : mdHtml(q.a, ctx)}</div></details>`).join('')}</div>${more}${sectionClose}`;
};

// Rappel d'action inséré par le gabarit entre deux blocs (pages.js, rythmerActions) : un titre, une
// phrase, deux boutons dont toujours un contact direct (WhatsApp, rendez-vous, téléphone).
B.midcta = (b, ctx) => `${sectionOpen(b, 'midcta-section')}<aside class="mid-cta"><div><p class="mid-cta-title">${inline(b.title)}</p>${b.text ? `<p>${inline(b.text)}</p>` : ''}</div><div class="cta-row">${(b.ctas || []).map((c) => btn(c, 'btn-sm')).join('')}</div></aside>${sectionClose}`;

B.cta = (b, ctx) => `<section class="cta-band cta-${esc(b.variant || 'dark')}${b.anchor ? '' : ''}"${b.anchor ? ` id="${esc(b.anchor)}"` : ''}><div class="container cta-inner"><div>${b.h2 ? `<h2>${inline(b.h2)}</h2>` : ''}${b.text ? `<p>${inline(b.text)}</p>` : ''}</div><div class="cta-row">${(b.ctas || [ctx.site.defaultCta]).map((c) => btn(c)).join('')}</div></div></section>`;

B.links = (b, ctx) => `${sectionOpen(b, 'links')}${heading(b, 2, 'section-title')}${b.intro ? `<p class="section-intro">${inline(b.intro)}</p>` : ''}<ul class="link-grid grid-${b.cols || 3}">${(b.items || []).map((l) => `<li><a href="${esc(l.href)}"><strong>${esc(l.title)}</strong>${l.text ? `<span>${inline(l.text)}</span>` : ''}</a></li>`).join('')}</ul>${sectionClose}`;

B.articles = (b, ctx) => {
  const list = ctx.data.articles.filter((a) => a.url !== ctx.page.url && !(b.exclude || []).includes(a.url)).slice(0, b.limit || 3);
  return `${sectionOpen(b, 'articles')}${heading(Object.assign({ h2: 'Nos guides de la location courte durée' }, b), 2, 'section-title')}<div class="grid grid-3 article-grid">${list.map((a) => `<article class="article-card"><a href="${esc(a.url)}"><img src="${esc(a.image)}" alt="${esc(a.imageAlt || '')}" width="640" height="400" loading="lazy"><h3>${esc(a.h1)}</h3><p>${esc(a.excerpt || a.description)}</p><span class="card-link">Lire le guide ${icon('arrow')}</span></a></article>`).join('')}</div>${b.all !== false ? `<p class="section-cta"><a class="btn btn-secondary" href="/blog">Tous les guides</a></p>` : ''}${sectionClose}`;
};

B.logements = (b, ctx) => {
  const list = (b.items || ctx.site.logements).slice(0, b.limit || 8);
  return `${sectionOpen(b, 'logements')}${heading(Object.assign({ h2: 'Des logements que nous faisons vivre' }, b), 2, 'section-title')}${b.intro ? `<p class="section-intro">${inline(b.intro)}</p>` : ''}<div class="grid grid-4 logement-grid">${list.map((l) => `<figure class="logement-card"><img src="${esc(l.src)}" alt="${esc(l.alt)}" width="640" height="480" loading="lazy"><figcaption><span class="logement-place">${esc(l.place)}</span><strong>${esc(l.title)}</strong>${l.text ? `<p>${inline(l.text)}</p>` : ''}</figcaption></figure>`).join('')}</div>${b.cta ? `<p class="section-cta${b.cta2 ? ' cta-row' : ''}">${btn(b.cta)}${b.cta2 ? btn(b.cta2) : ''}</p>` : ''}${sectionClose}`;
};

B.contactForm = (b, ctx) => {
  const s = ctx.site;
  return `${sectionOpen(b, 'contact-section')}<div class="contact-grid"><div class="contact-side">${heading(Object.assign({ h2: 'Parlons de votre bien' }, b), 2)}${b.intro ? paragraphs(b.intro) : ''}<ul class="contact-list"><li>${ic('phone')}<a href="tel:${esc(s.org.telephoneRaw)}">${esc(s.org.telephoneDisplay)}</a></li><li>${ic('check')}<a href="${esc(s.org.whatsappUrl)}" rel="noopener" target="_blank">WhatsApp, réponse rapide</a></li><li>${ic('calendar')}<a href="${esc(s.org.calendly)}" rel="noopener" target="_blank">Réserver un appel de 30 minutes</a></li><li>${ic('doc')}<a href="mailto:${esc(s.org.email)}">${esc(s.org.email)}</a></li></ul></div>
<form class="lead-form" method="post" action="/api/lead" data-kind="contact">
  <input type="hidden" name="kind" value="contact"><input type="hidden" name="page" value="${esc(ctx.page.url)}"><div class="hp" aria-hidden="true"><label>Site web<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
  <div class="form-row"><label>Prénom<input type="text" name="prenom" required autocomplete="given-name"></label><label>Nom<input type="text" name="nom" required autocomplete="family-name"></label></div>
  <div class="form-row"><label>Email<input type="email" name="email" required autocomplete="email"></label><label>Téléphone<input type="tel" name="telephone" required autocomplete="tel" inputmode="tel"></label></div>
  <label>Commune du bien<input type="text" name="commune" autocomplete="address-level2" placeholder="Ex. : Serris, Vincennes, Versailles"></label>
  <label>Votre message<textarea name="message" rows="4" required placeholder="Type de bien, situation actuelle, ce que vous attendez de nous"></textarea></label>
  <label class="consent"><input type="checkbox" name="consent" required> J'accepte que Coolok me recontacte au sujet de ma demande (<a href="/mentions-legales#donnees-personnelles">données personnelles</a>).</label>
  <button class="btn btn-primary btn-lg" type="submit">${esc(b.submit || 'Envoyer ma demande')}</button>
  <p class="form-note">${esc(b.note || 'Réponse sous 24 h ouvrées. Aucun engagement.')}</p>
</form></div>${sectionClose}`;
};

B.simulateur = (b, ctx) => {
  const communes = ctx.data.communes.filter((c) => c.data && c.data.revenu_mensuel).map((c) => ({ n: c.name, s: c.slug, d: c.dept, r: c.data.revenu_mensuel, p: c.data.prix_nuitee, o: c.data.taux_occupation, u: c.url }));
  const options = communes.map((c) => `<option value="${esc(c.s)}">${esc(c.n)} (${esc(c.d)})</option>`).join('');
  return `${sectionOpen(b, 'simulateur-section')}<div class="sim" id="simulateur" data-communes='${esc(JSON.stringify(communes))}'>
  <ol class="sim-progress" aria-label="Étapes"><li class="is-active" data-step="1"><span>1</span> Votre bien</li><li data-step="2"><span>2</span> Estimation</li><li data-step="3"><span>3</span> Votre audit chiffré</li></ol>
  <form class="lead-form sim-form" method="post" action="/api/lead" data-kind="simulateur" novalidate>
    <input type="hidden" name="kind" value="simulateur"><input type="hidden" name="page" value="${esc(ctx.page.url)}"><input type="hidden" name="estimation" value=""><div class="hp" aria-hidden="true"><label>Site web<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <fieldset class="sim-step" data-step="1"><legend>Étape 1 sur 3 : votre bien</legend>
      <label>Commune du bien<select name="commune" required><option value="">Choisissez une commune</option>${options}<option value="autre">Autre commune d'Île-de-France</option></select></label>
      <label class="sim-autre" hidden>Précisez la commune<input type="text" name="commune_autre" autocomplete="address-level2"></label>
      <div class="form-row"><label>Type de bien<select name="type_bien" required><option value="appartement">Appartement</option><option value="maison">Maison</option></select></label><label>Surface (m²)<input type="number" name="surface" min="9" max="600" inputmode="numeric"></label></div>
      <div class="form-row"><label>Chambres<select name="chambres" required><option value="0">Studio</option><option value="1" selected>1 chambre</option><option value="2">2 chambres</option><option value="3">3 chambres</option><option value="4">4 chambres et plus</option></select></label><label>Voyageurs maximum<select name="couchages" required><option value="2" selected>2</option><option value="4">4</option><option value="6">6</option><option value="8">8 et plus</option></select></label></div>
      <label>Situation actuelle<select name="situation" required><option value="vide">Le bien est vide ou en achat</option><option value="airbnb-solo">Déjà loué en courte durée, en solo</option><option value="conciergerie">Déjà confié à une autre conciergerie</option><option value="classique">Loué en location classique</option><option value="secondaire">Résidence secondaire que j'utilise parfois</option></select></label>
      <button class="btn btn-primary btn-lg" type="button" data-next="2">Voir mon estimation</button>
    </fieldset>
    <fieldset class="sim-step" data-step="2" hidden><legend>Étape 2 sur 3 : votre estimation indicative</legend>
      <div class="sim-result" aria-live="polite"><p class="sim-result-title">Revenus mensuels observés à <span data-out="commune"></span></p><p class="sim-result-value" data-out="revenu"></p><ul class="sim-result-details"><li>Prix par nuit observé : <strong data-out="prix"></strong></li><li>Taux d'occupation observé : <strong data-out="occ"></strong></li><li data-out="hint"></li></ul><p class="sim-result-note" data-out="source"></p></div>
      <p class="sim-help">Cette fourchette est celle des logements entiers de la commune, toutes typologies confondues. Un audit chiffré tient compte de votre bien précis, de la réglementation de votre commune et de vos dates d'usage personnel.</p>
      <div class="cta-row"><button class="btn btn-primary btn-lg" type="button" data-next="3">Recevoir mon audit chiffré gratuit</button><button class="btn btn-ghost" type="button" data-prev="1">Modifier mon bien</button></div>
    </fieldset>
    <fieldset class="sim-step" data-step="3" hidden><legend>Étape 3 sur 3 : où envoyer votre audit ?</legend>
      <div class="form-row"><label>Prénom<input type="text" name="prenom" required autocomplete="given-name"></label><label>Nom<input type="text" name="nom" required autocomplete="family-name"></label></div>
      <div class="form-row"><label>Email<input type="email" name="email" required autocomplete="email"></label><label>Téléphone<input type="tel" name="telephone" required autocomplete="tel" inputmode="tel"></label></div>
      <label>Un détail utile ? (facultatif)<textarea name="message" rows="3" placeholder="Adresse approximative, état du bien, dates où vous l'utilisez"></textarea></label>
      <label class="consent"><input type="checkbox" name="consent" required> J'accepte que Coolok me recontacte pour cet audit (<a href="/mentions-legales#donnees-personnelles">données personnelles</a>).</label>
      <button class="btn btn-primary btn-lg" type="submit">Recevoir mon audit sous 48 h</button>
      <p class="form-note">Audit réalisé par Thierry Moraldo, fondateur de Coolok. Gratuit, sans engagement, sans démarchage.</p>
      <p class="cta-inline"><button class="btn btn-ghost btn-sm" type="button" data-prev="2">Retour</button></p>
    </fieldset>
  </form>
  <noscript><p class="callout callout-info">Le simulateur interactif demande JavaScript. Vous pouvez aussi <a href="/contact">nous écrire</a> ou appeler le ${esc(ctx.site.org.telephoneDisplay)} : nous faisons l'estimation avec vous.</p></noscript>
</div>${sectionClose}`;
};

B.image = (b, ctx) => {
  const credit = creditPhoto(b.src, ctx);
  const legende = [b.caption ? inline(b.caption) : '', credit].filter(Boolean).join(' ');
  return `${sectionOpen(b, 'image-section')}<figure class="figure"><img src="${esc(b.src)}" alt="${esc(b.alt || '')}" width="${b.width || 1200}" height="${b.height || 700}" loading="lazy">${legende ? `<figcaption>${legende}</figcaption>` : ''}</figure>${sectionClose}`;
};

// Liste complète des crédits photos (mentions légales) : titre, auteur, licence, source et
// modifications, ce que la légende courte sous chaque photo ne peut pas porter.
B.creditsPhotos = (b, ctx) => {
  const items = Object.entries((ctx.data && ctx.data.credits) || {}).sort((x, y) => String(x[1].sujet).localeCompare(String(y[1].sujet), 'fr'));
  if (!items.length) return '';
  const modif = (m) => (m ? ' ' + esc(m.charAt(0).toUpperCase() + m.slice(1)) + '.' : '');
  const lien = (href, texte, rel) => `<a href="${esc(href)}" rel="${rel || 'noopener nofollow'}" target="_blank">${esc(texte)}</a>`;
  return `${sectionOpen(b, 'rich')}<div class="prose">${heading(b, 2)}${b.intro ? `<p>${inline(b.intro)}</p>` : ''}<ul class="credits-list">${items.map(([, c]) => `<li><strong>${esc(c.sujet)}</strong> : photo ${lien(c.source, '« ' + c.titre + ' »')} de ${c.auteurUrl ? lien(c.auteurUrl, c.auteur) : esc(c.auteur)}, ${/^Public domain$/i.test(c.licence) ? 'placée dans le ' + lien(c.licenceUrl, 'domaine public', 'license noopener nofollow') + ' par son auteur' : 'sous licence ' + lien(c.licenceUrl, c.licence, 'license noopener nofollow')}, via ${esc(c.plateforme)}.${modif(c.modifications)}</li>`).join('')}</ul></div>${sectionClose}`;
};

B.checklist = (b, ctx) => `${sectionOpen(b, 'checklist')}<div class="prose">${heading(b, 2)}${b.intro ? `<p>${inline(b.intro)}</p>` : ''}<ul class="check-list">${(b.items || []).map((x) => `<li>${ic('check')}${inline(x)}</li>`).join('')}</ul>${b.cta ? `<p class="cta-inline">${btn(b.cta)}</p>` : ''}</div>${sectionClose}`;

B.html = (b) => b.html || '';

B.breadcrumb = (b, ctx) => {
  const items = b.items || ctx.page.breadcrumb || [];
  if (items.length < 2) return '';
  return `<nav class="breadcrumb" aria-label="Fil d'Ariane"><div class="container"><ol>${items.map((it, i) => i < items.length - 1 ? `<li><a href="${esc(it.url)}">${esc(it.name)}</a></li>` : `<li aria-current="page">${esc(it.name)}</li>`).join('')}</ol></div></nav>`;
};

B.toc = (b, ctx) => {
  const items = b.items || [];
  if (items.length < 3) return '';
  const box = `<div class="toc-box"><p class="toc-title">Sommaire</p><ol>${items.map((h) => `<li><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`).join('')}</ol></div>`;
  return b.inline ? `<nav class="toc toc-inline" aria-label="Sommaire">${box}</nav>` : `<nav class="toc" aria-label="Sommaire"><div class="container">${box}</div></nav>`;
};

B.datacard = (b, ctx) => {
  const d = b.data || ctx.page.data || {};
  const rows = [
    ['Prix par nuit observé', d.prix_nuitee],
    ['Taux d\'occupation observé', d.taux_occupation],
    ['Revenu mensuel estimé (logement entier)', d.revenu_mensuel],
    ['Prix médian à l\'achat', d.prix_m2],
  ].filter((r) => r[1]);
  // Le prix d'achat ne vient pas d'AirDNA (qui ne mesure que la location) : il porte sa propre source datée,
  // exigée par build.js dès que prix_m2 est renseigné.
  const s = d.prix_m2 && d.prix_m2_source;
  const sourceM2 = s ? ` Prix d'achat : ${s.indicateur} estimé par [${s.editeur}](${s.url}) au ${s.date}${s.representativite ? `, avec un indice de représentativité du marché de ${s.representativite} selon l'éditeur` : ''}.` : '';
  return `${sectionOpen(b, 'datacard-section')}<div class="datacard">${heading(Object.assign({ h2: `${ctx.page.name} en chiffres` }, b), 2)}${b.intro ? `<p>${inline(b.intro)}</p>` : ''}<dl class="stats-grid stats-4">${rows.map((r) => `<div class="stat"><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl><p class="source">${inline((b.source || d.source || ctx.site.dataSource) + sourceM2)}</p>${b.cta ? `<p class="cta-inline">${btn(b.cta)}</p>` : ''}</div>${sectionClose}`;
};

function renderBlocks(blocks, ctx) {
  return (blocks || []).map((b) => {
    const fn = B[b.type];
    if (!fn) throw new Error(`Bloc inconnu « ${b.type} » sur ${ctx.page.url}`);
    return fn(b, ctx);
  }).join('\n');
}

module.exports = { B, renderBlocks, btn, ic, ICONS, creditPhoto };
