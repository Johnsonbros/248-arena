// 248 Arena — deployment configuration
// -----------------------------------------------------------------------------
// The ONE place the app learns where it lives. Loaded before every other script.
//
// Why this exists: the API hostnames used to be hardcoded to
// arena-api.thejohnsonbros.com. Move the site to a new domain and the app keeps
// asking the OLD host for access — the gate fails closed and nobody can sign in,
// with nothing in the UI explaining why. A domain move should be a DNS change,
// not a code change.
//
// Default behavior: derive the API hosts from wherever the page is served.
//   arena.example.com        → arena-api.example.com / arena-ai.example.com
//   248arena.com             → arena-api.248arena.com / arena-ai.248arena.com
//
// That convention means moving domains needs zero edits here — just point the
// three DNS records at the tunnel. Override below only if your API lives
// somewhere the convention can't guess.

const ARENA_ENV = (() => {
  const host = location.hostname;

  // Local development: no API, everything runs offline against localStorage.
  const isLocal = !host || host === 'localhost' || host === '127.0.0.1' ||
                  host.endsWith('.local') || location.protocol === 'file:';

  // Strip the leading label ("arena.foo.com" → "foo.com") so the API siblings
  // sit next to the site rather than under it. A bare apex ("248arena.com")
  // is left alone and the API becomes a subdomain of it.
  const parts = host.split('.');
  const base = parts.length > 2 ? parts.slice(1).join('.') : host;

  return {
    isLocal,
    // --- OVERRIDES ---------------------------------------------------------
    // Set these to absolute URLs only if the convention above doesn't fit.
    // Empty string = feature disabled. null = use the derived default.
    apiBase: null,        // e.g. 'https://api.mydomain.com'
    examinerBase: null,   // e.g. 'https://ai.mydomain.com'  ('' disables the AI tutor)

    derived: {
      apiBase: isLocal ? '' : `https://arena-api.${base}`,
      examinerBase: isLocal ? '' : `https://arena-ai.${base}`
    },

    // Canonical origin, for share links and SEO tags.
    siteOrigin: isLocal ? '' : location.origin
  };
})();

ARENA_ENV.resolvedApiBase =
  ARENA_ENV.apiBase !== null ? ARENA_ENV.apiBase : ARENA_ENV.derived.apiBase;
ARENA_ENV.resolvedExaminerBase =
  ARENA_ENV.examinerBase !== null ? ARENA_ENV.examinerBase : ARENA_ENV.derived.examinerBase;

window.ARENA_ENV = ARENA_ENV;
