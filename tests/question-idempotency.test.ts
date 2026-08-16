import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { questionIdempotencyMaterial } from "../supabase/functions/_shared/crypto";

describe("question submission idempotency", () => {
  it("derives stable private material from one event-scoped retry key", async () => {
    const key = "8f4eab23-87ab-4dd2-9f56-6b1d83b2ec4a";
    const first = await questionIdempotencyMaterial("2026-sk", key);
    const retry = await questionIdempotencyMaterial("2026-sk", key.toUpperCase());
    const anotherEvent = await questionIdempotencyMaterial("future-event", key);

    expect(first).toEqual(retry);
    expect(first.keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.privateToken).toMatch(/^[0-9a-f]{64}$/);
    expect(anotherEvent.privateToken).not.toBe(first.privateToken);
  });

  it("rejects malformed retry keys before database access", async () => {
    await expect(questionIdempotencyMaterial("2026-sk", "not-a-uuid")).rejects.toThrow(
      "INVALID_IDEMPOTENCY_KEY"
    );
  });

  it("keeps one retry key in the browser and writes through the transactional RPC", async () => {
    const [form, endpoint] = await Promise.all([
      readFile(new URL("../src/components/QuestionForm.astro", import.meta.url), "utf8"),
      readFile(
        new URL("../supabase/functions/submit-question/index.ts", import.meta.url),
        "utf8"
      )
    ]);

    expect(form.match(/crypto\.randomUUID\(\)/g)).toHaveLength(1);
    expect(form).toContain('"X-Idempotency-Key": submissionIdempotencyKey');
    expect(endpoint).toContain('.rpc("create_event_question"');
    expect(endpoint).toContain("questionRecord.was_created");
    expect(endpoint).not.toContain('.from("event_questions")\n        .insert');
    expect(endpoint).not.toContain('.from("question_status_events").insert');
  });
});
