// Builds per-version, per-language pages from the multilingual documents listed in versions.json:
//   /<game>/<version>/<lang>/          privacy policy
//   /<game>/<version>/<lang>/support/  support
//   /<game>/<version>/                 language list
// A version is a snapshot: existing <game>/<version>/ folders are left untouched unless --force is given,
// so later edits of <game>/privacy.html never change a URL already entered in a store console.
//   node scripts/build-versions.mjs [--force] [game[/version] ...]
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter(a => !a.startsWith('--'));
const versions = JSON.parse(readFileSync(path.join(root, 'versions.json'), 'utf8'));

const LANG_NAMES = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', pt: 'Português (Brasil)',
  ru: 'Русский', tr: 'Türkçe', id: 'Bahasa Indonesia', zh: '中文',
};

function parse(file) {
  const html = readFileSync(path.join(root, file), 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const articles = new Map();
  for (const m of html.matchAll(/<article id="([\w-]+)"[^>]*>([\s\S]*?)<\/article>/g)) articles.set(m[1], m[2].trim());
  if (!articles.size) throw new Error(`${file}: no <article id="..."> blocks`);
  return { title, description, articles };
}

// "Twirl — Privacy Policy" + article <h1> "Политика конфиденциальности" → "Twirl — Политика конфиденциальности"
function localTitle(doc, body) {
  const h1 = body.match(/<h1>([^<]*)<\/h1>/)?.[1];
  const game = doc.title.split(' — ')[0];
  if (!h1 || game === doc.title) return doc.title;
  return h1.includes(game) ? h1 : `${game} — ${h1}`;
}

// Source pages link each other as privacy.html / support.html; point those at this version's pages.
// A privacy source that is not itself privacy.html (e.g. privacy-ads.html) links privacy.html as the older policy.
const fixLinks = (body, base, lang, privacyHref = `${base}/${lang}/`) => body
  .replace(/href="privacy\.html(#[\w-]+)?"/g, (_, anchor = '') => `href="${privacyHref}${anchor}"`)
  .replace(/href="support\.html"/g, `href="${base}/${lang}/support/"`);

// Absolute links: the pages work with or without a trailing slash (Vercel serves /a/b and /a/b/ alike).
function page({ lang, title, description, nav, body }) {
  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${description ? `<meta name="description" content="${description}">` : ''}<title>${title}</title><link rel="stylesheet" href="/legal.css"></head>
<body><main>
<nav aria-label="Languages">${nav}</nav>
<article lang="${lang}">
${body}
</article>
</main></body>
</html>
`;
}

function build(game, version, docs) {
  const dir = path.join(root, game, version);
  if (existsSync(dir)) {
    if (!force) { console.log(`skip ${game}/${version} (exists; --force to rebuild)`); return; }
    rmSync(dir, { recursive: true });
  }
  const privacy = parse(docs.privacy);
  const support = docs.support ? parse(docs.support) : null;
  const base = `/${game}/${version}`;
  const langs = [...privacy.articles.keys()];
  const home = existsSync(path.join(root, game, 'index.html')) ? `<a href="/${game}/">← Game documents</a>` : '<a href="/">← All games</a>';
  const langNav = suffix => [home,
    ...langs.map(l => `<a href="${base}/${l}/${suffix}" lang="${l}">${LANG_NAMES[l] ?? l}</a>`)].join('');

  for (const lang of langs) {
    const out = path.join(dir, lang);
    mkdirSync(out, { recursive: true });
    const olderPolicy = path.basename(docs.privacy) === 'privacy.html' ? undefined : `/${game}/privacy.html`;
    const body = fixLinks(privacy.articles.get(lang), base, lang, olderPolicy);
    writeFileSync(path.join(out, 'index.html'), page({
      lang, title: localTitle(privacy, body), description: privacy.description, nav: langNav(''), body,
    }));
    if (!support) continue;
    // Support pages exist in fewer languages; fall back to English rather than a 404.
    const supLang = support.articles.has(lang) ? lang : 'en';
    const supBody = fixLinks(support.articles.get(supLang) ?? support.articles.values().next().value, base, lang);
    mkdirSync(path.join(out, 'support'), { recursive: true });
    writeFileSync(path.join(out, 'support', 'index.html'), page({
      lang: supLang, title: localTitle(support, supBody), description: support.description, nav: langNav('support/'),
      body: supBody,
    }));
  }

  const list = langs.map(l => `<p><a href="${base}/${l}/" lang="${l}">${LANG_NAMES[l] ?? l}</a>${support ? ` · <a href="${base}/${l}/support/" lang="${l}">Support</a>` : ''}</p>`).join('\n');
  writeFileSync(path.join(dir, 'index.html'), page({
    lang: 'en', title: `${privacy.title} — ${version}`, description: privacy.description,
    nav: home,
    body: `<h1>${privacy.title}</h1>\n<p>Version ${version}</p>\n<section>\n${list}\n</section>`,
  }));
  console.log(`built ${game}/${version}: ${langs.join(', ')}`);
}

for (const [game, byVersion] of Object.entries(versions)) {
  for (const [version, docs] of Object.entries(byVersion)) {
    if (only.length && !only.includes(game) && !only.includes(`${game}/${version}`)) continue;
    build(game, version, docs);
  }
}
