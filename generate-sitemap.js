#!/usr/bin/env node
/* Regenerates sitemap.xml from the .html pages in this folder.
   Runs on every Vercel build so new pages are picked up automatically. */
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://www.senna-filter.com';
const DIR = __dirname;
// files that are real, indexable pages (skip 404s, drafts, partials)
const EXCLUDE = new Set(['404.html']);

function route(file) {
  if (file === 'index.html') return '/';
  return '/' + file.replace(/\.html$/, ''); // cleanUrls: /workshops, /guides
}
function iso(file) {
  return fs.statSync(path.join(DIR, file)).mtime.toISOString().slice(0, 10);
}

const pages = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.html') && !EXCLUDE.has(f))
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));

const urls = pages.map(f => {
  const loc = ORIGIN + route(f);
  const priority = f === 'index.html' ? '1.0' : '0.8';
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${iso(f)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
fs.writeFileSync(path.join(DIR, 'sitemap.xml'), xml);
console.log(`sitemap.xml written with ${pages.length} pages: ${pages.map(route).join(', ')}`);
