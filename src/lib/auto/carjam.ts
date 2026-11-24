/**
 * Optional CarJam rego lookup (official CarJam API, https://www.carjam.co.nz/dev/).
 * Enabled only when CARJAM_API_KEY is set. Returns only "non-resale" fields
 * (make, model, year, engine size, fuel type, colour, body style) so the connection stays non-resale.
 * Set CARJAM_ENV=test to use CarJam's free test environment.
 */
export function carjamEnabled() {
  return Boolean(process.env.CARJAM_API_KEY?.trim());
}

export type Found = { make?: string; model?: string; year?: number; fuel?: string; colour?: string; body?: string; cc?: number };

function pick(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const stack: unknown[] = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
      if (keys.includes(k.toLowerCase()) && (typeof v === "string" || typeof v === "number") && String(v).trim()) return v;
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return undefined;
}

export type CarjamResult =
  | { status: "found"; vehicle: Found }
  | { status: "not_found" }
  | { status: "error" };

/** Lookup with an explicit outcome so callers can cache "not found" but never cache transient errors. */
export async function carjamLookupDetailed(plate: string): Promise<CarjamResult> {
  const key = process.env.CARJAM_API_KEY!.trim();
  const test = process.env.CARJAM_ENV === "test";
  const base = test ? "https://test.carjam.co.nz/api/car/" : "https://www.carjam.co.nz/api/car/";
  const qs = new URLSearchParams({ key, plate, basic: "1", translate: "1", f: "json", cache: "1" });
  const headers: Record<string, string> = {};
  if (test) headers.Authorization = "Basic " + Buffer.from("test:test").toString("base64");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${base}?${qs}`, { headers, signal: ctrl.signal });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error" };
    const data = (await res.json()) as unknown;
    if (pick(data, ["error", "message"]) && !pick(data, ["make"])) {
      const msg = String(pick(data, ["error", "message"])).toLowerCase();
      return /not\s*found|no\s*vehicle|invalid\s*plate|unknown/.test(msg) ? { status: "not_found" } : { status: "error" };
    }
    const make = pick(data, ["make"]);
    if (!make) return { status: "not_found" };
    const year = Number(pick(data, ["year_of_manufacture", "year"]));
    const str = (keys: string[]) => {
      const v = pick(data, keys);
      return v === undefined ? undefined : String(v).trim() || undefined;
    };
    return {
      status: "found",
      vehicle: {
        make: String(make),
        model: str(["model"]) ?? "",
        year: Number.isFinite(year) && year > 1900 ? year : undefined,
        fuel: str(["hfuel_type", "fuel_type_text", "fuel_type"]),
        colour: str(["hmain_colour", "main_colour"]),
        body: str(["hbody_style", "body_style_text", "body_style"]),
        cc: Number(pick(data, ["cc_rating", "engine_capacity"])) || undefined,
      },
    };
  } catch {
    return { status: "error" };
  } finally {
    clearTimeout(t);
  }
}

export async function carjamLookup(plate: string): Promise<Found | null> {
  const r = await carjamLookupDetailed(plate);
  return r.status === "found" ? r.vehicle : null;
}
