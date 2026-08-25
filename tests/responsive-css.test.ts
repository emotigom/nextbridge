import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const stylesheetUrl = new URL("../src/styles/global.css", import.meta.url);
const questionFormUrl = new URL("../src/components/QuestionForm.astro", import.meta.url);

describe("mobile-first layout safeguards", () => {
  it("supports a 360px viewport without imposing a wider document minimum", async () => {
    const css = await readFile(stylesheetUrl, "utf8");
    expect(css).toMatch(/body\s*\{[\s\S]*?min-width:\s*320px/);
    expect(css).toContain("width: min(calc(100% - 28px), var(--content-width));");
    expect(css).toMatch(/img\s*\{[\s\S]*?max-width:\s*100%/);
    expect(css).toContain("-webkit-text-size-adjust: 100%;");
    expect(css).toContain("text-size-adjust: 100%;");
  });

  it("reserves stable form geometry before the security widget renders", async () => {
    const [css, questionForm] = await Promise.all([
      readFile(stylesheetUrl, "utf8"),
      readFile(questionFormUrl, "utf8")
    ]);

    expect(css).toMatch(/\.field textarea\s*\{[\s\S]*?height:\s*205px/);
    expect(css).toMatch(
      /\.captcha-area \.cf-turnstile\s*\{[\s\S]*?min-height:\s*65px/
    );
    expect(css).toMatch(
      /@media \(max-width: 420px\)[\s\S]*?min-width:\s*150px[\s\S]*?min-height:\s*140px/
    );
    expect(questionForm).toContain('data-size="flexible"');
    expect(questionForm).toContain('window.matchMedia("(max-width: 420px)")');
    expect(questionForm).toContain('questionTurnstile.dataset.size = "compact"');
  });

  it("collapses dense grids and exposes the mobile navigation", async () => {
    const css = await readFile(stylesheetUrl, "utf8");
    const mobile = css.split("@media (max-width: 640px)")[1]?.split("@media")[0] ?? "";
    expect(mobile).toContain(".quick-actions");
    expect(mobile).toContain(".timeline-row");
    expect(mobile).toContain(".room-grid");
    expect(mobile).toContain("grid-template-columns: 1fr;");
    expect(mobile).toContain(".bottom-nav");
    expect(mobile).toContain("grid-template-columns: repeat(5, 1fr);");
    expect(mobile).toContain("min-width: 0;");
  });

  it("honors reduced-motion preferences", async () => {
    const css = await readFile(stylesheetUrl, "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
