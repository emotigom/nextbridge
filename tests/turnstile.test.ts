import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const formUrl = new URL("../src/components/QuestionForm.astro", import.meta.url);
const verifierUrl = new URL("../supabase/functions/_shared/turnstile.ts", import.meta.url);

describe("Turnstile submission boundary", () => {
  it("refreshes expired tokens and resets a consumed token after a failed submission", async () => {
    const source = await readFile(formUrl, "utf8");
    expect(source).toContain('data-refresh-expired="auto"');
    expect(source).toContain('turnstile?.reset("#question-turnstile")');
  });

  it("validates tokens on the server with action and hostname checks", async () => {
    const source = await readFile(verifierUrl, "utf8");
    expect(source).toContain("/turnstile/v0/siteverify");
    expect(source).toContain('result.action !== "submit-question"');
    expect(source).toContain("allowedHostnames.includes(result.hostname)");
    expect(source).toContain('form.set("idempotency_key", idempotencyKey)');
  });
});
