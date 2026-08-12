import type { SupabaseClient } from "@supabase/supabase-js";
import { sha256Hex } from "./crypto.ts";
import { requiredEnv } from "./env.ts";
import { HttpError } from "./http.ts";

export async function enforceRateLimit(
  admin: SupabaseClient,
  scope: "submit" | "status",
  clientIdentifier: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const keyHash = await sha256Hex(
    requiredEnv("RATE_LIMIT_SALT") + ":" + scope + ":" + clientIdentifier
  );
  const { data, error } = await admin.rpc("consume_question_rate_limit", {
    p_key_hash: keyHash,
    p_scope: scope,
    p_window_seconds: windowSeconds,
    p_request_limit: limit
  });
  if (error) throw new Error("RATE_LIMIT_CHECK_FAILED");
  if (data !== true) {
    throw new HttpError(429, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", "RATE_LIMITED");
  }
}
