#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jsonPath = path.join(root, 'dados', 'respostas.json');
const respostasDir = path.join(root, 'respostas');
const actions = new Set([
  'pedir', 'preparar', 'confirmar', 'resolver', 'reclamar',
  'usar', 'organizar', 'obter', 'renovar', 'proteger'
]);
const preference = ['pedir', 'obter', 'usar', 'renovar', 'reclamar', 'confirmar', 'preparar', 'organizar', 'proteger', 'resolver'];

const entries = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const generated = [];
const permanent = [];

for (const entry of entries) {
  const match = entry.title.match(/^Como ([^ ]+) (.+)$/i);
  const action = match && match[1].toLowerCase();
  if (match && actions.has(action)) {
    generated.push({ entry, action, subject: match[2] });
  } else {
    permanent.push(entry);
  }
}

const groups = new Map();
for (const item of generated) {
  const key = `${item.entry.category}\u0000${item.subject.toLowerCase()}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(item);
}

function bodyFingerprint(slug) {
  const file = path.join(respostasDir, `${slug}.html`);
  const html = fs.readFileSync(file, 'utf8');
  const match = html.match(/<h2>Passos<\/h2>([\s\S]*?)<p><a href="\.\.\/index\.html">/);
  return match ? match[1].replace(/\s+/g, ' ').trim() : null;
}

const keep = [...permanent];
const remove = [];
const conflicts = [];

for (const items of groups.values()) {
  if (items.length === 1) {
    keep.push(items[0].entry);
    continue;
  }

  const fingerprints = new Set(items.map(item => bodyFingerprint(item.entry.slug)));
  if (fingerprints.size !== 1 || fingerprints.has(null)) {
    conflicts.push(items.map(item => item.entry.slug));
    keep.push(...items.map(item => item.entry));
    continue;
  }

  items.sort((a, b) => preference.indexOf(a.action) - preference.indexOf(b.action));
  const canonical = items[0].entry;
  const synonyms = items.slice(1).map(item => item.action).join(' ');
  canonical.keywords = `${canonical.keywords} ${synonyms}`.trim();
  keep.push(canonical);
  remove.push(...items.slice(1).map(item => item.entry));
}

keep.sort((a, b) => a.category.localeCompare(b.category, 'pt') || a.title.localeCompare(b.title, 'pt'));
fs.writeFileSync(jsonPath, `${JSON.stringify(keep, null, 2)}\n`);

for (const entry of remove) {
  fs.unlinkSync(path.join(respostasDir, `${entry.slug}.html`));
}

const byCategory = new Map();
for (const entry of keep) {
  if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
  byCategory.get(entry.category).push(entry);
}

const categoryFiles = fs.readdirSync(root).filter(name => /^categoria-.+\.html$/.test(name));
for (const filename of categoryFiles) {
  const file = path.join(root, filename);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<article class="result-card">[\s\S]*?<\/article>/g, card => {
    const match = card.match(/href="respostas\/([^"/]+)\.html"/);
    return match && remove.some(entry => entry.slug === match[1]) ? '' : card;
  });
  const count = (html.match(/<article class="result-card">/g) || []).length;
  html = html.replace(/<h1>([^<]+)<\/h1><p>\d+ respostas\.<\/p>/, `<h1>$1</h1><p>${count} respostas.</p>`);
  fs.writeFileSync(file, html);
}

let categories = fs.readFileSync(path.join(root, 'categorias.html'), 'utf8');
for (const [category, items] of byCategory) {
  const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(<h2><a href="categoria-[^"]+\\.html">${escaped}<\\/a><\\/h2><p>)\\d+( guias publicados\\.<\\/p>)`);
  categories = categories.replace(pattern, `$1${items.length}$2`);
}
categories = categories.replace(/\d+ guias em 20 categorias\./g, `${keep.length} guias em 20 categorias.`);
fs.writeFileSync(path.join(root, 'categorias.html'), categories);

const indexPath = path.join(root, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/\d+ guias em 20 categorias\./g, `${keep.length} guias em 20 categorias.`);
fs.writeFileSync(indexPath, index);

console.log(JSON.stringify({ before: entries.length, after: keep.length, removed: remove.length, groups: groups.size, conflicts: conflicts.length }, null, 2));
if (conflicts.length) {
  console.error('Grupos não removidos por terem conteúdo diferente:');
  console.error(JSON.stringify(conflicts, null, 2));
}
