import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { namedSupabaseKey, requiredEnv } from "./env.ts";
import { HttpError } from "./http.ts";

export function adminClient(): SupabaseClient {
  return createClient(requiredEnv("SUPABASE_URL"), namedSupabaseKey("SUPABASE_SECRET_KEYS"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

async function authenticatedUser(request: Request): Promise<User> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "운영진 로그인이 필요합니다.", "AUTH_REQUIRED");

  const client = createClient(
    requiredEnv("SUPABASE_URL"),
    namedSupabaseKey("SUPABASE_PUBLISHABLE_KEYS"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          Authorization: "Bearer " + token
        }
      }
    }
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, "로그인 세션을 다시 확인해 주세요.", "INVALID_SESSION");
  }
  return data.user;
}

export async function requireOperator(
  request: Request,
  eventSlug: string
): Promise<{ user: User; admin: SupabaseClient; role: string }> {
  const user = await authenticatedUser(request);
  const admin = adminClient();
  const { data, error } = await admin
    .from("event_operator_memberships")
    .select("role")
    .eq("event_slug", eventSlug)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error("OPERATOR_LOOKUP_FAILED");
  if (!data) {
    throw new HttpError(403, "이 행사에 대한 운영진 권한이 없습니다.", "OPERATOR_FORBIDDEN");
  }
  return { user, admin, role: data.role as string };
}
