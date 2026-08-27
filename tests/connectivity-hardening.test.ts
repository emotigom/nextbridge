import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const layoutUrl = new URL("../src/layouts/BaseLayout.astro", import.meta.url);
const apiClientUrl = new URL("../src/lib/api-client.ts", import.meta.url);
const corsUrl = new URL("../supabase/functions/_shared/cors.ts", import.meta.url);

describe("connectivity and response hardening", () => {
  it("restricts browser resource origins while allowing required live services", async () => {
    const layout = await readFile(layoutUrl, "utf8");

    expect(layout).toContain('http-equiv="Content-Security-Policy"');
    expect(layout).toContain('"object-src \'none\'"');
    expect(layout).toContain("https://challenges.cloudflare.com");
    expect(layout).toContain("https://staticmap.kakao.com");
    expect(layout).toContain('name="referrer" content="no-referrer"');
  });

  it("preconnects only live routes and reports offline state without exposing data", async () => {
    const layout = await readFile(layoutUrl, "utf8");

    expect(layout).toContain('currentPath.startsWith("/questions/")');
    expect(layout).toContain('currentPath.startsWith("/admin/")');
    expect(layout).toContain('Astro.url.pathname.endsWith("/questions/")');
    expect(layout).toContain('rel="preconnect"');
    expect(layout).toContain("data-network-status");
    expect(layout).toContain('window.addEventListener("offline", syncNetworkStatus)');
  });

  it("bounds browser API waits and disables credentialed cross-origin requests", async () => {
    const client = await readFile(apiClientUrl, "utf8");

    expect(client).toContain("new AbortController()");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain('credentials: "omit"');
    expect(client).toContain('referrerPolicy: "no-referrer"');
    expect(client).toContain("navigator.onLine");
  });

  it("adds defense-in-depth headers to every JSON response", async () => {
    const cors = await readFile(corsUrl, "utf8");

    for (const header of [
      "Content-Security-Policy",
      "Cross-Origin-Resource-Policy",
      "Permissions-Policy",
      "Referrer-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options"
    ]) {
      expect(cors).toContain(`"${header}"`);
    }
  });
});
