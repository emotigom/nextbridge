import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../supabase/migrations/20260812000000_create_event_question_support.sql",
  import.meta.url
);

describe("Supabase migration security boundary", () => {
  it("enables and forces RLS on every application table", async () => {
    const sql = (await readFile(migrationPath, "utf8")).toLowerCase();
    expect(sql.match(/enable row level security/g)).toHaveLength(6);
    expect(sql.match(/force row level security/g)).toHaveLength(6);
  });

  it("revokes direct participant and authenticated table access", async () => {
    const sql = (await readFile(migrationPath, "utf8")).toLowerCase();
    expect(sql.match(/revoke all on table/g)).toHaveLength(6);
    expect(sql).toContain("from public, anon, authenticated");
  });

  it("runs the rate limiter with caller privileges and restricts it to the server role", async () => {
    const sql = (await readFile(migrationPath, "utf8")).toLowerCase();
    expect(sql).toContain("security invoker");
    expect(sql).not.toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
  });

  it("indexes user foreign keys used by operator and audit lookups", async () => {
    const sql = (await readFile(migrationPath, "utf8")).toLowerCase();
    expect(sql).toContain("event_operator_memberships_user_idx");
    expect(sql).toContain("event_questions_assigned_operator_idx");
    expect(sql).toContain("question_status_events_actor_idx");
  });

  it("does not authorize from user-editable metadata or publish sensitive Realtime data", async () => {
    const sql = (await readFile(migrationPath, "utf8")).toLowerCase();
    expect(sql).not.toContain("user_metadata");
    expect(sql).not.toContain("raw_user_meta_data");
    expect(sql).not.toContain("supabase_realtime");
  });

  it("seeds the event inactive until the external setup gate is approved", async () => {
    const sql = (await readFile(migrationPath, "utf8")).toLowerCase();
    expect(sql).toMatch(
      /'2026-sk',\s*'경기 성취평가 표준화 평가도구 개발 합숙 워크숍',\s*'sk26',\s*false,/
    );
  });
});
