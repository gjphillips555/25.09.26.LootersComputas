/**
 * Optional CarJam rego lookup (official CarJam API, https://www.carjam.co.nz/dev/).
 * Enabled only when CARJAM_API_KEY is set. Returns only "non-resale" fields
 * (make, model, year, engine size, fuel type, colour) so the connection stays non-resale.
 * Set CARJAM_ENV=test to use CarJam's free test environment.
 */
export function carjamEnabled() {
  return Boolean(process.env.CARJAM_API_KEY?.trim());
}

type Found = { make?: string; model?: string; year?: number; fuel?: string; colour?: string; cc?: number };

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

export async function carjamLookup(plate: string): Promise<Found | null> {
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
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    const make = pick(data, ["make"]);
    if (!make) return null;
    const year = Number(pick(data, ["year_of_manufacture", "year"]));
    return {
      make: String(make),
      model: String(pick(data, ["model"]) ?? ""),
      year: Number.isFinite(year) && year > 1900 ? year : undefined,
      fuel: (pick(data, ["hfuel_type", "fuel_type_text", "fuel_type"]) as string | undefined)?.toString(),
      colour: (pick(data, ["hmain_colour", "main_colour"]) as string | undefined)?.toString(),
      cc: Number(pick(data, ["cc_rating", "engine_capacity"])) || undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
