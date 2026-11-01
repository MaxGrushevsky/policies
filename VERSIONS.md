# Versioned policy URLs

Besides the stable pages (`/<game>/privacy.html`, `/<game>/support.html`), every game
version listed in `versions.json` gets per-language pages:

| URL | Page |
| --- | --- |
| `/<game>/<version>/<lang>/` | Privacy policy of that version in one language, e.g. `/twirl/1.1/ru/` |
| `/<game>/<version>/<lang>/support/` | Support page (falls back to English when not translated) |
| `/<game>/<version>/` | Language list for that version |

Languages: `en ru de es fr pt tr id` for every game (plus `zh` where the source page has it) —
whatever `<article id>` blocks the source page has.

`sources/` holds translated source pages that the live pages don't have (support pages in all
8 languages, Gem Pop and the Tower Blocks 1.3 policy). They are inputs for the script only and are
kept apart so the upstream pages (synced hourly from tenvar/policies) stay untouched.

## Adding a version

1. Update `<game>/privacy.html` (and `support.html`) for the new release, as before.
2. Add the version to `versions.json`, pointing at the source pages.
3. Run `node scripts/build-versions.mjs` and commit the new `<game>/<version>/` folder.
4. Push to `main` — Vercel redeploys the static files; nothing is built on the server.

A version folder is a snapshot: the script skips folders that already exist, so editing
`<game>/privacy.html` later never changes a URL already given to a store. To rebuild one on
purpose: `node scripts/build-versions.mjs --force twirl/1.1`.

The generated pages use root-absolute links (`/legal.css`, `/twirl/1.1/en/`), so they are meant
for the Vercel site served from the domain root.
