# סקולי frontend

React, TypeScript, Mantine, and Vite. Run all commands below from `frontend/`.

## Production PWA

`vite-plugin-pwa` generates `dist/manifest.webmanifest`, `dist/sw.js`, and the
Workbox runtime. The manifest and icons are configured in `vite.config.ts`; do
not create a second manifest or handwritten service worker in `public/`.

The worker precaches the built application shell and local static assets. After
one successful online load and worker activation, the shell can open offline.
`PwaStatus` shows a Hebrew connection notice. Backend data, writes, external
Google Fonts, and offline synchronization are not cached or supported. System
fonts remain available offline. Connectivity detection uses the browser's online
signal; it does not guarantee that the backend is reachable.

API requests have no runtime caching strategy. Navigation under `/api`, including
`/api?query=value`, and file-like URLs bypass the SPA fallback. An offline API
request fails normally instead of returning cached HTML.

Updates download in the background. The app checks on registration, when returning
to a visible tab, when connectivity returns, and hourly while visible and online.
A Hebrew notice lets users finish/save forms in all windows before applying an update and
reloading. Dismissing it leaves the current worker in control and offers the waiting
update again on the next visible, online check. Closing all app
windows also lets a waiting update activate. The helper's existing `workbox-window`
dependency is declared directly for the React registration module.

## Local production testing

```powershell
npm ci
npm run build
npm run verify:pwa
npm run test:pwa
npm run preview -- --host localhost --port 4173 --strictPort
```

Open `http://localhost:4173` in Chrome or Edge. Localhost is a secure-context
exception, so HTTPS is not needed there. Do not use `npm run dev` for install or
offline testing: the service worker is intentionally disabled during development.
Plain HTTP on a LAN IP is not equivalent to localhost; use HTTPS for device tests.

`verify:pwa` checks the generated manifest/icon dimensions, precached assets,
waiting-worker activation, API exclusions, and the Vercel routing patterns without
adding a test framework. Run it after a successful build.

In Chrome DevTools:

1. Open **Application > Manifest**. Verify the Hebrew name, `he`, `rtl`, start URL
   `/`, scope `/`, standalone display, and 192/512 icons. Inspect the maskable icon
   with **Show only the minimum safe area** and check for manifest errors.
2. Open **Application > Service Workers**. Confirm `sw.js` is activated with scope
   `/`. Reload once if needed so the page is controlled. Keep **Bypass for network**
   off, and leave **Update on reload** off when testing the normal update UX.
3. Open **Application > Cache Storage**. Inspect the Workbox precache: local HTML,
   JavaScript, CSS, and icons should be present; API responses should not be.
4. Select **Network > Offline**, reload normally, and visit a path such as
   `/assignments`. The cached shell and Hebrew offline notice should appear. The
   current app's screen navigation is state based; this path serves the shell,
   rather than selecting a particular screen. Request `/api` and `/api/health`:
   neither should receive the app HTML. Restore **Online** and check that the notice
   disappears.
5. Use the browser's install action, launch the installed app, and confirm it opens
   without browser tabs/address bar. In its DevTools Console,
   `matchMedia('(display-mode: standalone)').matches` should be `true`.

For a local update test, keep version A open, change visible content, wait at least
one minute after initial registration (Workbox's update heuristic), build version B,
then switch away and back to the app tab. Finish any form, then apply the Hebrew
update notice. The app should reload into B. Restore test-only changes afterward.
Closing every app tab/window can activate a waiting worker without showing a prompt.

## Vercel deployment and verification

Configure the Vercel project with:

- **Root Directory:** `frontend`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- Install development dependencies during the build (including the PWA plugin).

`frontend/vercel.json` rewrites frontend navigation to `index.html`, excluding
`/api`, `/api/...`, and file-like paths. Existing static files are served directly.
`sw.js` must revalidate rather than remain in a stale HTTP cache. This configuration
does not deploy the Express backend or proxy its API; configure the real backend
and `VITE_API_URL` separately when integrating it.

After deploying:

1. Open the stable HTTPS production domain. Confirm `/manifest.webmanifest`,
   `/sw.js`, and each manifest icon return their actual files, not HTML. Check
   `sw.js` response headers for `Cache-Control: public, max-age=0, must-revalidate`
   and the manifest for `Content-Type: application/manifest+json`.
2. Open `/assignments` directly and reload: the SPA shell should load. Verify `/api`
   and `/api/health` do not return the SPA; a 404 is expected until a backend exists.
3. Repeat the Manifest, Service Workers, Cache Storage, offline, and installation
   checks above. First-time visits without any connection cannot work.
4. On iPhone, open the HTTPS domain in Safari, choose **Share > Add to Home Screen**,
   then launch סקולי. Check its name, touch icon, standalone window, and offline
   reopening after an initial online visit.
5. Keep the old app open and deploy a visible change to the **same production
   domain**. Wait at least one minute after initial registration, switch away/back
   (or wait for the hourly check), and verify that it offers an update without
   reloading an unfinished form. Apply it after saving. Preview URLs on different
   origins do not test updates to the installed production app.

If an older `autoUpdate` worker is already installed, it may activate the first
deployment automatically during the transition to this prompt strategy. Test the
steady-state update flow between two deployments of the new strategy. For a clean
installation test, use a fresh browser profile or clear this origin's site data.
