/** Member profile helpers shared by browser and server (no server-only imports). */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

/** Avatar URLs we pass to the browser: https (Google, Vercel Blob) or our own DB-served avatar/photo paths. */
export function safeAvatar(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https:\/\//i.test(url)) return url;
  if (/^\/api\/(profile\/avatar|auto\/photo)\/[A-Za-z0-9_-]{1,40}$/.test(url)) return url;
  return null;
}

// Names that could impersonate staff, the site or the assistant (checked after leetspeak folding).
const RESERVED = [
  "admin", "administrator", "moderator", "siftah", "looters", "looterscomputas", "computas", "support", "helpdesk",
  "staff", "official", "system", "sysadmin", "root", "owner", "mrcluedup", "cluedup", "grok", "webmaster", "security",
];
const RESERVED_EXACT = ["mod", "mods", "team", "bot", "null", "undefined", "anonymous", "member", "guest"];
const BLOCKED = [
  "fuck", "shit", "cunt", "nigg", "fagg", "whore", "slut", "rapist", "nazi", "hitler", "wank", "twat", "asshole",
  "bitch", "pussy", "retard", "kkk", "paedo", "pedo",
];

function fold(s: string) {
  return s
    .toLowerCase()
    .replace(/[0]/g, "o").replace(/[1!|]/g, "i").replace(/3/g, "e").replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s").replace(/7/g, "t").replace(/8/g, "b")
    .replace(/[^a-z]/g, "");
}

/** Trim and collapse spaces. */
export function normalizeUsername(input: string): string {
  return String(input || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** Returns an error message, or null when the username is acceptable. */
export function usernameError(name: string): string | null {
  if (name.length < USERNAME_MIN) return `Usernames need at least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `Usernames can be up to ${USERNAME_MAX} characters.`;
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(name)) return "Use letters, numbers, spaces, dots, dashes or underscores, starting with a letter or number.";
  if (/[ ._-]{2,}/.test(name)) return "Avoid repeated spaces or symbols.";
  const f = fold(name);
  if (!/[a-z]/.test(name.toLowerCase())) return "Include at least one letter.";
  if (RESERVED.some((r) => f.includes(r)) || RESERVED_EXACT.includes(f)) return "That name is reserved. Pick another.";
  if (BLOCKED.some((b) => f.includes(b))) return "Please pick a different name.";
  return null;
}
