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
  });

  it("never caches authenticated or programmatic API responses", async () => {
    const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
    expect(worker).toContain('request.headers.has("authorization")');
    expect(worker).toContain('"document", "style", "script", "image", "font", "manifest"');
    expect(worker).toContain("request.destination");
  });
});
