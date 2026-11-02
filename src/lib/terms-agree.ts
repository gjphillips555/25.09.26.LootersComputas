const KEY = "looters-terms-agreed-2026-11-ai-v1";

export function hasAgreedTerms(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setAgreedTerms() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}
