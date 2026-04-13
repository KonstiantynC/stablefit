const CACHE_NAME = "stablefit-static-v1";

const PRECACHE_PATHS = [
  "script/main.js",
];

function cacheBaseUrl() {
  return new URL("./", self.location.href).href;
}

function shouldHandlePathname(pathname) {
  return pathname.includes("/script/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const base = cacheBaseUrl();
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_PATHS.map(async (rel) => {
          const url = new URL(rel, base).href;
          try {
            await cache.add(url);
          } catch {
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith("stablefit-static") && key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );

      // Ensure styles are never served from SW cache.
      const current = await caches.open(CACHE_NAME);
      const requests = await current.keys();
      await Promise.all(
        requests.map((req) => {
          const pathname = new URL(req.url).pathname;
          if (pathname.includes("/style/")) {
            return current.delete(req);
          }
          return Promise.resolve();
        })
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!shouldHandlePathname(url.pathname)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) {
        fetch(req)
          .then((response) => {
            if (response.ok) {
              return cache.put(req, response.clone());
            }
          })
          .catch(() => {});
        return cached;
      }

      const response = await fetch(req);
      if (response.ok) {
        cache.put(req, response.clone()).catch(() => {});
      }
      return response;
    })()
  );
});
