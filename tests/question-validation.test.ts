import { describe, expect, it } from "vitest";
import {
  CONTACT_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  validateQuestionDraft,
  type QuestionDraft
} from "../src/lib/question-validation";
import { submitQuestionSchema } from "../supabase/functions/_shared/question-schema";

const validDraft: QuestionDraft = {
  eventSlug: "2026-sk",
  category: "schedule",
  question: "첫날 등록 장소와 시작 시간을 확인하고 싶습니다.",
  contactMethod: "none",
  contactValue: "",
  turnstileToken: "verified-test-token",
  acknowledged: true
};

describe("question validation", () => {
  it("accepts a minimal privacy-preserving question", () => {
    expect(validateQuestionDraft(validDraft)).toEqual([]);
    expect(submitQuestionSchema.safeParse(validDraft).success).toBe(true);
  });

  it("enforces the question length in browser and server contracts", () => {
    const oversized = { ...validDraft, question: "가".repeat(QUESTION_MAX_LENGTH + 1) };
    expect(validateQuestionDraft(oversized).some((issue) => issue.field === "question")).toBe(true);
    expect(submitQuestionSchema.safeParse(oversized).success).toBe(false);
  });

  it("requires contact details only when a contact method is selected", () => {
    const missing = { ...validDraft, contactMethod: "kakao", contactValue: "" };
    expect(validateQuestionDraft(missing).some((issue) => issue.field === "contactValue")).toBe(
      true
    );
    expect(submitQuestionSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects malformed email, phone, and oversized contact details", () => {
    for (const draft of [
      { ...validDraft, contactMethod: "email", contactValue: "not-an-email" },
      { ...validDraft, contactMethod: "phone", contactValue: "phone please" },
      { ...validDraft, contactMethod: "kakao", contactValue: "kakao-id" },
      {
        ...validDraft,
        contactMethod: "kakao",
        contactValue: "가".repeat(CONTACT_MAX_LENGTH + 1)
      }
    ]) {
      expect(validateQuestionDraft(draft).some((issue) => issue.field === "contactValue")).toBe(
        true
      );
      expect(submitQuestionSchema.safeParse(draft).success).toBe(false);
    }
  });

  it("accepts a phone number for Kakao completion notifications", () => {
    const kakao = { ...validDraft, contactMethod: "kakao", contactValue: "010-1234-5678" };
    expect(validateQuestionDraft(kakao)).toEqual([]);
    expect(submitQuestionSchema.safeParse(kakao).success).toBe(true);
  });

  it("requires acknowledgement of the sensitive-data warning", () => {
    const unacknowledged = { ...validDraft, acknowledged: false };
    expect(
      validateQuestionDraft(unacknowledged).some((issue) => issue.field === "acknowledged")
    ).toBe(true);
    expect(submitQuestionSchema.safeParse(unacknowledged).success).toBe(false);
  });
});
