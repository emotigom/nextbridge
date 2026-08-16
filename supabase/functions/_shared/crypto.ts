const RECEIPT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_SLUG_PATTERN = /^[a-z0-9-]{3,80}$/;

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export async function questionIdempotencyMaterial(
  eventSlug: string,
  idempotencyKey: string
): Promise<{ keyHash: string; privateToken: string }> {
  if (!EVENT_SLUG_PATTERN.test(eventSlug) || !UUID_PATTERN.test(idempotencyKey)) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }
  const normalizedKey = idempotencyKey.toLowerCase();
  return {
    keyHash: await sha256Hex(normalizedKey),
    privateToken: await sha256Hex(
      "nextbridge-private-token:" + eventSlug + ":" + normalizedKey
    )
  };
}

export function randomReceiptCode(prefix: string): string {
  if (!/^[A-Z0-9]{2,8}$/.test(prefix)) throw new Error("INVALID_RECEIPT_PREFIX");
  const bytes = randomBytes(12);
  const characters = [...bytes].map(
    (byte) => RECEIPT_ALPHABET[byte % RECEIPT_ALPHABET.length] ?? "A"
  );
  return (
    prefix +
    "-" +
    characters.slice(0, 4).join("") +
    "-" +
    characters.slice(4, 8).join("") +
    "-" +
    characters.slice(8, 12).join("")
  );
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
