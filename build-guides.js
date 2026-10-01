#!/usr/bin/env node
/* Senna Filter: builds the Guides section from plain text files.

   Each guide lives in guides-src/<slug>.txt. On every Vercel build this script writes:
     guides/<slug>.html   one page per guide  ->  /guides/<slug>
     guides.html          the library page    ->  /guides

   To add a guide: add one file to guides-src/ and push. That's it.
   (guides.html and guides/ are generated. Edit the .txt files, not the HTML.)

   File format:
     title: ...        required
     cat: claude setup   one or more of: claude prompting setup vibe basics agents thinking resources
     date: 2026-10-01
     desc: one-line description (library list + Google snippet)
     lead: optional bigger intro line under the title
     ---
     body. Blank line between blocks. Supported:
       # 1. Step title        numbered step card      ~ italic subtitle under a heading
       ## Section title        section heading        ### Small heading
       > **Start here.** ...   callout box
       - bullets   1. numbered   [ ] checklist   | table | rows |   ```code block (copy button)```
       **bold**  *italic*  `code`  [link text](https://...)
*/
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'guides-src');
const OUT = path.join(ROOT, 'guides');
const ORIGIN = 'https://www.senna-filter.com';

const CATS = [
  ['claude', 'Claude'],
  ['prompting', 'Prompting'],
  ['setup', 'Setup kits'],
  ['vibe', 'Vibe coding'],
  ['basics', 'Fundamentals'],
  ['agents', 'AI agents'],
  ['thinking', 'Thinking'],
  ['resources', 'Resources']
];
const CATNAME = Object.fromEntries(CATS);

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function attr(s) {
  return esc(s).replace(/"/g, '&quot;');
}
function inline(s) {
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (m, t, u) {
    return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>';
  });
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s;
}

/* ---------- parse one source file ---------- */
function parseFile(file) {
  const raw = fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\r/g, '');
  const cut = raw.indexOf('\n---\n');
  if (cut === -1) throw new Error('missing --- line');
  const meta = {};
  raw.slice(0, cut).split('\n').forEach(function (line) {
    const m = line.match(/^([a-z]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  });
  if (!meta.title) throw new Error('missing title');
  meta.slug = file.replace(/\.txt$/, '');
  meta.cats = (meta.cat || '').split(/\s+/).filter(function (c) { return CATNAME[c]; });
  if (!meta.cats.length) meta.cats = ['basics'];
  meta.date = meta.date || '2026-01-01';
  meta.desc = meta.desc || meta.lead || meta.title;
  meta.lead = meta.lead || meta.desc;
  meta.body = raw.slice(cut + 5);
  return meta;
}

/* ---------- body -> blocks ---------- */
function parseBody(text) {
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('```')) {
      let j = i + 1; const buf = [];
      while (j < lines.length && !lines[j].startsWith('```')) { buf.push(lines[j]); j++; }
      blocks.push({ t: 'code', text: buf.join('\n') });
      i = j + 1; continue;
    }
    if (l.startsWith('### ')) { blocks.push({ t: 'h3', text: l.slice(4) }); i++; continue; }
    if (l.startsWith('## ')) { blocks.push({ t: 'h2', text: l.slice(3) }); i++; continue; }
    if (l.startsWith('# ')) {
      const m = l.slice(2).match(/^(\d+)\.\s+(.*)$/);
      blocks.push({ t: 'card', n: m ? m[1] : '', text: m ? m[2] : l.slice(2) });
      i++; continue;
    }
    if (l.startsWith('~ ')) { blocks.push({ t: 'sub', text: l.slice(2) }); i++; continue; }
    if (l.startsWith('> ')) { blocks.push({ t: 'callout', text: l.slice(2) }); i++; continue; }
    if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); }));
        i++;
      }
      blocks.push({ t: 'table', rows: rows }); continue;
    }
    if (/^\[ \] /.test(l)) {
      const items = [];
      while (i < lines.length && /^\[ \] /.test(lines[i])) { items.push(lines[i].slice(4)); i++; }
      blocks.push({ t: 'check', items: items }); continue;
    }
    if (/^- /.test(l)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
      blocks.push({ t: 'ul', items: items }); continue;
    }
    if (/^\d+\.\s/.test(l)) {
      const items = []; const start = parseInt(l, 10);
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++; }
      blocks.push({ t: 'ol', items: items, start: start }); continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim()) { para.push(lines[i]); i++; }
    blocks.push({ t: 'p', text: para.join(' ') });
  }
  return blocks;
}

function renderBlock(b, ids) {
  switch (b.t) {
    case 'p': return '<p>' + inline(b.text) + '</p>';
    case 'sub': return '<p class="sub">' + inline(b.text) + '</p>';
    case 'h3': return '<h3 class="gh3">' + inline(b.text) + '</h3>';
    case 'h2': return '<h2 class="gh">' + inline(b.text) + '</h2>';
    case 'callout': return '<div class="start">' + inline(b.text) + '</div>';
    case 'ul': return '<ul class="gl">' + b.items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>';
    case 'ol': return '<ol class="gl" start="' + b.start + '">' + b.items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ol>';
    case 'check':
      return '<ul class="gcheck">' + b.items.map(function (x) {
        const id = 'c' + (ids.n++);
        return '<li><input type="checkbox" id="' + id + '" /><label for="' + id + '">' + inline(x) + '</label></li>';
      }).join('') + '</ul>';
    case 'code':
      return '<div class="tpl"><button type="button" class="copy">Copy</button><pre>' + esc(b.text) + '</pre></div>';
    case 'table': {
      const head = b.rows[0]; const rest = b.rows.slice(1);
      return '<div class="tbl"><table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + rest.map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }
  }
  return '';
}

function renderBody(blocks) {
  const ids = { n: 1 };
  let html = ''; let card = null; let k = 0;
  function close() {
    if (!card) return;
    html += '<div class="gstep c' + ((k++ % 4) + 1) + (card.n ? '' : ' nonum') + '">' +
      (card.n ? '<div class="num">' + card.n + '</div>' : '') +
      '<div class="gbody"><h3>' + inline(card.text) + '</h3>' + card.html + '</div></div>';
    card = null;
  }
  blocks.forEach(function (b) {
    if (b.t === 'card') { close(); card = { n: b.n, text: b.text, html: '' }; return; }
    if (b.t === 'h2') { close(); html += renderBlock(b, ids); return; }
    if (card) card.html += renderBlock(b, ids); else html += renderBlock(b, ids);
  });
  close();
  return html;
}

/* ---------- shared site chrome (copied from the live pages) ---------- */
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com" />\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..600&family=Instrument+Serif:ital@0;1&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />';

const SAMEAS = [
  'https://www.linkedin.com/in/senna-filter-29698a183/',
  'https://www.instagram.com/sennafilter/',
  'https://www.tiktok.com/@sennajillian',
  'https://www.youtube.com/channel/UChR2IHt4rpOVCOc4ZQRxvmg'
];
function baseGraph() {
  return [
    { '@type': 'Organization', '@id': ORIGIN + '/#organization', name: 'Senna Filter', url: ORIGIN + '/',
      logo: { '@type': 'ImageObject', url: ORIGIN + '/logo-512.png', width: 512, height: 512 }, sameAs: SAMEAS },
    { '@type': 'WebSite', '@id': ORIGIN + '/#website', name: 'Senna Filter', url: ORIGIN + '/', publisher: { '@id': ORIGIN + '/#organization' } },
    { '@type': 'Person', '@id': ORIGIN + '/#person', name: 'Senna Filter', jobTitle: 'AI Educator & Strategist', url: ORIGIN + '/',
      alumniOf: { '@type': 'CollegeOrUniversity', name: 'Cal Poly SLO' }, worksFor: { '@id': ORIGIN + '/#organization' }, sameAs: SAMEAS }
  ];
}
function head(opts) {
  const graph = baseGraph().concat(opts.extraGraph || []);
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
    '<title>' + esc(opts.title) + '</title>\n' +
    '<meta name="description" content="' + attr(opts.desc) + '" />\n' +
    '<link rel="canonical" href="' + opts.url + '" />\n' +
    '<meta property="og:type" content="' + (opts.ogType || 'website') + '" />\n' +
    '<meta property="og:site_name" content="Senna Filter" />\n' +
    '<meta property="og:title" content="' + attr(opts.title) + '" />\n' +
    '<meta property="og:description" content="' + attr(opts.desc) + '" />\n' +
    '<meta property="og:url" content="' + opts.url + '" />\n' +
    '<meta property="og:image" content="' + ORIGIN + '/og-image.png" />\n' +
    '<meta property="og:image:width" content="1200" />\n<meta property="og:image:height" content="630" />\n' +
    '<meta property="og:image:alt" content="Senna Filter — AI education for regular people" />\n' +
    '<meta name="twitter:card" content="summary_large_image" />\n' +
    '<meta name="twitter:title" content="' + attr(opts.title) + '" />\n' +
    '<meta name="twitter:description" content="' + attr(opts.desc) + '" />\n' +
    '<meta name="twitter:image" content="' + ORIGIN + '/og-image.png" />\n' +
    '<script type="application/ld+json">\n' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2) + '\n</script>\n' +
    FONTS + '\n<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n' +
    '<link rel="stylesheet" href="/styles.css" />\n<link rel="stylesheet" href="/guides.css" />\n</head>\n';
}
const NAV = '<header class="nav">\n  <div class="wrap nav-inner">\n    <a class="brand" href="/" aria-label="Senna Filter — home">Senna<span class="dot"> Filter</span></a>\n    <button class="nav-toggle" aria-label="Menu">Menu</button>\n    <nav class="nav-links">\n      <a href="/#about">About</a>\n      <a href="/#work">What I do</a>\n      <a href="/workshops">Workshops</a>\n      <a class="active" href="/guides">Guides</a>\n      <a class="btn btn-sm nav-cta" href="/#contact">Work with me</a>\n    </nav>\n  </div>\n</header>\n';
const FOOT = '<footer class="foot">\n  <div class="wrap">\n    <div class="foot-top">\n      <div class="foot-brand">\n        <a class="brand" href="/">Senna<span class="dot"> Filter</span></a>\n        <p>Helping everyday people understand AI — no computer science degree required.</p>\n      </div>\n      <div class="foot-cols">\n        <div class="foot-col">\n          <h4>Explore</h4>\n          <ul>\n            <li><a href="/#about">About</a></li>\n            <li><a href="/#work">What I do</a></li>\n            <li><a href="/workshops">Workshops</a></li>\n            <li><a href="/guides">Guides</a></li>\n          </ul>\n        </div>\n        <div class="foot-col">\n          <h4>Connect</h4>\n          <ul>\n            <li><a href="/#contact">Contact</a></li>\n            <li><a href="mailto:contact@senna-filter.com">Email</a></li>\n            <li><a href="https://www.linkedin.com/in/senna-filter-29698a183/" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>\n            <li><a href="https://www.instagram.com/sennafilter/" target="_blank" rel="noopener noreferrer">Instagram</a></li>\n            <li><a href="https://www.tiktok.com/@sennafilter" target="_blank" rel="noopener noreferrer">TikTok</a></li>\n          </ul>\n        </div>\n      </div>\n    </div>\n    <div class="foot-bottom">\n      <p>© 2026 Senna Filter</p>\n    </div>\n  </div>\n</footer>\n\n<script src="/site.js"></script>\n<script src="/guides.js"></script>\n</body>\n</html>\n';

function row(g) {
  return '        <li class="reveal" data-cat="' + g.cats.join(' ') + '" data-search="' + attr((g.title + ' ' + g.desc).toLowerCase()) + '">\n' +
    '          <div><h3><a href="/guides/' + g.slug + '" style="color:inherit">' + esc(g.title) + '</a></h3><p>' + esc(g.desc) + '</p></div>\n' +
    '          <a class="text-link" href="/guides/' + g.slug + '">Read it <span class="arr">→</span></a>\n        </li>\n';
}

/* ---------- pages ---------- */
function guidePage(g, all) {
  const url = ORIGIN + '/guides/' + g.slug;
  const primary = g.cats[0];
  const related = all.filter(function (x) { return x.slug !== g.slug && x.cats.indexOf(primary) > -1; }).slice(0, 3);
  const fill = all.filter(function (x) { return x.slug !== g.slug && related.indexOf(x) === -1; });
  while (related.length < 3 && fill.length) related.push(fill.shift());
  const title = g.title + ' — Senna Filter';
  const graph = [
    { '@type': 'Article', '@id': url + '#article', headline: g.title, description: g.desc, datePublished: g.date, dateModified: g.date,
      mainEntityOfPage: url, image: ORIGIN + '/og-image.png', author: { '@id': ORIGIN + '/#person' }, publisher: { '@id': ORIGIN + '/#organization' } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Guides', item: ORIGIN + '/guides' },
      { '@type': 'ListItem', position: 2, name: g.title, item: url } ] }
  ];
  return head({ title: title, desc: g.desc, url: url, ogType: 'article', extraGraph: graph }) +
    '<body data-theme="harbor" data-font="editorial">\n\n' + NAV + '\n<main id="top">\n' +
    '  <section class="guide-top">\n    <div class="wrap">\n' +
    '      <p class="crumbs"><a href="/guides">Guides</a> / ' + esc(CATNAME[primary]) + '</p>\n' +
    '      <p class="eyebrow">' + esc(CATNAME[primary]) + '</p>\n' +
    '      <h1>' + esc(g.title) + '</h1>\n' +
    '      <p class="lead">' + inline(g.lead) + '</p>\n' +
    '    </div>\n  </section>\n\n' +
    '  <div class="wrap">\n    <article class="guide-body">\n' + renderBody(parseBody(g.body)) + '\n    </article>\n  </div>\n\n' +
    '  <section class="more-guides">\n    <div class="wrap">\n      <h2>More guides</h2>\n      <ul class="res-list">\n' + related.map(row).join('') + '      </ul>\n      <p style="margin-top: 40px;"><a class="text-link" href="/guides">All guides <span class="arr">→</span></a></p>\n    </div>\n  </section>\n\n' +
    '  <section class="band">\n    <div class="wrap">\n      <p class="eyebrow">Want something I haven\'t made yet?</p>\n      <h2 style="margin-bottom: 28px;">Tell me what you\'re stuck on.</h2>\n      <a class="btn" style="background:var(--band-accent); border-color:var(--band-accent); color:var(--ink);" href="/#contact">Ask me <span class="arr">→</span></a>\n    </div>\n  </section>\n</main>\n\n' + FOOT;
}

function indexPage(all) {
  const desc = 'Every guide Senna Filter has put together on Claude, AI, and vibe coding — plain English, no email required.';
  const chips = ['<button type="button" class="chip" data-cat="all" aria-pressed="true">All <span class="chip-n">' + all.length + '</span></button>'];
  CATS.forEach(function (c) {
    const n = all.filter(function (g) { return g.cats.indexOf(c[0]) > -1; }).length;
    if (n) chips.push('<button type="button" class="chip" data-cat="' + c[0] + '" aria-pressed="false">' + c[1] + ' <span class="chip-n">' + n + '</span></button>');
  });
  return head({ title: 'Guides — Senna Filter', desc: desc, url: ORIGIN + '/guides' }) +
    '<body data-theme="harbor" data-font="editorial">\n\n' + NAV + '\n<main id="top">\n\n  <section data-screen-label="Guides intro">\n    <div class="wrap">\n' +
    '      <div class="sec-head reveal">\n        <p class="eyebrow">Free guides</p>\n        <h1 style="margin-bottom: 20px;">Everything I\'ve put together, in one place.</h1>\n' +
    '        <p>Every guide I\'ve made on Claude, AI, and vibe coding — the stuff I actually point people to. Read it right here. No email required.</p>\n      </div>\n\n' +
    '      <div class="guide-search"><input id="guide-q" type="search" placeholder="Search guides" aria-label="Search guides" autocomplete="off" /></div>\n' +
    '      <div class="guide-filter" role="group" aria-label="Filter guides by topic">\n        ' + chips.join('\n        ') + '\n      </div>\n' +
    '      <p class="guide-count" id="guide-count" aria-live="polite">' + all.length + ' guides</p>\n\n' +
    '      <ul class="res-list guides-list">\n' + all.map(row).join('') + '      </ul>\n' +
    '      <p class="empty-note" id="guide-empty" hidden>Nothing matches that yet. Try another word, or ask me to write it.</p>\n\n' +
    '      <p class="reveal" style="margin-top: 40px;">\n        <a class="text-link" href="/#contact">Want something I haven\'t made yet? Ask <span class="arr">→</span></a>\n      </p>\n    </div>\n  </section>\n\n</main>\n\n' + FOOT;
}

/* ---------- run ---------- */
(function main() {
  if (!fs.existsSync(SRC)) { console.log('build-guides: no guides-src folder, skipping'); return; }
  const files = fs.readdirSync(SRC).filter(function (f) { return f.endsWith('.txt'); });
  const all = [];
  files.forEach(function (f) {
    try { all.push(parseFile(f)); } catch (e) { console.warn('build-guides: skipped ' + f + ' (' + e.message + ')'); }
  });
  if (!all.length) { console.log('build-guides: no valid guides, leaving guides.html as is'); return; }
  all.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title); });
  fs.mkdirSync(OUT, { recursive: true });
  all.forEach(function (g) { fs.writeFileSync(path.join(OUT, g.slug + '.html'), guidePage(g, all)); });
  fs.writeFileSync(path.join(ROOT, 'guides.html'), indexPage(all));
  console.log('build-guides: wrote guides.html and ' + all.length + ' guide pages');
})();
