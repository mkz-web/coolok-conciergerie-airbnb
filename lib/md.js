'use strict';
/*
 * Mini convertisseur Markdown -> HTML pour les contenus du site Coolok.
 * Couvre : frontmatter (--- yaml simple ---), titres # à ####, paragraphes, gras, italique,
 * liens, images, listes (- ou 1.), citations (>), tableaux GFM, séparateurs (---), <br>.
 * Les blocs HTML bruts (lignes commençant par <) passent tels quels.
 * Runtime : Node >= 14 natif. Dépendances : aucune.
 */
const { esc, slugify, typo } = require('./html');

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  let curKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    const li = line.match(/^\s+-\s+(.*)$/);
    if (li && curKey) {
      if (!Array.isArray(meta[curKey])) meta[curKey] = [];
      meta[curKey].push(unquote(li[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_\-]+)\s*:\s*(.*)$/);
    if (kv) {
      curKey = kv[1];
      const v = kv[2].trim();
      if (v === '' ) { meta[curKey] = []; continue; }
      if (/^\[.*\]$/.test(v)) {
        meta[curKey] = v.slice(1, -1).split(',').map((x) => unquote(x.trim())).filter(Boolean);
      } else if (v === 'true' || v === 'false') meta[curKey] = v === 'true';
      else meta[curKey] = unquote(v);
    }
  }
  return { meta, body: src.slice(m[0].length) };
}

function unquote(v) {
  v = String(v).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

function inlineMd(s) {
  let out = esc(s);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, a, u) => `<img src="${esc(u)}" alt="${a}" loading="lazy">`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*\w])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, u) => `<a href="${esc(u)}">${a}</a>`);
  out = out.replace(/ {2,}$/g, '<br>');
  return typo(out);
}

function render(md, opts) {
  opts = opts || {};
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const headings = [];
  let i = 0;
  const usedIds = new Set();
  const mkId = (t) => {
    let base = slugify(t) || 'section';
    let id = base, n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };
  while (i < lines.length) {
    let line = lines[i];
    if (!line.trim()) { i++; continue; }
    // HTML brut
    if (/^\s*<(table|div|section|figure|details|blockquote|p|ul|ol|h[1-6]|hr|iframe|img)/i.test(line)) {
      const buf = [];
      while (i < lines.length && lines[i].trim()) { buf.push(lines[i]); i++; }
      out.push(buf.join('\n'));
      continue;
    }
    // titres
    const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) {
      const level = h[1].length + (opts.shiftHeadings || 0);
      // Identifiant explicite « ## Titre {#ancre} » : sans lui, le titre des mentions légales
      // s'affichait avec « {#donnees-personnelles} » en clair et recevait l'id
      // « donnees-personnelles-donnees-personnelles », ce qui cassait les liens du pied de page
      // et des formulaires vers /mentions-legales#donnees-personnelles (constaté le 30/09/2026).
      const ancre = h[2].match(/^(.*?)\s*\{#([a-z0-9-]+)\}$/i);
      const text = (ancre ? ancre[1] : h[2]).trim();
      const id = ancre && !usedIds.has(ancre[2]) ? (usedIds.add(ancre[2]), ancre[2]) : mkId(text);
      headings.push({ level, text, id });
      out.push(`<h${level} id="${id}">${inlineMd(text)}</h${level}>`);
      i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    // tableau GFM
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      let t = '<div class="table-wrap"><table><thead><tr>' + head.map((c) => `<th>${inlineMd(c)}</th>`).join('') + '</tr></thead><tbody>';
      for (const r of body) t += '<tr>' + r.map((c, k) => `<td${k === 0 ? ' data-label="' + esc(head[0]) + '"' : ' data-label="' + esc(head[k] || '') + '"'}>${inlineMd(c)}</td>`).join('') + '</tr>';
      t += '</tbody></table></div>';
      out.push(t);
      continue;
    }
    // citation
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push(`<blockquote>${render(buf.join('\n'), { shiftHeadings: opts.shiftHeadings }).html}</blockquote>`);
      continue;
    }
    // listes
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && (/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''));
        else items[items.length - 1] += '\n' + lines[i].trim();
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map((it) => {
        const sub = it.split('\n');
        const first = sub.shift();
        const nested = sub.length && sub.every((s) => /^([-*+]|\d+[.)])\s+/.test(s)) ? render(sub.join('\n')).html : (sub.length ? ' ' + inlineMd(sub.join(' ')) : '');
        return `<li>${inlineMd(first)}${nested}</li>`;
      }).join('') + `</${tag}>`);
      continue;
    }
    // paragraphe
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*>|\s*([-*+]|\d+[.)])\s+|\s*\||\s*<)/.test(lines[i])) { buf.push(lines[i]); i++; }
    if (buf.length) out.push(`<p>${inlineMd(buf.join('\n'))}</p>`);
    else { out.push(`<p>${inlineMd(line)}</p>`); i++; }
  }
  return { html: out.join('\n'), headings };
}

module.exports = { parseFrontmatter, render, inlineMd };
