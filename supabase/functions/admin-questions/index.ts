import { corsForRequest, jsonResponse, preflight } from "../_shared/cors.ts";
import { errorResponseBody, HttpError, readJson } from "../_shared/http.ts";
import { notifyParticipant } from "../_shared/notifications.ts";
import { adminUpdateSchema } from "../_shared/question-schema.ts";
import { requireOperator } from "../_shared/supabase.ts";

function functionRoute(request: Request): string {
  const path = new URL(request.url).pathname;
  return path.split("/admin-questions")[1] || "/";
}

function validEventSlug(value: string): boolean {
  return /^[a-z0-9-]{3,80}$/.test(value);
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (request) => {
  const cors = corsForRequest(request);
  const options = preflight(request, cors);
  if (options) return options;
  if (!cors) return new Response(null, { status: 403 });

  try {
    const route = functionRoute(request);

    if (request.method === "POST" && route === "/authorize") {
      const body = await readJson(request, 2_048);
      const eventSlug =
        typeof body === "object" &&
        body !== null &&
        "eventSlug" in body &&
        typeof body.eventSlug === "string"
          ? body.eventSlug
          : "";
      if (!validEventSlug(eventSlug)) {
        throw new HttpError(400, "행사 정보를 확인해 주세요.", "INVALID_EVENT");
      }
      const { role } = await requireOperator(request, eventSlug);
      return jsonResponse(cors, { authorized: true, role });
    }

    if (request.method === "GET" && route === "/") {
      const eventSlug = new URL(request.url).searchParams.get("eventSlug") ?? "";
      if (!validEventSlug(eventSlug)) {
        throw new HttpError(400, "행사 정보를 확인해 주세요.", "INVALID_EVENT");
      }
      const { admin } = await requireOperator(request, eventSlug);
      const { data, error } = await admin
        .from("event_questions")
        .select(
          "id, receipt_code, category, question_text, contact_method, contact_value, status, answer_text, created_at, updated_at"
        )
        .eq("event_slug", eventSlug)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error("ADMIN_QUESTION_LIST_FAILED");

      return jsonResponse(cors, {
        questions: (data ?? []).map((question) => ({
          id: question.id,
          receiptCode: question.receipt_code,
          category: question.category,
          question: question.question_text,
          contactMethod: question.contact_method,
          contactValue: question.contact_value,
          status: question.status,
          answer: question.answer_text,
          createdAt: question.created_at,
          updatedAt: question.updated_at
        }))
      });
    }

    if (request.method === "PATCH" && route.startsWith("/")) {
      const questionId = route.slice(1);
      if (!validUuid(questionId)) {
        throw new HttpError(400, "질문 식별자를 확인해 주세요.", "INVALID_QUESTION_ID");
      }
      const parsed = adminUpdateSchema.safeParse(await readJson(request, 8_192));
      if (!parsed.success) {
        throw new HttpError(400, "상태와 답변 내용을 확인해 주세요.", "INVALID_ADMIN_UPDATE");
      }

      const { user, admin, role } = await requireOperator(request, parsed.data.eventSlug);
      if (!["owner", "operator"].includes(role)) {
        throw new HttpError(403, "답변을 변경할 권한이 없습니다.", "UPDATE_FORBIDDEN");
      }

      const { data: existing, error: existingError } = await admin
        .from("event_questions")
        .select("id, receipt_code, status, contact_method, contact_value")
        .eq("id", questionId)
        .eq("event_slug", parsed.data.eventSlug)
        .maybeSingle();
      if (existingError) throw new Error("QUESTION_LOOKUP_FAILED");
      if (!existing) {
        throw new HttpError(404, "질문을 찾지 못했습니다.", "QUESTION_NOT_FOUND");
      }

      const answer = parsed.data.answer || null;
      const answeredAt = parsed.data.status === "answered" ? new Date().toISOString() : null;
      const { data: updated, error: updateError } = await admin
        .from("event_questions")
        .update({
          status: parsed.data.status,
          answer_text: answer,
          answered_at: answeredAt,
          updated_at: new Date().toISOString()
        })
        .eq("id", questionId)
        .eq("event_slug", parsed.data.eventSlug)
        .select("id, receipt_code, status, updated_at")
        .single();
      if (updateError || !updated) throw new Error("QUESTION_UPDATE_FAILED");

      if (existing.status !== parsed.data.status) {
        await admin.from("question_status_events").insert({
          question_id: questionId,
          from_status: existing.status,
          to_status: parsed.data.status,
          actor_user_id: user.id
        });
      }

      if (
        existing.status !== "answered" &&
        parsed.data.status === "answered" &&
        existing.contact_method !== "none" &&
        existing.contact_value
      ) {
        try {
          await notifyParticipant(admin, {
            questionId,
            receiptCode: existing.receipt_code,
            contactMethod: existing.contact_method,
            contactValue: existing.contact_value,
            eventSlug: parsed.data.eventSlug
          });
        } catch {
          // The answer stays saved even when a completion notification fails.
        }
      }

      return jsonResponse(cors, {
        id: updated.id,
        receiptCode: updated.receipt_code,
        status: updated.status,
        updatedAt: updated.updated_at
      });
    }

    return jsonResponse(
      cors,
      { code: "METHOD_NOT_ALLOWED", message: "지원하지 않는 요청입니다." },
      405
    );
  } catch (error) {
    const normalized = errorResponseBody(error);
    return jsonResponse(cors, normalized.body, normalized.status);
  }
});
