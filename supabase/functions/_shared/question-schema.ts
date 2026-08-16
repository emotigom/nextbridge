import { z } from "zod";

const category = z.enum([
  "schedule",
  "signature",
  "room",
  "lodging_meal",
  "transport_parking",
  "submission",
  "other"
]);

const contactMethod = z.enum(["none", "email", "phone", "kakao"]);

export const submitQuestionSchema = z
  .object({
    eventSlug: z.string().regex(/^[a-z0-9-]{3,80}$/),
    category,
    question: z.string().trim().min(10).max(1000),
    contactMethod,
    contactValue: z.string().trim().max(160).default(""),
    turnstileToken: z.string().min(1).max(2048),
    acknowledged: z.literal(true)
  })
  .superRefine((value, context) => {
    if (value.contactMethod === "none" && value.contactValue.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["contactValue"],
        message: "연락 방법을 선택하거나 연락처를 비워 주세요."
      });
    }
    if (value.contactMethod !== "none" && value.contactValue.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["contactValue"],
        message: "선택한 연락 방법에 맞는 연락처를 입력해 주세요."
      });
    }
    if (value.contactMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactValue)) {
      context.addIssue({
        code: "custom",
        path: ["contactValue"],
        message: "이메일 형식을 확인해 주세요."
      });
    }
    if (
      (value.contactMethod === "phone" || value.contactMethod === "kakao") &&
      !/^[0-9+\-()\s]{8,24}$/.test(value.contactValue)
    ) {
      context.addIssue({
        code: "custom",
        path: ["contactValue"],
        message: "휴대전화번호 형식을 확인해 주세요."
      });
    }
  });

export const statusLookupSchema = z
  .object({
    eventSlug: z.string().regex(/^[a-z0-9-]{3,80}$/),
    privateToken: z.string().min(20).max(256).optional(),
    receiptCode: z
      .string()
      .regex(/^[A-Z0-9]{2,8}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
      .optional()
  })
  .refine((value) => Boolean(value.privateToken) !== Boolean(value.receiptCode), {
    message: "비공개 토큰 또는 접수번호 중 하나가 필요합니다."
  });

export const adminUpdateSchema = z
  .object({
    eventSlug: z.string().regex(/^[a-z0-9-]{3,80}$/),
    expectedUpdatedAt: z
      .string()
      .min(20)
      .max(64)
      .refine((value) => Number.isFinite(Date.parse(value))),
    status: z.enum(["received", "reviewing", "answered"]),
    answer: z.string().trim().max(2000)
  })
  .superRefine((value, context) => {
    if (value.status === "answered" && value.answer.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["answer"],
        message: "답변 완료 상태에는 답변 내용이 필요합니다."
      });
    }
  });
