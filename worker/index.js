/*
 * Worker Cloudflare du site Coolok (assets statiques + API des formulaires).
 * Déployé par deploy.js avec le dossier dist/ en assets statiques (binding ASSETS).
 * Dépendances : aucune. Secrets optionnels : SOFTR_API_KEY, SOFTR_DB, SOFTR_TABLE, LEAD_WEBHOOK.
 * Hôte technique (*.workers.dev, *.pages.dev) : jamais indexable (X-Robots-Tag + robots.txt fermé).
 * Sous-domaine de campagne (CAMPAGNES) : une page d'atterrissage à sa racine, jamais indexable (X-Robots-Tag).
 */

const REDIRECTS = {
  '/conciergerie-courte-duree': '/blog/conciergerie-courte-duree',
  '/location-paris-courte-duree': '/blog/location-paris-courte-duree',
  '/investir-location': '/blog/investir-location',
  '/airbnb-ou-location-classique': '/blog/rentabilite-airbnb-ile-de-france-methode',
  '/bailleur': '/services',
  '/bailleurs': '/services',
  '/simulateur-de-revenue': '/simulateur-locatif',
  '/zones-couvertes': '/conciergerie-airbnb-ile-de-france',
  '/blog/simulateur-airbnb-2026': '/simulateur-locatif',
  '/blog/airbnb-ou-location-classique': '/blog/rentabilite-airbnb-ile-de-france-methode',
  '/lcd-2025-guide-complet-reglementation': '/blog/lcd-guide-complet',
  '/index.html': '/',
};

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline' https://cdn.iubenda.com; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://cdn.iubenda.com https://cs.iubenda.com https://www.clarity.ms https://scripts.clarity.ms https://static.hotjar.com https://script.hotjar.com https://connect.facebook.net https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.clarity.ms https://*.hotjar.com https://*.hotjar.io wss://*.hotjar.com https://*.iubenda.com https://www.facebook.com https://api.calendly.com; frame-src https://calendly.com https://*.iubenda.com https://www.googletagmanager.com https://*.hotjar.com; upgrade-insecure-requests",
};

// Sous-domaines de campagne publicitaire : pour chaque hôte, chemin public -> page du build (champs host et hostPath
// d'une page de contenu, build.js vérifie la correspondance). La page merci de campagne est servie sous le chemin
// /merci-simulateur, pour que les événements clés GA4 et le Lead Meta du GTM (déclenchés sur ce chemin) restent
// valables. Le formulaire, les assets et /merci-contact sont servis aussi ; tout le reste repart vers le site principal,
// et rien n'y est indexable. Sur le site principal, le chemin d'une page de campagne renvoie vers son adresse publique.
const SITE = 'https://www.coolok.co';
const CAMPAGNES = {
  'estimation.coolok.co': { '/': '/campagne/audit-airbnb', '/merci-simulateur': '/campagne/audit-airbnb-merci' },
};
const PAGE_CAMPAGNE = {};
for (const [h, chemins] of Object.entries(CAMPAGNES)) for (const [publique, interne] of Object.entries(chemins)) PAGE_CAMPAGNE[interne] = 'https://' + h + publique;
function servieSurCampagne(path) {
  return path === '/api/lead' || path === '/merci-contact' || path === '/favicon.ico' || path.startsWith('/assets/');
}

function isTechnicalHost(host) {
  return /\.(workers|pages)\.dev$/i.test(host) || /^localhost/i.test(host);
}

function withHeaders(res, extra) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY)) if (!r.headers.has(k)) r.headers.set(k, v);
  for (const [k, v] of Object.entries(extra || {})) r.headers.set(k, v);
  return r;
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, extra || {}) });
}

async function readBody(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await request.json();
  const fd = await request.formData();
  const o = {};
  for (const [k, v] of fd.entries()) o[k] = typeof v === 'string' ? v : '';
  return o;
}

// Durée minimale passée sur la page avant un envoi de formulaire (en dessous : robot).
const DUREE_MIN_MS = 3000;

const CTRL = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + ']+', 'g');
const clean = (v, max) => String(v == null ? '' : v).replace(CTRL, ' ').trim().slice(0, max || 500);

async function handleLead(request, env, url) {
  let body;
  try { body = await readBody(request); } catch (e) { return json({ ok: false, error: 'Corps illisible' }, 400); }
  const kind = clean(body.kind, 20) === 'simulateur' ? 'simulateur' : 'contact';
  const redirect = kind === 'simulateur' ? '/merci-simulateur' : '/merci-contact';
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const done = () => wantsJson ? json({ ok: true, redirect }) : Response.redirect(url.origin + redirect, 303);

  const refus = (msg) => wantsJson ? json({ ok: false, error: msg }, 422) : new Response(msg + '.', { status: 422 });
  const filtre = (raison) => console.log(JSON.stringify({ event: 'lead-filtre', raison, kind, pays: request.headers.get('cf-ipcountry') || '' }));

  // pot de miel : un robot qui remplit le champ caché reçoit un succès silencieux
  if (clean(body.website, 50)) { filtre('pot-de-miel'); return done(); }

  // Durée passée sur la page, mesurée par le script du site avec l'horloge du visiteur (aucun
  // décalage d'horloge possible). Absente : envoi direct sans exécuter la page (les deux spams
  // mesurés le 12/10/2026 avaient l'URL et le référent vides), ou page ouverte avant un déploiement,
  // d'où le message. Trop courte : succès simulé, rien n'est écrit.
  const duree = Number(clean(body.duree, 12));
  if (!clean(body.duree, 12) || !Number.isFinite(duree)) { filtre('sans-duree'); return refus('Rechargez la page puis réessayez, ou écrivez-nous à contact@coolok.co'); }
  if (duree < DUREE_MIN_MS) { filtre('trop-rapide'); return done(); }

  const lead = {
    kind,
    prenom: clean(body.prenom, 80), nom: clean(body.nom, 80),
    email: clean(body.email, 120).toLowerCase(), telephone: clean(body.telephone, 40),
    commune: clean(body.commune === 'autre' ? body.commune_autre : body.commune, 80),
    type_bien: clean(body.type_bien, 20), surface: clean(body.surface, 6), chambres: clean(body.chambres, 3), couchages: clean(body.couchages, 3), situation: clean(body.situation, 30),
    estimation: clean(body.estimation, 200),
    message: clean(body.message, 2000),
    // L'adresse porte les paramètres de campagne (utm_*, fbclid) : 600 caractères pour ne pas les tronquer.
    page: clean(body.page, 200), url: clean(body.url, 600), referrer: clean(body.referrer, 300),
    consent: clean(body.consent, 5) ? 'oui' : 'non',
    date: new Date().toISOString(),
    nom_complet: '',
    statut: 'Nouveau',
    ip_country: request.headers.get('cf-ipcountry') || '',
    user_agent: clean(request.headers.get('user-agent'), 200),
  };
  lead.nom_complet = (lead.prenom + ' ' + lead.nom).trim();
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email);
  if (kind === 'contact') {
    // Contact : téléphone facultatif ; l'e-mail reste obligatoire (il sert de « Répondre à » dans l'e-mail de notification).
    if (!lead.prenom || !emailOk) return refus('Prénom et email sont obligatoires');
  } else {
    if (!lead.prenom || !emailOk || !lead.telephone) return refus('Prénom, email et téléphone sont obligatoires');
    const surface = Number(lead.surface.replace(',', '.'));
    if (!lead.commune || !(surface >= 9 && surface <= 600)) return refus('Commune et surface du bien sont obligatoires');
  }
  if (lead.consent !== 'oui') return wantsJson ? json({ ok: false, error: 'Merci de cocher la case de consentement' }, 422) : new Response('Consentement requis.', { status: 422 });

  const results = {};
  // 1. Table Softr (visible par Coolok dans son studio)
  if (env.SOFTR_API_KEY && env.SOFTR_DB && env.SOFTR_TABLE) {
    try {
      const fields = {};
      const map = env.SOFTR_FIELDS ? JSON.parse(env.SOFTR_FIELDS) : null; // { "prenom": "fieldId", ... }
      for (const [k, v] of Object.entries(lead)) { if (map) { if (map[k]) fields[map[k]] = v; } else fields[k] = v; }
      const r = await fetch(`https://tables-api.softr.io/api/v1/databases/${env.SOFTR_DB}/tables/${env.SOFTR_TABLE}/records`, {
        method: 'POST',
        headers: { 'Softr-Api-Key': env.SOFTR_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      results.softr = r.status;
      if (!r.ok) results.softrError = (await r.text()).slice(0, 300);
    } catch (e) { results.softrError = String(e.message || e); }
  }
  // 2. Webhook de notification (email via automatisation, optionnel)
  if (env.LEAD_WEBHOOK) {
    try {
      const r = await fetch(env.LEAD_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lead) });
      results.webhook = r.status;
    } catch (e) { results.webhookError = String(e.message || e); }
  }
  console.log(JSON.stringify({ event: 'lead', kind, commune: lead.commune, page: lead.page, results }));
  if (results.softrError && !results.webhook) console.log('lead non enregistré : ' + results.softrError);
  return done();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;
    const dev = isTechnicalHost(host);
    const path = url.pathname;
    const campagne = CAMPAGNES[host];

    if (campagne) {
      const ferme = { 'X-Robots-Tag': 'noindex, nofollow' };
      if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /api/\n', { headers: Object.assign({ 'content-type': 'text/plain; charset=utf-8' }, ferme) });
      // Redirections temporaires : une campagne change souvent de page, un 301 resterait dans le cache des navigateurs.
      if (PAGE_CAMPAGNE[path]) return Response.redirect(PAGE_CAMPAGNE[path] + url.search, 302);
      const interne = campagne[path];
      if (!interne && !servieSurCampagne(path)) return Response.redirect(SITE + (REDIRECTS[path] || path) + url.search, 302);
      if (path === '/api/lead') {
        if (request.method !== 'POST') return json({ ok: false, error: 'POST attendu' }, 405, ferme);
        return handleLead(request, env, url);
      }
      const res = await env.ASSETS.fetch(interne ? new Request(url.origin + interne + url.search, request) : request);
      const extra = Object.assign({}, ferme);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) extra['Cache-Control'] = 'public, max-age=0, must-revalidate';
      else if (/\.[0-9a-f]{8}\.(css|js)$/.test(path)) extra['Cache-Control'] = 'public, max-age=31536000, immutable';
      else extra['Cache-Control'] = 'public, max-age=86400';
      return withHeaders(res, extra);
    }
    // Page de campagne demandée sur le site principal : elle n'existe que sur son sous-domaine (les hôtes techniques
    // la servent, pour la recette).
    if (PAGE_CAMPAGNE[path] && !dev) return Response.redirect(PAGE_CAMPAGNE[path] + url.search, 301);

    if (REDIRECTS[path]) return Response.redirect(url.origin + REDIRECTS[path] + url.search, 301);
    if (path.length > 1 && path.endsWith('/')) { let p = path; while (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1); return Response.redirect(url.origin + p + url.search, 301); }
    if (path.endsWith('.html')) { const p = path.endsWith('/index.html') ? path.slice(0, -10) : path.slice(0, -5); return Response.redirect(url.origin + (p || '/') + url.search, 301); }
    if (path === '/api/lead') {
      if (request.method !== 'POST') return json({ ok: false, error: 'POST attendu' }, 405);
      return handleLead(request, env, url);
    }
    if (dev && path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });

    const res = await env.ASSETS.fetch(request);
    const extra = {};
    if (dev) extra['X-Robots-Tag'] = 'noindex, nofollow';
    const ct = res.headers.get('content-type') || '';
    // Le HTML se revalide à chaque visite (304 le plus souvent) : les CSS et JS portent une empreinte
    // dans leur nom et l'ancienne version disparaît au déploiement, donc un HTML gardé 5 minutes en
    // cache pouvait réclamer une feuille de style absente et afficher une page sans mise en forme
    // (constaté le 03/09/2026 sur /contact). Les fichiers empreintés gardent leur cache d'un an.
    // Le fichier _headers n'est pas appliqué par les assets statiques de Workers (mesuré : les CSS
    // sortaient en max-age=0) : c'est donc ici que se règle le cache.
    if (ct.includes('text/html')) extra['Cache-Control'] = 'public, max-age=0, must-revalidate';
    else if (/\.[0-9a-f]{8}\.(css|js)$/.test(path)) extra['Cache-Control'] = 'public, max-age=31536000, immutable';
    else if (path.startsWith('/assets/') || path === '/favicon.ico') extra['Cache-Control'] = 'public, max-age=86400';
    // Le chemin /404 lui-même répondait 200 (404.html servi comme une page ordinaire, mesuré le 11/10/2026) : le statut suit le sens de la page.
    if (path === '/404' && res.status === 200) return withHeaders(new Response(res.body, { status: 404, headers: res.headers }), extra);
    return withHeaders(res, extra);
  },
};
