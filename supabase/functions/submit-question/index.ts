import { corsForRequest, jsonResponse, preflight } from "../_shared/cors.ts";
import { randomPrivateToken, randomReceiptCode, sha256Hex } from "../_shared/crypto.ts";
import { clientIp, errorResponseBody, HttpError, readJson } from "../_shared/http.ts";
import { notifyOperators } from "../_shared/notifications.ts";
import { submitQuestionSchema } from "../_shared/question-schema.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

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

    const admin = adminClient();
    const ip = clientIp(request);
    await enforceRateLimit(admin, "submit", ip, 6, 10 * 60);

    const idempotencyHeader = request.headers.get("x-idempotency-key")?.trim() ?? "";
    const idempotencyKey = /^[0-9a-f-]{36}$/i.test(idempotencyHeader)
      ? idempotencyHeader
      : crypto.randomUUID();
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

    const privateToken = randomPrivateToken();
    const privateTokenHash = await sha256Hex(privateToken);
    let questionRecord: { id: string; receipt_code: string } | null = null;

    for (let attempt = 0; attempt < 3 && !questionRecord; attempt += 1) {
      const receiptCode = randomReceiptCode(event.receipt_prefix);
      const { data, error } = await admin
        .from("event_questions")
        .insert({
          event_slug: parsed.data.eventSlug,
          receipt_code: receiptCode,
          private_token_hash: privateTokenHash,
          category: parsed.data.category,
          question_text: parsed.data.question,
          contact_method: parsed.data.contactMethod,
          contact_value: parsed.data.contactMethod === "none" ? null : parsed.data.contactValue
        })
        .select("id, receipt_code")
        .single();

      if (!error && data) questionRecord = data as { id: string; receipt_code: string };
      else if (error?.code !== "23505") throw new Error("QUESTION_INSERT_FAILED");
    }

    if (!questionRecord) throw new Error("QUESTION_RECEIPT_COLLISION");

    await admin.from("question_status_events").insert({
      question_id: questionRecord.id,
      from_status: null,
      to_status: "received",
      actor_user_id: null
    });

    try {
      await notifyOperators(admin, {
        questionId: questionRecord.id,
        receiptCode: questionRecord.receipt_code,
        category: parsed.data.category,
        eventSlug: parsed.data.eventSlug
      });
    } catch {
      // A notification failure never loses an otherwise valid question.
    }

    return jsonResponse(
      cors,
      {
        receiptCode: questionRecord.receipt_code,
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
