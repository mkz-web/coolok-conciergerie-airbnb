#!/usr/bin/env node
'use strict';
/*
 * Déploiement du site Coolok sur Cloudflare Workers (assets statiques + worker/index.js), sans wrangler.
 * ---------------------------------------------------------------------------------------------------
 * Exécution : node deploy.js [--name coolok-dev] [--dist dist] [--secret CLE=VALEUR ...] [--no-subdomain] [--worker-first all|api]
 *   --worker-first all (défaut) : toute requête passe par le worker (en-têtes, redirections, noindex sur hôte technique) ;
 *   --worker-first api : seuls /api/* passent par le worker, les assets sont servis directement (production à fort trafic).
 * Runtime minimal : Node >= 18 (fetch, FormData, Blob, crypto natifs). Dépendances : aucune.
 * Auth : variable d'environnement CLOUDFLARE_API_TOKEN_COOLOK (token account-owned, scopes Workers Scripts Edit).
 * Compte : --account, ou CLOUDFLARE_ACCOUNT_ID_COOLOK, ou .deploy.json local ({ "account": "..." }, hors git).
 * Étapes : manifeste (sha256 des fichiers) -> session d'upload -> upload par lots -> PUT du script avec le jeton d'assets
 *          -> activation de l'URL workers.dev. Affiche l'URL finale.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const NAME = opt('name', 'coolok-dev');
const DIST = path.resolve(__dirname, opt('dist', 'dist'));
// Identifiant de compte Cloudflare : option --account, sinon variable d'environnement, sinon fichier local .deploy.json
// ({ "account": "..." }, ignoré par git). Jamais en dur dans le code : le dépôt est public.
function accountId() {
  const fromOpt = opt('account', ''); if (fromOpt) return fromOpt;
  if (process.env.CLOUDFLARE_ACCOUNT_ID_COOLOK) return process.env.CLOUDFLARE_ACCOUNT_ID_COOLOK;
  const local = path.join(__dirname, '.deploy.json');
  if (fs.existsSync(local)) { try { const j = JSON.parse(fs.readFileSync(local, 'utf8')); if (j.account) return j.account; } catch (e) { /* fichier illisible : traité comme absent */ } }
  console.error('Identifiant de compte Cloudflare manquant : --account, CLOUDFLARE_ACCOUNT_ID_COOLOK ou .deploy.json'); process.exit(1);
}
const ACCOUNT = accountId();
const TOKEN = process.env.CLOUDFLARE_API_TOKEN_COOLOK;
const secrets = [];
args.forEach((a, i) => { if (a === '--secret' && args[i + 1]) { const [k, ...v] = args[i + 1].split('='); secrets.push({ name: k, text: v.join('=') }); } });
if (!TOKEN) { console.error('CLOUDFLARE_API_TOKEN_COOLOK manquant.'); process.exit(1); }
if (!fs.existsSync(DIST)) { console.error('dist absent : lancer node build.js d\'abord.'); process.exit(1); }

const API = 'https://api.cloudflare.com/client/v4';
const H = { Authorization: `Bearer ${TOKEN}` };
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'application/javascript; charset=utf-8', json: 'application/json; charset=utf-8', xml: 'application/xml; charset=utf-8', txt: 'text/plain; charset=utf-8', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', ico: 'image/x-icon', woff2: 'font/woff2' };

function walk(dir, base) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p, base));
    else out.push({ abs: p, rel: '/' + path.relative(base, p).split(path.sep).join('/') });
  }
  return out;
}

async function cf(method, url, body, headers) {
  const r = await fetch(url, { method, headers: Object.assign({}, H, headers || {}), body });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch (e) { j = { raw: text }; }
  if (!r.ok || j.success === false) throw new Error(`${method} ${url} -> ${r.status} ${JSON.stringify(j.errors || j.raw || j).slice(0, 600)}`);
  return j;
}

(async () => {
  const files = walk(DIST, DIST).filter((f) => !/\/manifest\.json$/.test(f.rel));
  const manifest = {};
  const byHash = {};
  for (const f of files) {
    const buf = fs.readFileSync(f.abs);
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32);
    manifest[f.rel] = { hash, size: buf.length };
    byHash[hash] = f;
  }
  console.log(`${files.length} fichiers, ${(files.reduce((s, f) => s + fs.statSync(f.abs).size, 0) / 1024 / 1024).toFixed(2)} Mo`);

  // 1. session d'upload
  const sess = await cf('POST', `${API}/accounts/${ACCOUNT}/workers/scripts/${NAME}/assets-upload-session`, JSON.stringify({ manifest }), { 'content-type': 'application/json' });
  let jwt = sess.result.jwt;
  const buckets = sess.result.buckets || [];
  console.log(`session ouverte : ${buckets.reduce((s, b) => s + b.length, 0)} fichiers à envoyer en ${buckets.length} lot(s)`);

  // 2. upload par lots
  for (let i = 0; i < buckets.length; i++) {
    const fd = new FormData();
    for (const hash of buckets[i]) {
      const f = byHash[hash];
      const ext = (f.rel.match(/\.([a-z0-9]+)$/i) || [])[1] || '';
      const b64 = fs.readFileSync(f.abs).toString('base64');
      fd.append(hash, new Blob([b64], { type: MIME[ext.toLowerCase()] || 'application/octet-stream' }), hash);
    }
    const r = await fetch(`${API}/accounts/${ACCOUNT}/workers/assets/upload?base64=true`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: fd });
    const j = await r.json();
    if (!r.ok || j.success === false) throw new Error(`upload lot ${i + 1} : ${r.status} ${JSON.stringify(j.errors || j).slice(0, 600)}`);
    if (j.result && j.result.jwt) jwt = j.result.jwt;
    console.log(`lot ${i + 1}/${buckets.length} envoyé (${buckets[i].length} fichiers)`);
  }

  // 3. script + assets
  const metadata = {
    main_module: 'index.js',
    compatibility_date: '2025-09-01',
    compatibility_flags: ['nodejs_compat'],
    assets: { jwt, config: { html_handling: 'auto-trailing-slash', not_found_handling: '404-page', run_worker_first: opt('worker-first', 'all') === 'api' ? ['/api/*'] : true } },
    bindings: [{ type: 'assets', name: 'ASSETS' }],
    observability: { enabled: true },
  };
  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
  fd.append('index.js', new Blob([fs.readFileSync(path.join(__dirname, 'worker', 'index.js'))], { type: 'application/javascript+module' }), 'index.js');
  const put = await cf('PUT', `${API}/accounts/${ACCOUNT}/workers/scripts/${NAME}`, fd);
  console.log(`script ${NAME} déployé (version ${put.result && put.result.id ? put.result.id : 'ok'})`);

  // 4. secrets
  for (const s of secrets) {
    await cf('PUT', `${API}/accounts/${ACCOUNT}/workers/scripts/${NAME}/secrets`, JSON.stringify({ name: s.name, text: s.text, type: 'secret_text' }), { 'content-type': 'application/json' });
    console.log(`secret ${s.name} posé`);
  }

  // 5. workers.dev
  if (!args.includes('--no-subdomain')) {
    const sub = await cf('GET', `${API}/accounts/${ACCOUNT}/workers/subdomain`);
    await cf('POST', `${API}/accounts/${ACCOUNT}/workers/scripts/${NAME}/subdomain`, JSON.stringify({ enabled: true, previews_enabled: false }), { 'content-type': 'application/json' });
    console.log(`URL : https://${NAME}.${sub.result.subdomain}.workers.dev/`);
  }
})().catch((e) => { console.error('ÉCHEC :', e.message); process.exit(1); });
