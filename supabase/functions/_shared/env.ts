export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error("MISSING_CONFIGURATION");
  return value;
}

export function optionalEnv(name: string, fallback = ""): string {
  return Deno.env.get(name)?.trim() || fallback;
}

export function namedSupabaseKey(variableName: string): string {
  const raw = requiredEnv(variableName);
  const name = optionalEnv("SUPABASE_KEY_NAME", "default");
  let values: unknown;
  try {
    values = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_KEY_CONFIGURATION");
  }
  if (typeof values !== "object" || values === null || !(name in values)) {
    throw new Error("INVALID_KEY_CONFIGURATION");
  }
  const selected = (values as Record<string, unknown>)[name];
  if (typeof selected !== "string" || !selected.trim()) {
    throw new Error("INVALID_KEY_CONFIGURATION");
  }
  return selected;
}

export function commaSeparatedEnv(name: string): string[] {
  return optionalEnv(name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
