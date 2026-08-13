import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const adminConsoleUrl = new URL("../src/components/AdminConsole.astro", import.meta.url);

describe("operator authentication recovery boundary", () => {
  it("accepts invite and recovery sessions only in the public admin client", async () => {
    const source = await readFile(adminConsoleUrl, "utf8");
    expect(source).toContain("detectSessionInUrl: true");
    expect(source).toContain('["invite", "recovery"].includes(authFlowType)');
    expect(source).toContain("client.auth.updateUser({ password })");
    expect(source).toContain('window.history.replaceState(null, "", window.location.pathname)');
  });

  it("requests a same-origin password recovery URL without embedding an operator email", async () => {
    const source = await readFile(adminConsoleUrl, "utf8");
    expect(source).toContain("client.auth.resetPasswordForEmail(emailInput.value.trim()");
    expect(source).toContain("new URL(window.location.pathname, window.location.origin)");
    expect(source).not.toContain("captsk@naver.com");
  });
});
