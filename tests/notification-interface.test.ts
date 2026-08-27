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

  it("uses Resend directly from Edge Functions and never exposes its key to the browser", async () => {
    const source = await readFile(notificationUrl, "utf8");
    expect(source).toContain('fetchWithTimeout("https://api.resend.com/emails"');
    expect(source).toContain('optionalEnv("RESEND_API_KEY")');
    expect(source).not.toContain("EMAIL_NOTIFICATION_RELAY_URL");
    expect(source).toContain("const providerTimeoutMs = 10_000");
  });

  it("sends completion email only to a participant who selected email", async () => {
    const source = await readFile(notificationUrl, "utf8");
    expect(source).toContain('notification.contactMethod !== "email"');
    expect(source).toContain("질문과 답변 내용은 보안을 위해 이메일에 포함하지 않았습니다.");
  });

  it("normalizes common dashboard provider values before recording a delivery", async () => {
    const source = await readFile(notificationUrl, "utf8");
    expect(source).toContain('if (value === "resend") value = "email"');
    expect(source).toContain("hasMatchingQuotes");
    expect(source).toContain(
      'channel: "none", status: "failed", errorCode: "UNSUPPORTED_PROVIDER"'
    );
  });

  it("keeps the Resend HTTP status and fails loudly when delivery audit storage fails", async () => {
    const source = await readFile(notificationUrl, "utf8");
    expect(source).toContain("`HTTP_${response.status}`");
    expect(source).toContain("NOTIFICATION_DELIVERY_RECORD_FAILED");
  });

  it("records the participant delivery against the validated route question id", async () => {
    const source = await readFile(
      new URL("../supabase/functions/admin-questions/index.ts", import.meta.url),
      "utf8"
    );
    expect(source).toContain("questionId,");
    expect(source).toContain('.eq("delivery_status", "sent")');
    expect(source).toContain('notificationStatus = "already_sent"');
    expect(source).toContain("notificationErrorCode");
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
    expect(example).toContain("RESEND_API_KEY=");
    expect(example).toContain("RESEND_FROM_EMAIL=");
  });
});
