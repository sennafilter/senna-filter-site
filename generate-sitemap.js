#!/usr/bin/env node
/* Regenerates sitemap.xml from the .html pages in this folder, plus every guide in guides-src/.
   Runs on every Vercel build (after build-guides.js) so new pages are picked up automatically. */
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

const entries = pages.map(f => ({
  loc: ORIGIN + route(f),
  lastmod: iso(f),
  priority: f === 'index.html' ? '1.0' : '0.8'
}));

// individual guides: /guides/<slug>, dated by the date: line in each guide's source file
const GSRC = path.join(DIR, 'guides-src');
if (fs.existsSync(GSRC)) {
  fs.readdirSync(GSRC).filter(f => f.endsWith('.txt')).sort().forEach(f => {
    const head = fs.readFileSync(path.join(GSRC, f), 'utf8').split('\n---\n')[0];
    const m = head.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
    entries.push({
      loc: ORIGIN + '/guides/' + f.replace(/\.txt$/, ''),
      lastmod: m ? m[1] : new Date().toISOString().slice(0, 10),
      priority: '0.7'
    });
  });
}

const urls = entries.map(e =>
  `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
fs.writeFileSync(path.join(DIR, 'sitemap.xml'), xml);
console.log(`sitemap.xml written with ${entries.length} pages`);
