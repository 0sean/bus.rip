export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
export function setCookie(
  name: string,
  value: string,
  options: { expires: Date },
) {
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${options.expires.toUTCString()}; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
