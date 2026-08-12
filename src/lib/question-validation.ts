export const QUESTION_MIN_LENGTH = 10;
export const QUESTION_MAX_LENGTH = 1000;
export const CONTACT_MAX_LENGTH = 160;

export const questionCategories = [
  "schedule",
  "signature",
  "room",
  "lodging_meal",
  "transport_parking",
  "submission",
  "other"
] as const;

export const contactMethods = ["none", "email", "phone", "kakao"] as const;

export type QuestionCategory = (typeof questionCategories)[number];
export type ContactMethod = (typeof contactMethods)[number];

export interface QuestionDraft {
  eventSlug: string;
  category: string;
  question: string;
  contactMethod: string;
  contactValue: string;
  turnstileToken: string;
  acknowledged: boolean;
}

export interface ValidationIssue {
  field: keyof QuestionDraft;
  message: string;
}

export function validateQuestionDraft(draft: QuestionDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const question = draft.question.trim();
  const contactValue = draft.contactValue.trim();

  if (!questionCategories.includes(draft.category as QuestionCategory)) {
    issues.push({ field: "category", message: "질문 유형을 선택해 주세요." });
  }
  if (question.length < QUESTION_MIN_LENGTH) {
    issues.push({
      field: "question",
      message: "질문은 10자 이상으로 입력해 주세요."
    });
  } else if (question.length > QUESTION_MAX_LENGTH) {
    issues.push({
      field: "question",
      message: "질문은 1,000자 이하로 입력해 주세요."
    });
  }
  if (!contactMethods.includes(draft.contactMethod as ContactMethod)) {
    issues.push({ field: "contactMethod", message: "연락 방법을 다시 선택해 주세요." });
  }
  if (draft.contactMethod === "none" && contactValue.length > 0) {
    issues.push({
      field: "contactValue",
      message: "연락 방법을 선택하거나 연락처를 비워 주세요."
    });
  }
  if (draft.contactMethod !== "none" && contactValue.length === 0) {
    issues.push({
      field: "contactValue",
      message: "선택한 연락 방법에 맞는 연락처를 입력해 주세요."
    });
  }
  if (contactValue.length > CONTACT_MAX_LENGTH) {
    issues.push({
      field: "contactValue",
      message: "연락처는 160자 이하로 입력해 주세요."
    });
  }
  if (draft.contactMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
    issues.push({ field: "contactValue", message: "이메일 형식을 확인해 주세요." });
  }
  if (
    (draft.contactMethod === "phone" || draft.contactMethod === "kakao") &&
    !/^[0-9+\-()\s]{8,24}$/.test(contactValue)
  ) {
    issues.push({ field: "contactValue", message: "휴대전화번호 형식을 확인해 주세요." });
  }
  if (!draft.acknowledged) {
    issues.push({
      field: "acknowledged",
      message: "개인정보·민감정보 입력 금지 안내를 확인해 주세요."
    });
  }

  return issues;
}
