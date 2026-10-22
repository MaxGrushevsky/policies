# Tower Blocks advertising setup — 2026-10-18

## Prepared

- `towerblocks/privacy-ads.html`: English/Russian draft for the planned Android
  and iOS AdMob release. Existing `towerblocks/privacy.html` remains the accurate
  policy for releases without advertising. The draft is not yet effective.
- `app-ads.txt`: already contains
  `google.com, pub-2711489728430313, DIRECT, f08c47fec0942fa0`.
  The publisher number matches both new Tower Blocks AdMob apps.

## Hosting issue

Live checks on 2026-10-18:

- `https://tenvar.github.io/policies/app-ads.txt`: HTTP 200.
- `https://tenvar.github.io/app-ads.txt`: HTTP 404.

This repository is a GitHub Pages project site at `/policies/`. A root-domain
app-ads.txt must be hosted by the user-site repository `tenvar/tenvar.github.io`,
or by a developer domain under your control. Do not assume pushing this project's
existing file makes the root-domain URL work. Before changing a store's developer
website, verify its root app-ads.txt is publicly reachable and then check AdMob's
actual crawl and ownership-verification result.

## Publication sequence

1. Finalize the native AdMob SDK and UMP consent implementation. Verify the policy
   draft against actual platform configuration and any advertising partners.
   The documented target audience is 13+; configure applicable age/consent flags.
2. Set the policy effective date for the advertising release and remove the draft
   notice and noindex metadata. Publish it as a separate policy for that release;
   preserve the old policy URL for the existing version.
3. Serve app-ads.txt at the root of the developer domain. Verify HTTP 200 and the
   exact publisher entry from outside the hosting account.
4. Set the advertising policy URL in each Tower Blocks AdMob app, complete and
   publish the applicable privacy messages, and update the advertising release's
   in-app and store privacy links and disclosures.
5. Link actual public Android/iOS store listings and complete AdMob review and
   app-ads.txt verification. Test the release on physical Android/iOS devices
   using test ads before enabling production requests.

No push or deployment was performed by this preparation.

## Update — 2026-10-18 (later)

- `towerblocks/privacy-ads.html` finalized for version 1.3: effective October 18, 2026,
  draft notice and noindex removed, rewarded-only wording, no ATT request.
  Linked from `towerblocks/index.html`; `privacy.html` kept for older versions.
- Root-domain site prepared locally in `C:/other/projects/tenvar.github.io/`
  (`app-ads.txt`, redirect to `/policies/`). Publish it as `tenvar/tenvar.github.io`.
- Still not pushed.
