// 248 Arena — Service Worker
// -----------------------------------------------------------------------------
// The entire study engine — question bank, SRS scheduler, drills, readiness,
// plan, locker — is client-side JavaScript. The only things that need a network
// are billing, cloud sync, the leaderboard, and The Examiner. Which means the
// app can and should work in exactly the place a plumbing apprentice actually
// studies: a basement, a crawlspace, a job site with one bar of signal.
//
// Strategy:
//   - Same-origin GET  → stale-while-revalidate. Serve from cache immediately,
//     refresh the cache in the background. Fast always, fresh next visit.
//   - Cross-origin     → untouched. The API services (arena-api / arena-ai) and
//     Stripe live on other origins and must never be cached or intercepted.
//   - Navigations      → same, with an offline fallback to the cached app shell
//     so a cold URL bar in a dead zone still opens the Arena.
//
// VERSION is the cache-buster: bump it in any commit that changes shipped
// assets, and the old cache is deleted on the next activate.

const VERSION = 'arena-v4'; // v4: SEO meta, analytics, 404
const CACHE = `248arena-${VERSION}`;

// The shell: everything needed to study with zero connectivity.
const PRECACHE = [
  'app.html',
  'codebook.html',
  'help.html',
  'index.html',
  '404.html',
  'css/styles.css',
  'js/questions.js',
  'js/auth.js',
  'js/srs.js',
  'js/sync.js',
  'js/leaderboard.js',
  'js/drills.js',
  'js/game-modes.js',
  'js/readiness.js',
  'js/locker.js',
  'js/plan.js',
  'js/conquest.js',
  'js/pulse.js',
  'js/app.js',
  'js/config.js',
  'js/analytics.js',
  'js/subscription.js',
  'js/codebook.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll is atomic — one 404 fails the install and the old SW stays live,
      // which is the correct failure mode: never half-cache a release.
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never intercept other origins: arena-api, arena-ai, Stripe, fonts CDNs.
  // Their responses are dynamic, credentialed, or both.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: url.pathname.endsWith('.html') || url.pathname === '/' }).then((cached) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // offline: cached copy or nothing

      if (cached) return cached;               // stale-while-revalidate
      return refresh.then((res) => {
        if (res) return res;
        // Deep link while offline and uncached: hand back the app shell.
        if (req.mode === 'navigate') return caches.match('app.html');
        return Response.error();
      });
    })
  );
});
