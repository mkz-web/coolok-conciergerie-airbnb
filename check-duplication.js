#!/usr/bin/env node
'use strict';
/*
 * Contrôle de duplication du site Coolok : mesure ce que deux pages du même type partagent réellement.
 * ----------------------------------------------------------------------------------------------------
 * Exécution : node check-duplication.js [--dist dist] [--seuil 30] [--details]
 * Runtime minimal : Node >= 14 natif. Dépendances : aucune.
 * Méthode : on lit le texte rendu de chaque page (balise main, hors navigation, pied de page, blocs
 * automatiques communs), on le découpe en fenêtres de 5 mots, et on calcule pour chaque paire de pages
 * du même type la part des fenêtres de A présentes dans B. Le score d'une page est sa moyenne sur ses paires.
 * Sortie en code 1 si une page dépasse le seuil (30 % par défaut), critère de recette de la refonte.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const DIST = path.resolve(__dirname, opt('dist', 'dist'));
const SEUIL = Number(opt('seuil', 30));
const DETAILS = args.includes('--details');

if (!fs.existsSync(DIST)) { console.error('dist absent : lancer node build.js.'); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));

// Blocs communs par construction (tarif, avis, bandes et rappels d'action, relance de fin de FAQ, guides connexes, grilles de liens) :
// ils sont volontairement partagés, on les retire avant de mesurer le texte propre à la page.
const SECTIONS_COMMUNES = /<section class="section (pricing|testimonials|articles|logos|links|midcta)[^"]*"[\s\S]*?<\/section>/g;
const AUTRES_COMMUNS = /<section class="cta-band[\s\S]*?<\/section>|<nav class="breadcrumb[\s\S]*?<\/nav>|<nav class="toc[\s\S]*?<\/nav>|<p class="faq-more">[\s\S]*?<\/p>/g;

function texte(file) {
  const html = fs.readFileSync(path.join(DIST, file), 'utf8');
  let main = (html.match(/<main id="contenu">([\s\S]*)<\/main>/) || [])[1] || '';
  main = main.replace(SECTIONS_COMMUNES, ' ').replace(AUTRES_COMMUNS, ' ');
  return main
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .toLowerCase()
    .replace(/[^a-zà-ÿ0-9%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fenetres(t, n) {
  const mots = t.split(' ').filter(Boolean);
  const s = new Set();
  for (let i = 0; i + n <= mots.length; i++) s.add(mots.slice(i, i + n).join(' '));
  return s;
}

const TYPES = ['commune', 'departement', 'article'];
let echec = 0;
const rapport = [];

for (const type of TYPES) {
  const pages = manifest.pages.filter((p) => p.type === type);
  if (pages.length < 2) continue;
  const data = pages.map((p) => ({ url: p.url, mots: 0, set: null }));
  data.forEach((d, i) => { const t = texte(pages[i].file); d.mots = t.split(' ').length; d.set = fenetres(t, 5); });

  const scores = [];
  for (let i = 0; i < data.length; i++) {
    let total = 0, pire = 0, pireUrl = '';
    for (let j = 0; j < data.length; j++) {
      if (i === j) continue;
      let communs = 0;
      for (const f of data[i].set) if (data[j].set.has(f)) communs++;
      const part = data[i].set.size ? (communs / data[i].set.size) * 100 : 0;
      total += part;
      if (part > pire) { pire = part; pireUrl = data[j].url; }
    }
    const moyenne = total / (data.length - 1);
    scores.push({ url: data[i].url, mots: data[i].mots, moyenne, pire, pireUrl });
  }
  scores.sort((a, b) => b.moyenne - a.moyenne);
  const moyenneType = scores.reduce((s, x) => s + x.moyenne, 0) / scores.length;
  rapport.push({ type, pages: scores.length, moyenneType, scores });
  console.log(`\n=== ${type} (${scores.length} pages) : partage moyen ${moyenneType.toFixed(1)} %`);
  for (const s of scores.slice(0, DETAILS ? scores.length : 5)) {
    const flag = s.moyenne > SEUIL ? 'x' : ' ';
    console.log(`  ${flag} ${s.moyenne.toFixed(1).padStart(5)} % moyen · ${s.pire.toFixed(1).padStart(5)} % avec ${s.pireUrl} · ${String(s.mots).padStart(5)} mots · ${s.url}`);
    if (s.moyenne > SEUIL) echec++;
  }
}

console.log(`\nSeuil : ${SEUIL} % de texte partagé (hors blocs communs par construction).`);
if (echec) { console.log(`ÉCHEC : ${echec} page(s) au-dessus du seuil.`); process.exit(1); }
console.log('OK : aucune page au-dessus du seuil.');
