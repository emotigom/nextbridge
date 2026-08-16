import { corsForRequest, jsonResponse, preflight } from "../_shared/cors.ts";
import {
  questionIdempotencyMaterial,
  randomReceiptCode,
  sha256Hex
} from "../_shared/crypto.ts";
import { clientIp, errorResponseBody, HttpError, readJson } from "../_shared/http.ts";
import { notifyOperators } from "../_shared/notifications.ts";
import { submitQuestionSchema } from "../_shared/question-schema.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

interface CreatedQuestion {
  question_id: string;
  question_receipt_code: string;
  was_created: boolean;
}

Deno.serve(async (request) => {
  const cors = corsForRequest(request);
  const options = preflight(request, cors);
  if (options) return options;
  if (!cors) return new Response(null, { status: 403 });
  if (request.method !== "POST") {
    return jsonResponse(
      cors,
      { code: "METHOD_NOT_ALLOWED", message: "지원하지 않는 요청입니다." },
      405
    );
  }

  try {
    const parsed = submitQuestionSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new HttpError(400, "입력 내용을 다시 확인해 주세요.", "VALIDATION_FAILED");
    }

    const idempotencyKey = request.headers.get("x-idempotency-key")?.trim() ?? "";
    const idempotency = await questionIdempotencyMaterial(
      parsed.data.eventSlug,
      idempotencyKey
    ).catch(() => {
      throw new HttpError(
        400,
        "질문 접수 정보를 다시 확인해 주세요.",
        "INVALID_IDEMPOTENCY_KEY"
      );
    });

    const admin = adminClient();
    const ip = clientIp(request);
    await enforceRateLimit(admin, "submit", ip, 6, 10 * 60);
    await verifyTurnstile(parsed.data.turnstileToken, ip, idempotencyKey);

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("slug, receipt_prefix")
      .eq("slug", parsed.data.eventSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (eventError) throw new Error("EVENT_LOOKUP_FAILED");
    if (!event) {
      throw new HttpError(404, "현재 질문을 접수할 수 없는 행사입니다.", "EVENT_NOT_ACTIVE");
    }

    const privateToken = idempotency.privateToken;
    const privateTokenHash = await sha256Hex(privateToken);
    let questionRecord: CreatedQuestion | null = null;

    for (let attempt = 0; attempt < 3 && !questionRecord; attempt += 1) {
      const { data, error } = await admin
        .rpc("create_event_question", {
          p_event_slug: parsed.data.eventSlug,
          p_receipt_code: randomReceiptCode(event.receipt_prefix),
          p_idempotency_key_hash: idempotency.keyHash,
          p_private_token_hash: privateTokenHash,
          p_category: parsed.data.category,
          p_question_text: parsed.data.question,
          p_contact_method: parsed.data.contactMethod,
          p_contact_value:
            parsed.data.contactMethod === "none" ? null : parsed.data.contactValue
        })
        .single();

      if (!error && data) {
        questionRecord = data as CreatedQuestion;
      } else if (
        error?.code === "23505" &&
        error.message.includes("QUESTION_RECEIPT_COLLISION")
      ) {
        continue;
      } else if (error?.message.includes("EVENT_NOT_ACTIVE")) {
        throw new HttpError(
          404,
          "현재 질문을 접수할 수 없는 행사입니다.",
          "EVENT_NOT_ACTIVE"
        );
      } else {
        throw new Error("QUESTION_INSERT_FAILED");
      }
    }

    if (!questionRecord) throw new Error("QUESTION_RECEIPT_COLLISION");

    if (questionRecord.was_created) {
      try {
        await notifyOperators(admin, {
          questionId: questionRecord.question_id,
          receiptCode: questionRecord.question_receipt_code,
          category: parsed.data.category,
          eventSlug: parsed.data.eventSlug
        });
      } catch {
        // A notification failure never loses an otherwise valid question.
      }
    }

    return jsonResponse(
      cors,
      {
        receiptCode: questionRecord.question_receipt_code,
        privateToken,
        status: "received"
      },
      201
    );
  } catch (error) {
    const normalized = errorResponseBody(error);
    return jsonResponse(cors, normalized.body, normalized.status);
  }
});
