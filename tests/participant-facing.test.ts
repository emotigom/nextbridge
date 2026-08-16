import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const heroUrl = new URL("../src/components/EventHero.astro", import.meta.url);
const visitDetailsUrl = new URL("../src/components/VisitDetails.astro", import.meta.url);
const stylesheetUrl = new URL("../src/styles/global.css", import.meta.url);

describe("participant-facing event presentation", () => {
  it("keeps the requested title hierarchy without emphasizing the workshop label", async () => {
    const hero = await readFile(heroUrl, "utf8");
    const primary = hero.indexOf("event-title-primary");
    const secondary = hero.indexOf("event-title-secondary");
    const tertiary = hero.indexOf("event-title-tertiary");

    expect(hero).toContain('class="event-title-primary">경기 성취평가</span>');
    expect(hero).toContain('class="event-title-secondary">표준화 평가도구 개발</span>');
    expect(hero).toContain('class="event-title-tertiary">합숙 워크숍</span>');
    expect(primary).toBeLessThan(secondary);
    expect(secondary).toBeLessThan(tertiary);
    expect(hero).not.toContain("today-card");
    expect(hero).not.toContain("hero-lead");
    expect(hero).not.toContain("organizer-band");
  });

  it("shows the venue map and current-location routes for both travel modes", async () => {
    const visitDetails = await readFile(visitDetailsUrl, "utf8");

    expect(visitDetails).toContain('class="visit-map-card"');
    expect(visitDetails).toContain("https://staticmap.kakao.com/map/mapservice");
    expect(visitDetails).toContain("https://map.kakao.com/link/map/");
    expect(visitDetails).toContain("tmap://route?goalname=");
    expect(visitDetails).toContain("nmap://route/public");
    expect(visitDetails).toContain("TMAP 자동차");
    expect(visitDetails).toContain("네이버지도 대중교통");
    expect(visitDetails).toContain("data-route-fallback");
    expect(visitDetails).toContain("https://map.naver.com/p/search/");
    expect(visitDetails).toContain("https://map.kakao.com/link/to/");
    expect(visitDetails).not.toContain("https://www.google.com/maps");
  });

  it("uses the supplied teal, blue, and mint palette without decorative artwork", async () => {
    const css = await readFile(stylesheetUrl, "utf8");

    expect(css).toContain("--color-purple: #0b817a;");
    expect(css).toContain("--color-blue: #0c4b96;");
    expect(css).toContain("--color-mint: #bde5dd;");
    expect(css).toContain("--color-mint-strong: #86ccbd;");
    expect(css).not.toContain(".ambient-orb");
  });

  it("removes internal setup and implementation-report language from public copy", async () => {
    const publicFiles = await Promise.all(
      [
        "../src/pages/index.astro",
        "../src/components/QuestionForm.astro",
        "../src/components/QuestionStatus.astro",
        "../src/content/events/2026-sk.ts"
      ].map((path) => readFile(new URL(path, import.meta.url), "utf8"))
    );
    const publicCopy = publicFiles.join("\n");

    for (const internalPhrase of [
      "JavaScript가 꺼져 있어도",
      "Supabase·Turnstile",
      "안전한 Turnstile",
      "최종 점검 중",
      "행사 안내 페이지를 준비하고 있습니다"
    ]) {
      expect(publicCopy).not.toContain(internalPhrase);
    }
  });
});
