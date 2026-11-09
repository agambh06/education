# PWA production verification — issue #3

Issue: <https://github.com/agambh06/education/issues/3>

## Verification record

- Initial verification: 2026-10-11 (Asia/Jerusalem).
- Source under test: `2067ee3aba6c240b8172ae963dffd64f74ba084c`, with uncommitted
  verification changes on `codex/issue-3-pwa-production-verification`.
- Production origin: pending confirmation. GitHub listed successful deployments
  for both `education` and `education-8mju`; the latest Vercel deployment details
  redirected to login in the browser session used on 2026-10-11.
- The original worktree was missing on 2026-11-02. With user authorization, the
  worktree and previous uncommitted verification changes were restored from the
  conversation, followed by additional regression tests.
- No deployment, commit, push, or issue status change was performed.

| Acceptance criterion | Evidence / status |
| --- | --- |
| Install from deployed HTTPS URL | Pending: stable production origin and browser install test. |
| Valid Hebrew manifest, icons, standalone mode | Local generated output passes; deployed responses pending. |
| Production service worker registers | Pending: inspect browser registration and controller. HTTP availability alone does not prove registration. |
| Installed app opens standalone | Pending: launch the installed app on each tested platform. |
| Update prompt after a new deployment | Callback and generated-worker regression tests pass locally; two-deployment production test pending. |
| Chrome desktop/mobile | Pending: record actual browser/device versions and installation results. |
| iPhone/Safari Add to Home Screen | Pending: physical iPhone test, including standalone launch. |
| Platform-specific limitations documented | See below. |

Issue #3 remains open until production/device rows have actual evidence. Do not
replace pending entries with passes based on local build output or a simulated
mobile viewport.

## Automated checks

From `frontend/`:

```powershell
npm run build
npm run test:pwa
./node_modules/.bin/biome check package.json scripts
npm run verify:pwa:production -- https://your-production-domain
```

The first three commands validate the local build, regression tests, generated
worker/manifest, and formatting/linting. The last command must be run against the
confirmed HTTPS origin; copy its output and date into this record. It does not
install the app or execute the remote worker.

Initial local results on 2026-10-11:

- `npm run build`: passed, including `tsc -b` and production worker generation.
- `npm run test:pwa`: passed, 18 regression tests plus generated-output checks.
- `./node_modules/.bin/biome check package.json scripts`: passed, six files checked.
- `git diff --check`: passed.
- `verify:pwa:production`: not run against a confirmed production origin.

Vite reported a plugin-timing warning for PWA generation on 2026-10-11; it did not
fail that build.

Reverification on 2026-11-02 after restoring the worktree:

- `npm run build`: passed, including TypeScript and regenerated production PWA files.
- `npm --update-notifier=false run test:pwa`: passed, 29 regression tests plus all
  generated-output checks. The npm option disables its unrelated update notice.
- `./node_modules/.bin/biome check --write package.json scripts`: passed, six files.
- `git diff --check`: passed.
- Added 11 regression tests for missing/protected installation resources,
  malformed JSON, manifest MIME types, Apple metadata, empty workers, network
  failures, server errors, deep-link mismatches, healthy JSON APIs, failed update
  checks with retry, and rejected update activation.
- Existing build output in the primary checkout failed the waiting-worker check;
  that output predates the current source. Regenerated output in this restored
  worktree passes. No primary-checkout source files were changed.
- Production HTTP, browser installation, physical-device, and two-deployment update
  verification remain pending; these local results do not establish those passes.

## Browser/device checks

Record production origin, date, OS, browser version, device, and observed results
for each platform. Use the same stable origin throughout. Initial visits must be
online; do not test the development server.

### Chrome desktop

1. Open the production URL in a profile where the app is not already installed.
   In DevTools **Application > Manifest**, confirm `סקולי | ניהול בית ספר`, short
   name `סקולי`, `he`, `rtl`, `/` start/scope, `standalone`, and 192/512 PNG icons.
   Record installability errors, if any, and visually inspect the maskable icon.
2. Under **Service Workers**, confirm an activated `/sw.js` with scope `/`. Reload
   once and confirm a controller in the Console:

   ```js
   navigator.serviceWorker.controller?.scriptURL
   await navigator.serviceWorker.getRegistration('/')
   ```

3. Use Chrome's installation action. Launch the installed app, confirm the Hebrew
   name/icon and window without browser tabs/address bar. In that window check:

   ```js
   matchMedia('(display-mode: standalone)').matches
   ```

4. After an online visit and worker activation, reopen/reload offline and confirm
   that the cached shell and Hebrew offline notice appear. Restore connectivity.

### Chrome on Android

Repeat installation from the HTTPS URL on an actual Android device. Use Chrome's
install/Add to Home Screen action, launch from its icon, verify the name/icon and
standalone window, then reopen offline after activation. Desktop viewport emulation
can check layout but does not verify Android installation or launcher behavior.

### Safari on iPhone

Open the HTTPS URL in Safari, choose **Share > Add to Home Screen**, confirm the
Hebrew name and touch icon, and launch from the Home Screen. If Safari presents
**Open as Web App**, leave it enabled. Verify standalone launch and reopening
offline after an initial online visit. With Safari remote inspection, check
`navigator.standalone === true` or the standalone display-mode query.

### Update between deployments A and B

1. Keep deployment A open, controlled by its activated worker. Keep DevTools
   **Update on reload** and **Bypass for network** off. Leave a form unfinished.
2. Wait at least one minute after registration, then deploy a visible, approved
   change B to the **same origin**. Record both deployment identifiers. This
   procedure requires a deployment; the uncommitted branch alone cannot test it.
3. Return to the visible, online app. Confirm the Hebrew update notice appears
   without automatically reloading or losing the form. Dismiss it; the current
   worker should remain in control. On the next visible/online check the notice
   should return. Confirm its action is disabled while offline.
4. Save work in all windows, choose **עדכון וטעינה מחדש**, and confirm B appears
   and its new worker controls the page. Repeat on the installed desktop/Android
   app and iPhone Home Screen app. Record any platform differences.

## Platform and test limitations

- Chrome's install UI depends on browser state and installation eligibility. Use
  a profile where the app is not installed; absence of an automatic promotional
  banner alone is not proof of failure. Inspect actual Manifest errors and the
  browser's install action. See [Chrome's manifest requirements](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest).
- iPhone uses a Home Screen installation flow. On Safari 26/iOS 26 and later,
  **Open as Web App** can control whether the saved site launches as a web app;
  record its selection. See [WebKit's Safari 26 release notes](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
  and [Apple's iPhone instructions](https://support.apple.com/en-mide/guide/iphone/iphea86e5236/27/ios/27).
- Background or suspended apps cannot be expected to perform hourly JavaScript
  checks. Test on foreground return while online. Browser storage eviction can
  remove cached resources, so offline reopening requires a successful online load
  and retained caches; first-time offline installation is unsupported.
- Workbox uses a one-minute registration heuristic; rapid rebuilds can produce
  different update events. See [Vite PWA's periodic-update guide](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates).
- Closing every controlled tab/window may activate a waiting worker without the
  prompt. A prior `autoUpdate` worker may activate the first migration deployment
  automatically; test two deployments using the current prompt strategy.
- Deployment preview URLs on different origins cannot test updating an installed
  production app. An HTTP worker check cannot prove successful registration,
  activation, cached navigation, or user-approved update behavior.
- Offline support covers the cached shell/static assets. API data, writes,
  synchronization, and external fonts remain outside the current offline support.
