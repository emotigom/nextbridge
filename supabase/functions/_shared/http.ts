export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly publicMessage: string,
    public readonly code: string
  ) {
    super(code);
  }
}

export async function readJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "JSON 요청만 지원합니다.", "UNSUPPORTED_CONTENT_TYPE");
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError(413, "입력 내용이 너무 큽니다.", "PAYLOAD_TOO_LARGE");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, "입력 내용이 너무 큽니다.", "PAYLOAD_TOO_LARGE");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "입력 형식을 확인해 주세요.", "INVALID_JSON");
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    forwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function errorResponseBody(error: unknown): {
  status: number;
  body: { code: string; message: string };
} {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.publicMessage }
    };
  }
  return {
    status: 500,
    body: {
      code: "INTERNAL_ERROR",
      message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
    }
  };
}
