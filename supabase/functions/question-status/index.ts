import { corsForRequest, jsonResponse, preflight } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/crypto.ts";
import { clientIp, errorResponseBody, HttpError, readJson } from "../_shared/http.ts";
import { statusLookupSchema } from "../_shared/question-schema.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { adminClient } from "../_shared/supabase.ts";

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
    const parsed = statusLookupSchema.safeParse(await readJson(request, 4_096));
    if (!parsed.success) {
      throw new HttpError(400, "접수번호 또는 비공개 링크를 확인해 주세요.", "INVALID_LOOKUP");
    }

    const admin = adminClient();
    await enforceRateLimit(admin, "status", clientIp(request), 24, 10 * 60);

    let query = admin
      .from("event_questions")
      .select("receipt_code, status, answer_text, updated_at")
      .eq("event_slug", parsed.data.eventSlug);

    if (parsed.data.privateToken) {
      query = query.eq("private_token_hash", await sha256Hex(parsed.data.privateToken));
    } else {
      query = query.eq("receipt_code", parsed.data.receiptCode ?? "");
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error("QUESTION_LOOKUP_FAILED");
    if (!data) {
      throw new HttpError(404, "일치하는 질문을 찾지 못했습니다.", "QUESTION_NOT_FOUND");
    }

    return jsonResponse(cors, {
      receiptCode: data.receipt_code,
      status: data.status,
      answer: data.status === "answered" ? data.answer_text : null,
      updatedAt: data.updated_at
    });
  } catch (error) {
    const normalized = errorResponseBody(error);
    return jsonResponse(cors, normalized.body, normalized.status);
  }
});
