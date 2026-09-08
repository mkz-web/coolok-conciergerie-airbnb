'use strict';
/*
 * Helpers HTML du générateur de site Coolok.
 * Runtime : Node >= 14 natif. Dépendances : aucune.
 */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
}

function attrs(obj) {
  if (!obj) return '';
  return Object.keys(obj)
    .filter((k) => obj[k] !== null && obj[k] !== undefined && obj[k] !== false)
    .map((k) => (obj[k] === true ? ` ${k}` : ` ${k}="${esc(obj[k])}"`))
    .join('');
}

function stripTags(html) {
  return String(html == null ? '' : html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text) {
  const t = stripTags(text);
  if (!t) return 0;
  return t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function slugify(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function truncate(s, n) {
  s = String(s || '');
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const i = cut.lastIndexOf(' ');
  return (i > n * 0.6 ? cut.slice(0, i) : cut).replace(/[\s,;:]+$/, '') + '…';
}

// Format d'un nombre à la française : 12 345
function nf(n) {
  if (n === null || n === undefined || n === '') return '';
  const s = String(Math.round(Number(n)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Typographie française minimale : espace insécable avant : ; ! ? et à l'intérieur des « »
function typo(s) {
  return String(s || '')
    .replace(/ ([:;!?])/g, ' $1')
    .replace(/« /g, '« ')
    .replace(/ »/g, ' »');
}

// Convertit un texte simple (avec **gras**, *italique*, [ancre](url) et sauts de ligne) en HTML inline
function inline(s) {
  if (s == null) return '';
  let out = esc(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, u) => `<a href="${esc(u)}">${a}</a>`);
  out = out.replace(/\n/g, '<br>');
  return typo(out);
}

// Paragraphes : chaque bloc séparé par une ligne vide devient un <p>
function paragraphs(s, cls) {
  if (!s) return '';
  return String(s)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p${cls ? ` class="${cls}"` : ''}>${inline(p)}</p>`)
    .join('\n');
}

function uid(prefix) {
  uid.n = (uid.n || 0) + 1;
  return `${prefix || 'id'}-${uid.n}`;
}

module.exports = { esc, attrs, stripTags, wordCount, slugify, truncate, nf, typo, inline, paragraphs, uid };
