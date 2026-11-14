# policies

Общие правила — в `../CLAUDE.md`. Как устроен сайт и как добавить игру — [README.md](README.md),
версии документов — [VERSIONS.md](VERSIONS.md) (`versions.json`, `scripts/build-versions.mjs`),
`app-ads.txt` и AdMob — [ADMOB_DEPLOYMENT.md](ADMOB_DEPLOYMENT.md).

- Пуш в `main` сразу публикует сайт на Vercel: пушить только по прямой просьбе.
- Документы игры живут в своей папке (`towerblocks/`, `flappyplane/`, `twirl/`, `numbermatch/` и т. д.);
  правка одной игры не трогает другие, существующие URL не ломать.
- Описывай только реальные практики игры: SDK, рекламу, аналитику — сверяйся с `package.json` и кодом игры.
