import { commaSeparatedEnv } from "./env.ts";

export interface CorsContext {
  origin: string;
  headers: Record<string, string>;
}

export function corsForRequest(request: Request): CorsContext | null {
  const origin = request.headers.get("origin")?.trim() ?? "";
  const allowed = commaSeparatedEnv("ALLOWED_ORIGINS");
  if (!origin || !allowed.includes(origin)) return null;

  return {
    origin,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-idempotency-key, x-client-info",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin"
    }
  };
}

export function preflight(request: Request, cors: CorsContext | null): Response | null {
  if (request.method !== "OPTIONS") return null;
  if (!cors) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: cors.headers });
}

export function jsonResponse(
  cors: CorsContext,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...cors.headers,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}
