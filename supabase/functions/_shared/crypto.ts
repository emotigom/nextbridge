const RECEIPT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function randomPrivateToken(): string {
  const bytes = randomBytes(32);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
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
