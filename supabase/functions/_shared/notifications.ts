import type { SupabaseClient } from "@supabase/supabase-js";
import { optionalEnv } from "./env.ts";

type NotificationChannel = "none" | "kakao_alimtalk" | "email" | "slack" | "discord";

const notificationChannels = new Set<NotificationChannel>([
  "none",
  "kakao_alimtalk",
  "email",
  "slack",
  "discord"
]);

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

interface ProviderResult {
  sent: boolean;
  errorCode: string | null;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const participantStatusUrl = "https://emotigom.github.io/nextbridge/questions/status/";

function notificationChannelFromEnv(name: string): NotificationChannel | null {
  let value = optionalEnv(name, "none").trim().toLowerCase();
  const hasMatchingQuotes =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  if (hasMatchingQuotes) value = value.slice(1, -1).trim();
  if (value === "resend") value = "email";
  return notificationChannels.has(value as NotificationChannel)
    ? (value as NotificationChannel)
    : null;
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

function emailRecipientsFromEnv(name: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(optionalEnv(name, "[]"));
    if (!Array.isArray(parsed)) return null;
    const recipients = parsed.filter(
      (value): value is string => typeof value === "string" && emailPattern.test(value.trim())
    );
    return recipients.length > 0 ? recipients.map((recipient) => recipient.trim()) : null;
  } catch {
    return null;
  }
}

async function sendResendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
}): Promise<ProviderResult> {
  const apiKey = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("RESEND_FROM_EMAIL");
  if (!apiKey || !from) return { sent: false, errorCode: "NOT_CONFIGURED" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text })
    });
    return {
      sent: response.ok,
      errorCode: response.ok ? null : `HTTP_${response.status}`
    };
  } catch {
    return { sent: false, errorCode: "PROVIDER_ERROR" };
  }
}

async function sendOperatorNotification(
  notification: OperatorNotification
): Promise<DeliveryResult> {
  const channel = notificationChannelFromEnv("OPERATOR_NOTIFICATION_PROVIDER");
  const text =
    "[Nextbridge] 새 질문 " +
    notification.receiptCode +
    " · " +
    notification.category +
    " · " +
    notification.eventSlug;
  if (!channel) return { channel: "none", status: "failed", errorCode: "UNSUPPORTED_PROVIDER" };
  try {
    if (channel === "none") return { channel, status: "skipped", errorCode: null };
    if (channel === "slack") {
      const sent = await postJson(optionalEnv("SLACK_WEBHOOK_URL"), { text });
      return { channel, status: sent ? "sent" : "failed", errorCode: sent ? null : "HTTP_FAILED" };
    }
    if (channel === "discord") {
      const sent = await postJson(optionalEnv("DISCORD_WEBHOOK_URL"), {
        content: text,
        allowed_mentions: { parse: [] }
      });
      return { channel, status: sent ? "sent" : "failed", errorCode: sent ? null : "HTTP_FAILED" };
    }
    if (channel === "email") {
      const recipients = emailRecipientsFromEnv("EMAIL_OPERATOR_RECIPIENTS_JSON");
      if (!recipients) return { channel, status: "failed", errorCode: "INVALID_RECIPIENTS" };
      const result = await sendResendEmail({
        to: recipients,
        subject: "[Nextbridge] 새 질문이 접수되었습니다",
        text
      });
      return { channel, status: result.sent ? "sent" : "failed", errorCode: result.errorCode };
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
  const channel = notificationChannelFromEnv("PARTICIPANT_NOTIFICATION_PROVIDER");
  const message =
    "문의하신 질문의 답변이 완료되었습니다.\n\n" +
    "접수번호: " +
    notification.receiptCode +
    "\n답변 확인: " +
    participantStatusUrl +
    "\n\n질문과 답변 내용은 보안을 위해 이메일에 포함하지 않았습니다.";
  if (!channel) return { channel: "none", status: "failed", errorCode: "UNSUPPORTED_PROVIDER" };
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
      if (notification.contactMethod !== "email" || !emailPattern.test(notification.contactValue)) {
        return { channel, status: "skipped", errorCode: "EMAIL_NOT_REQUESTED" };
      }
      const result = await sendResendEmail({
        to: notification.contactValue,
        subject: "[Nextbridge] 답변이 완료되었습니다",
        text: message
      });
      return { channel, status: result.sent ? "sent" : "failed", errorCode: result.errorCode };
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
  const { error } = await admin.from("question_notification_deliveries").insert({
    question_id: questionId,
    kind,
    channel: result.channel,
    delivery_status: result.status,
    error_code: result.errorCode
  });
  if (error) {
    throw new Error(`NOTIFICATION_DELIVERY_RECORD_FAILED:${error.code ?? "UNKNOWN"}`);
  }
}

export async function notifyOperators(
  admin: SupabaseClient,
  notification: OperatorNotification
): Promise<DeliveryResult> {
  const result = await sendOperatorNotification(notification);
  await recordDelivery(admin, notification.questionId, "operator_new_question", result);
  return result;
}

export async function notifyParticipant(
  admin: SupabaseClient,
  notification: ParticipantNotification
): Promise<DeliveryResult> {
  const result = await sendParticipantNotification(notification);
  await recordDelivery(admin, notification.questionId, "participant_answered", result);
  return result;
}
