export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : import.meta.env.BASE_URL + "/";
  const normalized = path.replace(/^\/+/, "");
  return (base + normalized).replace(/\/{2,}/g, "/");
}
