/** Rego Checker helpers shared by the page and the API (no server-only imports). */

/** Official NZTA rego expiry check. We only link to it; nothing is fetched or scraped from NZTA. */
export const NZTA_EXPIRY_URL = "https://transact.nzta.govt.nz/v2/check-expiry";

export type RegoVehicle = { make?: string; model?: string; year?: number; colour?: string; body?: string; fuel?: string; cc?: number };

/** Uppercase and drop spaces/dashes. */
export function normalizePlate(input: string): string {
  return String(input || "").toUpperCase().replace(/[\s\-·.]/g, "");
}

/** NZ plates (standard and personalised) are 1–6 letters/digits. Returns an error message, or null when valid. */
export function plateError(plate: string): string | null {
  if (!plate) return "Enter a plate.";
  if (!/^[A-Z0-9]+$/.test(plate)) return "Plates only use letters A–Z and numbers 0–9.";
  if (plate.length > 6) return "NZ plates are at most 6 characters.";
  return null;
}

export function carjamPublicUrl(plate: string): string {
  return `https://www.carjam.co.nz/car/?plate=${encodeURIComponent(plate)}`;
}

/** YYYY-MM-DD in local time. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseIsoDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

/** Accept expiry dates from 60 days ago up to 15 months ahead (licences run up to 12 months). */
export function expiryError(s: string): string | null {
  const d = parseIsoDate(s);
  if (!d) return "Pick the expiry date shown on the NZTA site.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = new Date(today);
  min.setDate(min.getDate() - 60);
  const max = new Date(today);
  max.setMonth(max.getMonth() + 15);
  if (d < min) return "That date is more than 60 days ago.";
  if (d > max) return "That date is more than 15 months away.";
  return null;
}

export const REMINDER_OPTIONS = [
  { days: 30, label: "1 month before" },
  { days: 14, label: "2 weeks before" },
  { days: 7, label: "1 week before" },
  { days: 1, label: "1 day before" },
  { days: 0, label: "On the day" },
] as const;

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const icsDate = (d: Date) => isoDate(d).replace(/-/g, "");

/**
 * Calendar file with one all-day event per chosen reminder day, each with a 9 am alert
 * (separate events, because many calendars drop multi-day-before alarms on import).
 */
export function buildRegoIcs(plate: string, expiry: string, daysBefore: number[], label?: string): string {
  const exp = parseIsoDate(expiry)!;
  const name = label ? `${plate} (${label})` : plate;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Siftah Solutions//Rego Checker//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  const uniq = [...new Set(daysBefore)].sort((a, b) => b - a);
  for (const days of uniq) {
    const day = new Date(exp);
    day.setDate(day.getDate() - days);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const when = days === 0 ? "expires today" : days === 1 ? "expires tomorrow" : `expires in ${days} days`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:rego-${plate}-${icsDate(exp)}-${days}@looterscomputas.online`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(day)}`,
      `DTEND;VALUE=DATE:${icsDate(next)}`,
      `SUMMARY:${icsEscape(`Rego ${when}: ${name}`)}`,
      `DESCRIPTION:${icsEscape(`Vehicle licence (rego) for ${plate} expires on ${isoDate(exp)}.\nRenew or check it on the official NZTA site: ${NZTA_EXPIRY_URL}\nReminder from Siftah Rego Checker (looterscomputas.online/auto/rego).`)}`,
      `URL:${NZTA_EXPIRY_URL}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(`Rego ${when}: ${name}`)}`,
      "TRIGGER:PT9H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  // RFC 5545: CRLF line endings, fold lines over 75 octets.
  return lines.map((l) => (l.length > 74 ? l.match(/.{1,74}/g)!.join("\r\n ") : l)).join("\r\n") + "\r\n";
}
