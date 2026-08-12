import { commaSeparatedEnv, requiredEnv } from "./env.ts";
import { HttpError } from "./http.ts";

interface TurnstileResult {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  token: string,
  remoteIp: string,
  idempotencyKey: string
): Promise<void> {
  if (token.length > 2048) {
    throw new HttpError(400, "스팸 방지 확인을 다시 진행해 주세요.", "TURNSTILE_INVALID");
  }

  const form = new FormData();
  form.set("secret", requiredEnv("TURNSTILE_SECRET_KEY"));
  form.set("response", token);
  if (remoteIp !== "unknown") form.set("remoteip", remoteIp);
  form.set("idempotency_key", idempotencyKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let result: TurnstileResult;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: controller.signal
    });
    result = (await response.json()) as TurnstileResult;
  } catch {
    throw new HttpError(
      503,
      "스팸 방지 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
      "TURNSTILE_UNAVAILABLE"
    );
  } finally {
    clearTimeout(timeout);
  }

  const allowedHostnames = commaSeparatedEnv("TURNSTILE_EXPECTED_HOSTNAMES");
  if (
    result.success !== true ||
    result.action !== "submit-question" ||
    !result.hostname ||
    !allowedHostnames.includes(result.hostname)
  ) {
    throw new HttpError(400, "스팸 방지 확인을 다시 진행해 주세요.", "TURNSTILE_REJECTED");
  }
}
