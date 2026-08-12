import type { SupabaseClient } from "@supabase/supabase-js";
import { optionalEnv } from "./env.ts";

type NotificationChannel = "none" | "kakao_alimtalk" | "email" | "slack" | "discord";

interface OperatorNotification {
  questionId: string;
  receiptCode: string;
  category: string;
  eventSlug: string;
}

interface ParticipantNotification {
  questionId: string;
  receiptCode: string;
  contactMethod: string;
  contactValue: string;
  eventSlug: string;
}

interface DeliveryResult {
  channel: NotificationChannel;
  status: "skipped" | "sent" | "failed";
  errorCode: string | null;
}

async function postJson(url: string, body: unknown, bearerToken = ""): Promise<boolean> {
  if (!url) return false;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: "Bearer " + bearerToken } : {})
    },
    body: JSON.stringify(body)
  });
  return response.ok;
}

async function sendOperatorNotification(
  notification: OperatorNotification
): Promise<DeliveryResult> {
  const channel = optionalEnv("OPERATOR_NOTIFICATION_PROVIDER", "none") as NotificationChannel;
  const text =
    "[Nextbridge] 새 질문 " +
    notification.receiptCode +
    " · " +
    notification.category +
    " · " +
    notification.eventSlug;
  try {
    if (channel === "none") return { channel, status: "skipped", errorCode: null };
    if (channel === "slack") {
      const sent = await postJson(optionalEnv("SLACK_WEBHOOK_URL"), { text });
      return { channel, status: sent ? "sent" : "failed", errorCode: sent ? null : "HTTP_FAILED" };
    }
    if (channel === "discord") {
      const sent = await postJson(optionalEnv("DISCORD_WEBHOOK_URL"), { content: text });
      return { channel, status: sent ? "sent" : "failed", errorCode: sent ? null : "HTTP_FAILED" };
    }
    if (channel === "email") {
      const recipients = JSON.parse(optionalEnv("EMAIL_OPERATOR_RECIPIENTS_JSON", "[]")) as unknown;
      const sent = await postJson(
        optionalEnv("EMAIL_NOTIFICATION_RELAY_URL"),
        {
          kind: "operator_new_question",
          recipients,
          message: text,
          receiptCode: notification.receiptCode
        },
        optionalEnv("EMAIL_NOTIFICATION_RELAY_TOKEN")
      );
      return { channel, status: sent ? "sent" : "failed", errorCode: sent ? null : "HTTP_FAILED" };
    }
    if (channel === "kakao_alimtalk") {
      const recipients = JSON.parse(optionalEnv("KAKAO_OPERATOR_RECIPIENTS_JSON", "[]")) as unknown;
      const sent = await postJson(
        optionalEnv("KAKAO_NOTIFICATION_RELAY_URL"),
        {
          kind: "operator_new_question",
          recipients,
          message: text,
          receiptCode: notification.receiptCode
        },
        optionalEnv("KAKAO_NOTIFICATION_RELAY_TOKEN")
      );
      return { channel, status: sent ? "sent" : "failed", errorCode: sent ? null : "HTTP_FAILED" };
    }
    return { channel, status: "failed", errorCode: "UNSUPPORTED_PROVIDER" };
  } catch {
    return { channel, status: "failed", errorCode: "PROVIDER_ERROR" };
  }
}

async function sendParticipantNotification(
  notification: ParticipantNotification
): Promise<DeliveryResult> {
  const channel = optionalEnv("PARTICIPANT_NOTIFICATION_PROVIDER", "none") as NotificationChannel;
  const message =
    "[Nextbridge] 질문 " +
    notification.receiptCode +
    "의 답변이 완료되었습니다. 비공개 확인 링크 또는 접수번호로 확인해 주세요.";
  try {
    if (channel === "none" || !notification.contactValue) {
      return { channel, status: "skipped", errorCode: null };
    }
    if (channel === "kakao_alimtalk") {
      const sent = await postJson(
        optionalEnv("KAKAO_NOTIFICATION_RELAY_URL"),
        {
          kind: "participant_answered",
          recipient: notification.contactValue,
          contactMethod: notification.contactMethod,
          message,
          receiptCode: notification.receiptCode
        },
        optionalEnv("KAKAO_NOTIFICATION_RELAY_TOKEN")
      );
      return { channel, status: sent ? "sent" : "failed", errorCode: sent ? null : "HTTP_FAILED" };
    }
    if (channel === "email") {
      const sent = await postJson(
        optionalEnv("EMAIL_NOTIFICATION_RELAY_URL"),
        {
          kind: "participant_answered",
          recipient: notification.contactValue,
          message,
          receiptCode: notification.receiptCode
        },
        optionalEnv("EMAIL_NOTIFICATION_RELAY_TOKEN")
      );
      return { channel, status: sent ? "sent" : "failed", errorCode: sent ? null : "HTTP_FAILED" };
    }
    return { channel, status: "failed", errorCode: "UNSUPPORTED_PROVIDER" };
  } catch {
    return { channel, status: "failed", errorCode: "PROVIDER_ERROR" };
  }
}

async function recordDelivery(
  admin: SupabaseClient,
  questionId: string,
  kind: "operator_new_question" | "participant_answered",
  result: DeliveryResult
): Promise<void> {
  await admin.from("question_notification_deliveries").insert({
    question_id: questionId,
    kind,
    channel: result.channel,
    delivery_status: result.status,
    error_code: result.errorCode
  });
}

export async function notifyOperators(
  admin: SupabaseClient,
  notification: OperatorNotification
): Promise<void> {
  const result = await sendOperatorNotification(notification);
  await recordDelivery(admin, notification.questionId, "operator_new_question", result);
}

export async function notifyParticipant(
  admin: SupabaseClient,
  notification: ParticipantNotification
): Promise<void> {
  const result = await sendParticipantNotification(notification);
  await recordDelivery(admin, notification.questionId, "participant_answered", result);
}
