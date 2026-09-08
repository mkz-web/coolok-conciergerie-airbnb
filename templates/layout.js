'use strict';
/*
 * Gabarit de page (head, header, footer, scripts) du site Coolok.
 * Runtime : Node >= 14 natif. Dépendances : aucune.
 */
const { esc, attrs } = require('../lib/html');
const schema = require('../lib/schema');

function icon(name) {
  const I = {
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1L6.6 10.8z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2c-.1-.1-.3-.2-.5-.3z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 3.2V17h16V8.2l-8 5-8-5zM4.6 7l7.4 4.6L19.4 7H4.6z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zm12 8H5v9h14v-9z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h11.2l-4.6-4.6L13 5l7 7-7 7-1.4-1.4 4.6-4.6H5z"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-3.7-3.7-1.4 1.4 5.1 5.1L20.6 8l-1.4-1.4z"/></svg>',
    calc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm1 2v4h10V4H7zm0 6v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zM7 14v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v6h2v-6h-2zM7 18v2h2v-2H7zm4 0v2h2v-2h-2z"/></svg>',
  };
  return I[name] || '';
}

function header(site, page) {
  const nav = site.nav.header.map((it) => {
    const active = page.url === it.href || (it.href !== '/' && page.url.startsWith(it.href + (it.href.endsWith('/') ? '' : '/'))) || (it.match && page.url.startsWith(it.match));
    return `<li><a href="${esc(it.href)}"${active ? ' aria-current="page"' : ''}>${esc(it.label)}</a></li>`;
  }).join('');
  const cta = site.nav.cta;
  return `<header class="site-header" id="haut">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="${esc(site.org.name)}, retour à l'accueil"><img src="${esc(site.assets.logo)}" alt="${esc(site.org.name)}" width="${site.assets.logoW}" height="${site.assets.logoH}"></a>
    <nav class="main-nav" aria-label="Navigation principale">
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="menu-principal"><span class="nav-toggle-open">${icon('menu')}</span><span class="nav-toggle-close">${icon('close')}</span><span class="sr-only">Menu</span></button>
      <div class="nav-panel" id="menu-principal">
        <ul class="nav-list">${nav}</ul>
        <div class="nav-actions">
          <a class="btn btn-primary" href="${esc(cta.href)}">${icon('calc')}<span>${esc(cta.label)}</span></a>
          <a class="nav-phone" href="tel:${esc(site.org.telephoneRaw)}">${icon('phone')}<span>${esc(site.org.telephoneDisplay)}</span></a>
        </div>
      </div>
    </nav>
  </div>
</header>`;
}

function footer(site, page) {
  const col = (title, items) => `<div class="footer-col"><h2 class="footer-title">${esc(title)}</h2><ul>${items.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul></div>`;
  const cols = site.nav.footer.map((c) => col(c.title, c.items)).join('');
  const social = (site.org.sameAs || []).map((u) => {
    const n = /facebook/.test(u) ? 'Facebook' : /linkedin/.test(u) ? 'LinkedIn' : /instagram/.test(u) ? 'Instagram' : 'Site';
    return `<a href="${esc(u)}" rel="noopener nofollow" target="_blank">${n}</a>`;
  }).join(' · ');
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col footer-about">
        <a href="/" class="footer-brand"><img src="${esc(site.assets.logoLight || site.assets.logo)}" alt="${esc(site.org.name)}" width="${site.assets.logoW}" height="${site.assets.logoH}" loading="lazy"></a>
        <p>${esc(site.org.tagline)}</p>
        <address>${esc(site.org.legalName)}<br>${esc(site.org.address.street)}<br>${esc(site.org.address.postalCode)} ${esc(site.org.address.locality)}</address>
        <p class="footer-contact"><a href="tel:${esc(site.org.telephoneRaw)}">${esc(site.org.telephoneDisplay)}</a><br><a href="mailto:${esc(site.org.email)}">${esc(site.org.email)}</a></p>
        <p class="footer-social">${social}</p>
      </div>
      ${cols}
    </div>
    <div class="footer-bottom">
      <p>${esc(site.org.disclaimer)}</p>
      <p>© ${site.buildYear} ${esc(site.org.name)} · <a href="/mentions-legales">Mentions légales</a> · <a href="/mentions-legales#donnees-personnelles">Données personnelles</a> · <a href="/contact">Contact</a> · <a href="/plan-du-site">Plan du site</a></p>
    </div>
  </div>
</footer>
<div class="sticky-cta" aria-label="Actions rapides">
  <a class="btn btn-primary" href="${esc(site.nav.cta.href)}">${icon('calc')}<span>${esc(site.nav.cta.shortLabel || site.nav.cta.label)}</span></a>
  <a class="btn btn-ghost" href="tel:${esc(site.org.telephoneRaw)}" aria-label="Appeler Coolok">${icon('phone')}</a>
  <a class="btn btn-whatsapp" href="${esc(site.org.whatsappUrl)}" aria-label="Écrire à Coolok sur WhatsApp" rel="noopener" target="_blank">${icon('whatsapp')}</a>
</div>
<a class="wa-bubble" href="${esc(site.org.whatsappUrl)}" aria-label="Contacter Coolok sur WhatsApp" rel="noopener" target="_blank">${icon('whatsapp')}</a>`;
}

function tracking(site) {
  if (site.env !== 'prod' || !site.tracking) return '';
  const t = site.tracking;
  const iub = `<script type="text/javascript">var _iub = _iub || []; _iub.csConfiguration = ${JSON.stringify(t.iubendaConfig)};</script>
<script type="text/javascript" src="https://cs.iubenda.com/autoblocking/${t.iubendaSiteId}.js"></script>
<script type="text/javascript" src="//cdn.iubenda.com/cs/iubenda_cs.js" charset="UTF-8" async></script>`;
  const ga = `<script data-iub-purposes="4" class="_iub_cs_activate" type="text/plain" async src="https://www.googletagmanager.com/gtag/js?id=${t.ga4}"></script>
<script data-iub-purposes="4" class="_iub_cs_activate" type="text/plain">window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${t.ga4}',{'anonymize_ip':true});</script>`;
  const gtm = t.gtm ? `<script data-iub-purposes="4" class="_iub_cs_activate" type="text/plain">(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${t.gtm}');</script>` : '';
  const clarity = t.clarity ? `<script data-iub-purposes="4" class="_iub_cs_activate" type="text/plain">(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${t.clarity}");</script>` : '';
  const hotjar = t.hotjar ? `<script data-iub-purposes="4" class="_iub_cs_activate" type="text/plain">(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${t.hotjar},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');</script>` : '';
  const fb = t.facebookPixel ? `<script data-iub-purposes="4" class="_iub_cs_activate" type="text/plain">!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${t.facebookPixel}');fbq('track','PageView');</script>` : '';
  return [iub, ga, gtm, clarity, hotjar, fb].join('\n');
}

function head(site, page, jsonld) {
  const canonical = schema.abs(site, page.canonical || page.url);
  const img = page.image ? schema.abs(site, page.image) : schema.abs(site, site.assets.ogDefault);
  const robots = page.noindex || site.env !== 'prod' ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
${robots}
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:locale" content="fr_FR">
<meta property="og:type" content="${page.type === 'article' ? 'article' : 'website'}">
<meta property="og:site_name" content="${esc(site.org.name)}">
<meta property="og:title" content="${esc(page.socialTitle || page.title)}">
<meta property="og:description" content="${esc(page.socialDescription || page.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.socialTitle || page.title)}">
<meta name="twitter:description" content="${esc(page.socialDescription || page.description)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="theme-color" content="${site.theme.color}">
<link rel="icon" href="${esc(site.assets.favicon)}" type="image/png">
<link rel="apple-touch-icon" href="${esc(site.assets.appleIcon || site.assets.favicon)}">
${page.image && page.type !== 'article' ? `<link rel="preload" as="image" href="${esc(page.image)}" fetchpriority="high">` : ''}
<link rel="stylesheet" href="${esc(site.assets.css)}">
<link rel="alternate" type="text/plain" href="${site.baseUrl}/llms.txt" title="llms.txt">
${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ''}
${tracking(site)}`;
}

function render(site, page, bodyHtml, jsonld) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
${head(site, page, jsonld)}
</head>
<body class="page-${esc(page.type)}${page.bodyClass ? ' ' + esc(page.bodyClass) : ''}">
<a class="skip-link" href="#contenu">Aller au contenu</a>
${header(site, page)}
<main id="contenu">
${bodyHtml}
</main>
${footer(site, page)}
<script src="${esc(site.assets.js)}" defer></script>
</body>
</html>`;
}

module.exports = { render, icon };
