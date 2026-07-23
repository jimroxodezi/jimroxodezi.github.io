#!/usr/bin/env node
/*
 * Pre-renders the blog to static HTML for SEO and link previews.
 *
 * Usage:  node tools/build.js     (run from anywhere, then commit)
 *
 * The frontmatter of each posts/*.md is the single source of truth:
 *   title:    required
 *   date:     (or `published:`) YYYY-MM-DD — used for ordering and display
 *   excerpt:  one-liner for the blog list + meta description
 *             (falls back to the post's first paragraph)
 *   draft: true  — skip entirely: no page, no listing, no sitemap.
 *             Drafts stay reachable via post.html?slug=<slug> (client render).
 *
 * What it does:
 *   1. Converts each non-draft posts/<slug>.md to posts/<slug>.html — a full
 *      page with per-post title, description, canonical URL, OG/Twitter tags.
 *   2. Regenerates posts/posts.json (a derived index — do not edit by hand).
 *   3. Rewrites the post list in blog.html (between POSTS:START / POSTS:END).
 *   4. Writes sitemap.xml.
 *   5. Deletes orphaned posts/*.html (removed or re-drafted posts).
 *
 * No dependencies beyond node and the vendored tools/vendor/marked.min.js.
 */
const fs = require('fs');
const path = require('path');
const { marked } = require(path.join(__dirname, 'vendor', 'marked.min.js'));

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const SITE = 'https://jimroxodezi.github.io';

/* ---------- helpers ---------- */

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Same frontmatter format post.html parses: --- key: value --- block.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const data = {};
  match[1].split('\n').forEach(line => {
    const i = line.indexOf(':');
    if (i === -1) return;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  return { data, content: match[2] };
}

function formatDate(d, style) {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date)) return '';
  return date.toLocaleDateString('en-US', { month: style, day: 'numeric', year: 'numeric' });
}

function readingTime(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Fallback excerpt: first real paragraph, markdown stripped, ~160 chars.
function autoExcerpt(content) {
  const block = content.split(/\n\s*\n/).map(b => b.trim())
    .find(b => b && !/^(#|```|>|[-*]\s|\d+\.\s|!\[|<)/.test(b));
  if (!block) return '';
  const plain = block
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // links -> text
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= 160) return plain;
  return plain.slice(0, 160).replace(/\s+\S*$/, '') + '…';
}

/* ---------- post page template ---------- */

function postPage({ slug, title, description, dateISO, dateHuman, minutes, bodyHtml }) {
  const url = `${SITE}/posts/${slug}.html`;
  const meta = dateHuman ? `${dateHuman} · ${minutes} min read` : `${minutes} min read`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} — Jimrox</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Jimrox">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/images/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Jimrox — distributed systems, infrastructure, and developer tools, over an oscilloscope trace with an anomaly spike">
${dateISO ? `<meta property="article:published_time" content="${dateISO}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/images/og.png">
<link rel="icon" href="../images/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" href="../images/favicon-32.png" sizes="32x32">
<link rel="icon" type="image/png" href="../images/favicon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="../images/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
<script src="../theme.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
</head>
<body>

<button id="theme-toggle" class="theme-toggle" type="button" aria-label="Switch to light mode">light</button>

<nav class="sitemap">
  <div class="wrap">
    <a href="../index.html">Jimrox</a>
    <a href="../index.html#about">About</a>
    <a href="../index.html#projects">Projects</a>
    <a href="../blog.html">Writing</a>
  </div>
</nav>

<div class="wrap">
  <div class="page-header">
    <a class="back-link" href="../blog.html">&larr; All posts</a>
    <h1>${esc(title)}</h1>
    <p class="post-meta">${esc(meta)}</p>
  </div>
  <div class="post-body">
${bodyHtml}
  </div>
</div>

<footer></footer>

<script>
  document.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
</script>

</body>
</html>
`;
}

/* ---------- collect posts from frontmatter ---------- */

const posts = [];
const drafts = [];
for (const file of fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).sort()) {
  const slug = file.replace(/\.md$/, '');
  const { data, content } = parseFrontmatter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
  if (String(data.draft).toLowerCase() === 'true') { drafts.push(slug); continue; }
  const dateISO = data.date || data.published || '';
  if (!data.title) console.warn(`warn: posts/${file} has no title: in frontmatter`);
  if (!dateISO) console.warn(`warn: posts/${file} has no date:/published: — it will sort last`);
  if (!data.excerpt) console.warn(`warn: posts/${file} has no excerpt: — using first paragraph`);
  posts.push({
    slug,
    title: data.title || slug,
    date: dateISO,
    excerpt: data.excerpt || autoExcerpt(content),
    content,
  });
}
posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

/* ---------- build pages ---------- */

for (const p of posts) {
  const html = postPage({
    slug: p.slug,
    title: p.title,
    description: p.excerpt || `${p.title} — notes by Jimrox.`,
    dateISO: p.date,
    dateHuman: formatDate(p.date, 'long'),
    minutes: readingTime(p.content),
    bodyHtml: marked.parse(p.content),
  });
  fs.writeFileSync(path.join(POSTS_DIR, `${p.slug}.html`), html);
  console.log(`built: posts/${p.slug}.html`);
}
for (const d of drafts) console.log(`draft (skipped): posts/${d}.md`);

/* ---------- orphan cleanup ----------
   Any posts/*.html we didn't just build belongs to a removed or
   re-drafted post — delete it so it doesn't linger on the live site. */
const keep = new Set(posts.map(p => `${p.slug}.html`));
for (const f of fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.html'))) {
  if (!keep.has(f)) {
    fs.unlinkSync(path.join(POSTS_DIR, f));
    console.log(`removed orphan: posts/${f}`);
  }
}

/* ---------- derived index (do not edit by hand) ---------- */

fs.writeFileSync(path.join(POSTS_DIR, 'posts.json'),
  JSON.stringify(posts.map(({ slug, title, date, excerpt }) =>
    ({ slug, title, date, excerpt })), null, 2) + '\n');
console.log('updated: posts/posts.json (generated)');

/* ---------- blog.html list ---------- */

const blogPath = path.join(ROOT, 'blog.html');
let blog = fs.readFileSync(blogPath, 'utf8');
const listHtml = posts.map(p => `
    <div class="post-row">
      <time datetime="${p.date}">${formatDate(p.date, 'short')}</time>
      <div>
        <a class="title" href="posts/${p.slug}.html">${esc(p.title)}</a>
        <p>${esc(p.excerpt)}</p>
      </div>
    </div>`).join('\n');

const marker = /(<!-- POSTS:START -->)[\s\S]*?(<!-- POSTS:END -->)/;
if (!marker.test(blog)) {
  console.error('error: POSTS:START / POSTS:END markers missing in blog.html');
  process.exit(1);
}
blog = blog.replace(marker, `$1${listHtml}\n  $2`);
fs.writeFileSync(blogPath, blog);
console.log('updated: blog.html');

/* ---------- sitemap ---------- */

const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE}/`, lastmod: today },
  { loc: `${SITE}/blog.html`, lastmod: today },
  ...posts.map(p => ({ loc: `${SITE}/posts/${p.slug}.html`, lastmod: p.date || today })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('updated: sitemap.xml');
console.log(`done — ${posts.length} post(s), ${drafts.length} draft(s).`);
