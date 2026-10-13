# Tenvar Games — game policies and agreements

Public site: https://tenvar.github.io/

Keep each game's documents in its own stable directory. Documents for one game
must not replace documents for another game. Existing policy URLs remain valid.

| Game | Documents |
| --- | --- |
| Gem Pop | `/gempop/privacy.html` |
| Tower Blocks: World Builder | `/towerblocks/`, `/towerblocks/privacy.html` |
| Flappy Plane: Sky Hangar | `/flappyplane/`, `/flappyplane/privacy.html` |
| Twirl | `/twirl/`, `/twirl/privacy.html` |
| Lumen: Lights Out | `/lumen/`, `/lumen/privacy.html` |
| Burst Grid | `/burstgrid/`, `/burstgrid/privacy.html` |
| Number Match | `/numbermatch/`, `/numbermatch/privacy.html` |

To add a game:

1. Create `<game-slug>/index.html` as its document directory.
2. Add only the documents that actually apply to that game, for example
   `privacy.html` and, when needed, `terms.html`.
3. Link the game from the root `index.html`.
4. State the app name, developer, real contact address, effective date and actual
   data practices. Update each game separately when SDKs or features change.
5. Push to `main`; GitHub Pages serves the repository root. Verify the public
   document URL before entering it in a store console.

The site uses static HTML and CSS, with no custom analytics or advertising
trackers. `.nojekyll` retains direct static publishing. Preserve `app-ads.txt`:
it belongs to the shared developer site, not an individual game's privacy policy.
