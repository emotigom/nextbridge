export class ApiNetworkError extends Error {}

export async function fetchJson(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000
): Promise<{ response: Response; data: unknown }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    });
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    return { response, data };
  } catch {
    if (controller.signal.aborted) {
      throw new ApiNetworkError(
        "연결 시간이 오래 걸립니다. 네트워크를 확인한 뒤 다시 시도해 주세요."
      );
    }
    throw new ApiNetworkError(
      navigator.onLine
        ? "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "인터넷 연결이 끊겼습니다. 연결 후 다시 시도해 주세요."
    );
  } finally {
    window.clearTimeout(timeout);
  }
}
