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

// llms.txt: a plain-text map of the site for AI tools (ChatGPT, Claude, Perplexity, etc.).
// Rebuilt on every deploy so new guides show up automatically.
function guideMeta(file) {
  const head = fs.readFileSync(path.join(GSRC, file), 'utf8').split('\n---\n')[0];
  const get = k => { const m = head.match(new RegExp('^' + k + ':\\s*(.*)$', 'm')); return m ? m[1].trim() : ''; };
  return { slug: file.replace(/\.txt$/, ''), title: get('title'), desc: get('desc') || get('lead'), date: get('date') };
}
const guideLines = fs.existsSync(GSRC)
  ? fs.readdirSync(GSRC).filter(f => f.endsWith('.txt')).map(guideMeta)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)))
      .map(g => `- [${g.title}](${ORIGIN}/guides/${g.slug})${g.desc ? ': ' + g.desc : ''}`)
  : [];
const llms = [
  '# Senna Filter',
  '',
  '> Senna Filter is the website of Senna, an AI educator and creator (@sennafilter) who makes AI make sense for people without "tech" in their title. Biochemist by training, self-taught in data and AI, three-time Microsoft MVP. The site has free plain-English guides, a self-paced AI course, and info on brand partnerships and keynotes. Not related to physical filters or air purifiers.',
  '',
  '## Main pages',
  '',
  `- [Home](${ORIGIN}/): Who Senna is and what she makes`,
  `- [About](${ORIGIN}/about): Senna's background, from biochemistry to AI strategy and educator`,
  `- [Courses](${ORIGIN}/courses): "AI From Beginner to Agents", a self-paced course from first prompt to building automations and agents. No coding experience required. Waitlist open, doors open January 4th`,
  `- [Guides](${ORIGIN}/guides): Free guides on Claude, ChatGPT, prompting, vibe coding, and AI agents`,
  `- [Work with me](${ORIGIN}/work-with-me): Brand partnerships and keynote speaking inquiries`,
  '',
  '## Guides',
  '',
  ...guideLines,
  '',
  '## Contact',
  '',
  '- Email: contact@senna-filter.com',
  '- Instagram: https://www.instagram.com/sennafilter/',
  '- TikTok: https://www.tiktok.com/@sennafilter',
  '- LinkedIn: https://www.linkedin.com/in/senna-filter-29698a183/',
  ''
].join('\n');
fs.writeFileSync(path.join(DIR, 'llms.txt'), llms);
console.log(`llms.txt written with ${guideLines.length} guides`);
