const STORAGE_KEY = "seo_author_token";

function randomToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function getAuthorToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{16,128}$/.test(existing)) return existing;
    const fresh = randomToken();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return randomToken();
  }
}

const NAME_KEY = "seo_author_name";

export function getStoredName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    if (name) window.localStorage.setItem(NAME_KEY, name);
    else window.localStorage.removeItem(NAME_KEY);
  } catch {
    // no-op
  }
}
