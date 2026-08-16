import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../supabase/migrations/20260816071856_harden_question_transactions.sql",
  import.meta.url
);

describe("question transaction hardening", () => {
  it("restricts both transaction functions to the server role", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    expect(sql.match(/security invoker/g)).toHaveLength(2);
    expect(sql).not.toContain("security definer");
    expect(sql.match(/from public, anon, authenticated/g)).toHaveLength(2);
    expect(sql.match(/to service_role/g)).toHaveLength(2);
  });

  it("creates the question and initial status event in one database call", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    expect(sql).toContain("create or replace function public.create_event_question");
    expect(sql).toContain("idempotency_key_hash");
    expect(sql).toContain("event_questions_event_idempotency_idx");
    expect(sql).toContain("insert into public.event_questions");
    expect(sql).toContain("insert into public.question_status_events");
    expect(sql).toContain("was_created boolean");
  });

  it("locks updates and rejects stale operator writes", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    const endpoint = await readFile(
      new URL("../supabase/functions/admin-questions/index.ts", import.meta.url),
      "utf8"
    );
    const operator = await readFile(
      new URL("../src/scripts/operator-console.ts", import.meta.url),
      "utf8"
    );

    expect(sql).toContain("for update;");
    expect(sql).toContain("p_expected_updated_at");
    expect(sql).toContain("QUESTION_CONFLICT");
    expect(endpoint).toContain('.rpc("update_event_question"');
    expect(endpoint).toContain("p_expected_updated_at: parsed.data.expectedUpdatedAt");
    expect(endpoint).toContain("409");
    expect(operator).toContain("expectedUpdatedAt: question.updatedAt");
    expect(operator).toContain("error.status === 409");
  });
});
