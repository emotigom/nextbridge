const CACHE_PREFIX = "nextbridge-event-support-";
const CACHE_VERSION = "v3";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const APP_ROOT = new URL("./", self.location.href).href;
const CORE_PAGES = ["", "schedule/", "rooms/", "visit/"].map(
  (path) => new URL(path, APP_ROOT).href
);
const ONLINE_ONLY_PATHS = ["questions/", "admin/"].map(
  (path) => new URL(path, APP_ROOT).pathname
);

function isOnlineOnly(url) {
  return ONLINE_ONLY_PATHS.some((path) => url.pathname.startsWith(path));
}

async function cacheSuccessfulResponse(request, response) {
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_PAGES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.headers.has("authorization")) return;
  if (
    !new Set(["document", "style", "script", "image", "font", "manifest"]).has(
      request.destination
    )
  )
    return;

  if (request.mode === "navigate") {
    if (isOnlineOnly(url)) {
      event.respondWith(fetch(request));
      return;
    }

    event.respondWith(
      (async () => {
        try {
          return await cacheSuccessfulResponse(request, await fetch(request));
        } catch {
          return (await caches.match(request)) ?? (await caches.match(APP_ROOT));
        }
      })()
    );
    return;
  }

  const cached = caches.match(request);
  const network = fetch(request)
    .then((response) => cacheSuccessfulResponse(request, response))
    .catch(() => null);
  event.waitUntil(network.then(() => undefined));
  event.respondWith(
    (async () => (await cached) ?? (await network) ?? Response.error())()
  );
});
