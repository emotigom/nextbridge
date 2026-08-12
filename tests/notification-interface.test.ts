import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const notificationUrl = new URL("../supabase/functions/_shared/notifications.ts", import.meta.url);

describe("replaceable notification boundary", () => {
  it("supports all requested operator channels behind server-only configuration", async () => {
    const source = await readFile(notificationUrl, "utf8");
    for (const provider of ["email", "slack", "discord", "kakao_alimtalk"]) {
      expect(source).toContain(`channel === "${provider}"`);
    }
  });

  it("keeps raw question text and participant contacts out of operator notifications", async () => {
    const source = await readFile(notificationUrl, "utf8");
    const operatorContract =
      source.split("interface OperatorNotification {")[1]?.split("}")[0] ?? "";
    expect(operatorContract).not.toContain("questionText");
    expect(operatorContract).not.toContain("contactMethod");
    expect(operatorContract).not.toContain("contactValue");
  });

  it("stores provider recipients in the Edge Function environment contract", async () => {
    const example = await readFile(
      new URL("../supabase/functions/.env.example", import.meta.url),
      "utf8"
    );
    expect(example).toContain("KAKAO_OPERATOR_RECIPIENTS_JSON=[]");
    expect(example).toContain("EMAIL_OPERATOR_RECIPIENTS_JSON=[]");
  });
});
