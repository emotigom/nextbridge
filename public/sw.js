const CACHE_PREFIX = "nextbridge-event-support-";
const CACHE_VERSION = "v4";
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

function offlineNavigationResponse() {
  return new Response(
    `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>인터넷 연결 확인</title><body style="margin:0;padding:40px 24px;font-family:system-ui,sans-serif;color:#073d3a;background:#f5fbfa"><main style="max-width:560px;margin:auto"><h1>인터넷 연결을 확인해 주세요.</h1><p>질문 접수, 답변 확인, 운영진 화면은 온라인에서만 이용할 수 있습니다.</p><p><a href="${APP_ROOT}" style="color:#0c4b96;font-weight:700">저장된 행사 안내 보기</a></p></main></body></html>`,
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
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
      event.respondWith(fetch(request).catch(() => offlineNavigationResponse()));
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
