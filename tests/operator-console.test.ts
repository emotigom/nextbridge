import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  QUESTION_POLL_INTERVAL_MS,
  canEditQuestions,
  countQuestions,
  filterQuestions,
  findNewQuestionIds,
  isAdminQuestion,
  isOperatorRole,
  type AdminQuestion
} from "../src/lib/operator-console";

const receivedQuestion: AdminQuestion = {
  id: "question-1",
  receiptCode: "SK26-0001",
  category: "schedule",
  question: "첫날 시작 시간을 확인하고 싶습니다.",
  contactMethod: "none",
  contactValue: null,
  status: "received",
  answer: null,
  createdAt: "2026-08-28T07:00:00.000Z",
  updatedAt: "2026-08-28T07:00:00.000Z"
};

const reviewingQuestion: AdminQuestion = {
  ...receivedQuestion,
  id: "question-2",
  receiptCode: "SK26-0002",
  status: "reviewing"
};

describe("operator console contract", () => {
  it("keeps viewer access read-only while owner and operator can answer", () => {
    expect(canEditQuestions("owner")).toBe(true);
    expect(canEditQuestions("operator")).toBe(true);
    expect(canEditQuestions("viewer")).toBe(false);
    expect(isOperatorRole("viewer")).toBe(true);
    expect(isOperatorRole("authenticated")).toBe(false);
  });

  it("validates the complete API question shape", () => {
    expect(isAdminQuestion(receivedQuestion)).toBe(true);
    expect(isAdminQuestion({ ...receivedQuestion, contactValue: undefined })).toBe(false);
    expect(isAdminQuestion({ ...receivedQuestion, status: "deleted" })).toBe(false);
  });

  it("counts and filters each workflow state", () => {
    const answeredQuestion = {
      ...receivedQuestion,
      id: "question-3",
      receiptCode: "SK26-0003",
      status: "answered" as const
    };
    const questions = [receivedQuestion, reviewingQuestion, answeredQuestion];
    expect(countQuestions(questions)).toEqual({
      all: 3,
      received: 1,
      reviewing: 1,
      answered: 1
    });
    expect(filterQuestions(questions, "reviewing")).toEqual([reviewingQuestion]);
    expect(filterQuestions(questions, "all")).toEqual(questions);
  });

  it("marks only questions first seen after the initial load as new", () => {
    expect(findNewQuestionIds([receivedQuestion], new Set(), false)).toEqual(new Set());
    expect(
      findNewQuestionIds(
        [receivedQuestion, reviewingQuestion],
        new Set([receivedQuestion.id]),
        true
      )
    ).toEqual(new Set([reviewingQuestion.id]));
  });

  it("uses a conservative one-minute polling interval", () => {
    expect(QUESTION_POLL_INTERVAL_MS).toBe(60_000);
  });

  it("refreshes auth in memory and polls questions only for a visible page", async () => {
    const source = await readFile(
      new URL("../src/scripts/operator-console.ts", import.meta.url),
      "utf8"
    );
    expect(source).toContain("persistSession: false");
    expect(source).toContain("autoRefreshToken: true");
    expect(source).toContain('event === "TOKEN_REFRESHED"');
    expect(source).toContain('document.visibilityState === "visible"');
    expect(source).toContain("QUESTION_POLL_INTERVAL_MS");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
  });
});
