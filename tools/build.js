#!/usr/bin/env node
/*
 * Pre-renders the blog to static HTML for SEO and link previews.
 *
 * Usage:  node tools/build.js     (run from the repo root, then commit)
 *
 * What it does:
 *   1. For each post in posts/posts.json, converts posts/<slug>.md to
 *      posts/<slug>.html — a full page with per-post title, description,
 *      canonical URL, and Open Graph / Twitter tags.
 *   2. Rewrites the post list in blog.html (between the POSTS:START and
 *      POSTS:END markers) with static links to those pages.
 *   3. Writes sitemap.xml.
 *
 * No dependencies beyond node and the vendored tools/vendor/marked.min.js.
 */
const fs = require('fs');
const path = require('path');
const { marked } = require(path.join(__dirname, 'vendor', 'marked.min.js'));

const ROOT = path.join(__dirname, '..');
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

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date)) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function readingTime(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
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

/* ---------- build ---------- */

const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'posts', 'posts.json'), 'utf8'));
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

const built = [];
for (const p of posts) {
  const mdPath = path.join(ROOT, 'posts', `${p.slug}.md`);
  if (!fs.existsSync(mdPath)) {
    console.warn(`skip: posts/${p.slug}.md not found (listed in posts.json)`);
    continue;
  }
  const { data, content } = parseFrontmatter(fs.readFileSync(mdPath, 'utf8'));
  const title = data.title || p.title || p.slug;
  const dateISO = data.date || p.date || '';
  const html = postPage({
    slug: p.slug,
    title,
    description: p.excerpt || `${title} — notes by Jimrox.`,
    dateISO,
    dateHuman: formatDate(dateISO),
    minutes: readingTime(content),
    bodyHtml: marked.parse(content),
  });
  fs.writeFileSync(path.join(ROOT, 'posts', `${p.slug}.html`), html);
  built.push(p.slug);
  console.log(`built: posts/${p.slug}.html`);
}

/* rewrite the static list in blog.html between the markers */
const blogPath = path.join(ROOT, 'blog.html');
let blog = fs.readFileSync(blogPath, 'utf8');
const listHtml = posts.filter(p => built.includes(p.slug)).map(p => `
    <div class="post-row">
      <time datetime="${p.date}">${new Date(p.date + 'T00:00:00')
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
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

/* sitemap */
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE}/`, lastmod: today },
  { loc: `${SITE}/blog.html`, lastmod: today },
  ...posts.filter(p => built.includes(p.slug))
    .map(p => ({ loc: `${SITE}/posts/${p.slug}.html`, lastmod: p.date })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('updated: sitemap.xml');
console.log(`done — ${built.length} post(s).`);
