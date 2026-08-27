import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("PWA structure", () => {
  it("uses relative URLs so GitHub Pages and a future custom domain both work", async () => {
    const manifest = JSON.parse(
      await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8")
    ) as {
      start_url: string;
      scope: string;
      icons: Array<{ src: string }>;
      shortcuts: Array<{ url: string }>;
    };
    expect(manifest.start_url).toBe("./");
    expect(manifest.scope).toBe("./");
    expect(manifest.icons.every((icon) => !icon.src.startsWith("/"))).toBe(true);
    expect(manifest.shortcuts.every((shortcut) => !shortcut.url.startsWith("/"))).toBe(true);
    expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual([
      "schedule/",
      "rooms/",
      "visit/",
      "questions/"
    ]);
  });

  it("precaches only core event pages for weak venue connectivity", async () => {
    const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

    expect(worker).toContain('const CACHE_PREFIX = "nextbridge-event-support-"');
    expect(worker).toContain('const CACHE_VERSION = "v4"');
    for (const route of ['""', '"schedule/"', '"rooms/"', '"visit/"']) {
      expect(worker).toContain(route);
    }
    expect(worker).toContain("cache.addAll(CORE_PAGES)");
    expect(worker).toContain('["questions/", "admin/"]');
    expect(worker).toContain("isOnlineOnly(url)");
    expect(worker).toContain("offlineNavigationResponse()");
    expect(worker).toContain('"Cache-Control": "no-store"');
  });

  it("deletes only stale Nextbridge caches on the shared GitHub Pages origin", async () => {
    const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

    expect(worker).toContain("key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME");
    expect(worker).not.toContain("keys.filter((key) => key !== CACHE_NAME)");
  });

  it("waits for successful same-origin cache writes", async () => {
    const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

    expect(worker).toContain('response.ok && response.type === "basic"');
    expect(worker).toContain("await cache.put(request, response.clone())");
    expect(worker).toContain("event.waitUntil(network.then(() => undefined))");
  });

  it("never caches authenticated or programmatic API responses", async () => {
    const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
    expect(worker).toContain('request.headers.has("authorization")');
    expect(worker).toContain('"document", "style", "script", "image", "font", "manifest"');
    expect(worker).toContain("request.destination");
  });
});
