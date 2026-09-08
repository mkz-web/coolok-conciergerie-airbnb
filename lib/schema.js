'use strict';
/*
 * Constructeurs et validateur JSON-LD (schema.org) pour le site Coolok.
 * Règles GSC intégrées : ItemList à items complets, BreadcrumbList avec item sauf le dernier,
 * FAQPage à questions complètes. Sérialisation avec « < » échappé en <.
 * Runtime : Node >= 14 natif. Dépendances : aucune.
 */
const { stripTags } = require('./html');

function abs(site, url) {
  if (!url) return site.baseUrl + '/';
  if (/^https?:\/\//.test(url)) return url;
  return site.baseUrl + (url.startsWith('/') ? url : '/' + url);
}

function organization(site) {
  const o = site.org;
  return {
    '@type': ['Organization', 'LocalBusiness'],
    '@id': site.baseUrl + '/#organization',
    name: o.name,
    legalName: o.legalName,
    url: site.baseUrl + '/',
    logo: { '@type': 'ImageObject', url: abs(site, o.logo) },
    image: abs(site, o.image || o.logo),
    description: o.description,
    email: o.email,
    telephone: o.telephone,
    foundingDate: o.foundingDate,
    founder: { '@id': site.baseUrl + '/qui-sommes-nous#thierry-moraldo' },
    address: {
      '@type': 'PostalAddress',
      streetAddress: o.address.street,
      addressLocality: o.address.locality,
      postalCode: o.address.postalCode,
      addressRegion: o.address.region,
      addressCountry: 'FR',
    },
    areaServed: (site.areaServed || []).map((n) => ({ '@type': 'AdministrativeArea', name: n })),
    priceRange: o.priceRange,
    identifier: [{ '@type': 'PropertyValue', propertyID: 'SIREN', value: o.siren }],
    vatID: o.vatId,
    sameAs: o.sameAs,
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer service', email: o.email, telephone: o.telephone, availableLanguage: 'fr', url: site.baseUrl + '/contact' }],
    aggregateRating: o.rating ? { '@type': 'AggregateRating', ratingValue: o.rating.value, reviewCount: o.rating.count, bestRating: 5 } : undefined,
  };
}

function person(site) {
  const p = site.founder;
  return {
    '@type': 'Person',
    '@id': site.baseUrl + '/qui-sommes-nous#thierry-moraldo',
    name: p.name,
    jobTitle: p.jobTitle,
    description: p.description,
    image: abs(site, p.image),
    worksFor: { '@id': site.baseUrl + '/#organization' },
    url: site.baseUrl + '/qui-sommes-nous',
    sameAs: p.sameAs || [],
  };
}

function website(site) {
  return {
    '@type': 'WebSite',
    '@id': site.baseUrl + '/#website',
    url: site.baseUrl + '/',
    name: site.org.name,
    inLanguage: 'fr-FR',
    publisher: { '@id': site.baseUrl + '/#organization' },
  };
}

function breadcrumb(site, items) {
  // items : [{name, url}] ; le dernier sans item
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => {
      const el = { '@type': 'ListItem', position: i + 1, name: it.name };
      if (i < items.length - 1) el.item = abs(site, it.url);
      return el;
    }),
  };
}

function webPage(site, page, extra) {
  return Object.assign({
    '@type': page.schemaPageType || 'WebPage',
    '@id': abs(site, page.url) + '#webpage',
    url: abs(site, page.url),
    name: page.title,
    description: page.description,
    inLanguage: 'fr-FR',
    isPartOf: { '@id': site.baseUrl + '/#website' },
    about: { '@id': site.baseUrl + '/#organization' },
    dateModified: page.dateModified || site.buildDate,
    primaryImageOfPage: page.image ? { '@type': 'ImageObject', url: abs(site, page.image) } : undefined,
  }, extra || {});
}

function service(site, page, area) {
  return {
    '@type': 'Service',
    '@id': abs(site, page.url) + '#service',
    name: page.serviceName || page.h1,
    serviceType: 'Conciergerie Airbnb et location courte durée',
    description: page.description,
    url: abs(site, page.url),
    provider: { '@id': site.baseUrl + '/#organization' },
    areaServed: area,
    offers: {
      '@type': 'Offer',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: site.org.commission, priceCurrency: 'EUR', unitText: 'pourcentage des revenus locatifs HT', description: site.org.commissionText },
      url: site.baseUrl + '/tarifs',
    },
  };
}

function faqPage(site, page, faq) {
  return {
    '@type': 'FAQPage',
    '@id': abs(site, page.url) + '#faq',
    mainEntity: faq.map((q) => ({
      '@type': 'Question',
      name: stripTags(q.q),
      acceptedAnswer: { '@type': 'Answer', text: stripTags(q.a) },
    })),
  };
}

function article(site, page) {
  return {
    '@type': 'Article',
    '@id': abs(site, page.url) + '#article',
    headline: page.h1,
    description: page.description,
    url: abs(site, page.url),
    mainEntityOfPage: abs(site, page.url),
    image: page.image ? [abs(site, page.image)] : undefined,
    datePublished: page.datePublished,
    dateModified: page.dateModified || page.datePublished,
    inLanguage: 'fr-FR',
    author: { '@id': site.baseUrl + '/qui-sommes-nous#thierry-moraldo' },
    publisher: { '@id': site.baseUrl + '/#organization' },
    articleSection: page.category,
    wordCount: page.wordCount,
    keywords: page.keywords,
  };
}

function itemList(site, name, items) {
  // items : [{name, url, type, date, image, description}]
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: Object.assign({ '@type': it.type || 'WebPage', name: it.name, url: abs(site, it.url) },
        it.type === 'Article' ? { headline: it.name, author: { '@id': site.baseUrl + '/qui-sommes-nous#thierry-moraldo' }, publisher: { '@id': site.baseUrl + '/#organization' } } : {},
        it.date ? { datePublished: it.date } : {}, it.image ? { image: abs(site, it.image) } : {}, it.description ? { description: it.description } : {}),
    })),
  };
}

function graph(nodes) {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
}

function serialize(obj) {
  return JSON.stringify(clean(obj)).replace(/</g, '\\u003c');
}

function clean(v) {
  if (Array.isArray(v)) return v.map(clean).filter((x) => x !== undefined);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) {
      const c = clean(v[k]);
      if (c !== undefined && c !== null && c !== '' && !(Array.isArray(c) && !c.length)) o[k] = c;
    }
    return o;
  }
  return v;
}

// Validation des règles GSC sur un bloc JSON-LD (sérialisé ou objet)
function validate(json) {
  const errors = [];
  let obj;
  try { obj = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { return ['JSON invalide : ' + e.message]; }
  const walk = (node, path) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
    if (!node || typeof node !== 'object') return;
    const t = node['@type'];
    const types = Array.isArray(t) ? t : [t];
    if (types.includes('ItemList')) {
      (node.itemListElement || []).forEach((el, i) => {
        if (!el.item || typeof el.item !== 'object' || !el.item['@type'] || !el.item.name || !el.item.url) errors.push(`${path}.itemListElement[${i}] : item incomplet (type, name, url requis)`);
      });
    }
    if (types.includes('BreadcrumbList')) {
      const els = node.itemListElement || [];
      els.forEach((el, i) => {
        if (i < els.length - 1 && !el.item) errors.push(`${path}.itemListElement[${i}] : item manquant sur un maillon non final`);
        if (!el.name) errors.push(`${path}.itemListElement[${i}] : name manquant`);
      });
    }
    if (types.includes('FAQPage')) {
      (node.mainEntity || []).forEach((q, i) => {
        if (!q.name || !q.acceptedAnswer || !q.acceptedAnswer.text) errors.push(`${path}.mainEntity[${i}] : question ou réponse manquante`);
      });
      if (!(node.mainEntity || []).length) errors.push(`${path} : FAQPage vide`);
    }
    if (types.includes('Article') && (!node.headline || !node.datePublished || !node.author)) errors.push(`${path} : Article incomplet`);
    for (const k of Object.keys(node)) if (k !== '@type') walk(node[k], `${path}.${k}`);
  };
  walk(obj, '$');
  return errors;
}

module.exports = { organization, person, website, breadcrumb, webPage, service, faqPage, article, itemList, graph, serialize, validate, abs };
