import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Grid3x3, RotateCcw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { DEFAULT_TABBAR, TAB_IDS, TAB_ITEMS, saveTabbar, serializeTabbar, useTabbarConfig, type TabId, type TabbarConfig } from "@/lib/tabbar";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Siftah Solutions" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-2xl py-6">
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-[#55555c]">Saved on this device in a cookie, so it works whether or not you're signed in.</p>
        <TabbarSettings />
      </section>
    </AppShell>
  );
}

const SLOT_NAMES = ["Left 1", "Left 2", "Right 1", "Right 2"];

export function TabbarSettings() {
  const saved = useTabbarConfig();
  const [draft, setDraft] = useState<TabbarConfig>(saved);
  useEffect(() => setDraft(saved), [saved]);
  const dirty = serializeTabbar(draft) !== serializeTabbar(saved);
  const isDefault = serializeTabbar(saved) === serializeTabbar(DEFAULT_TABBAR);

  const setCenter = (id: TabId) =>
    setDraft((d) => {
      // If the new centre is in a slot, the old centre takes its place.
      const slots = d.slots.map((s) => (s === id ? d.center : s)) as TabbarConfig["slots"];
      return { center: id, slots };
    });
  const setSlot = (i: number, id: TabId) =>
    setDraft((d) => {
      const slots = [...d.slots] as TabbarConfig["slots"];
      let center = d.center;
      const j = slots.indexOf(id);
      if (j >= 0) slots[j] = slots[i]; // swap with the slot that already had it
      else if (center === id) center = slots[i]; // or with the centre
      slots[i] = id;
      return { center, slots };
    });

  const preview = (id: TabId, raised = false) => {
    const it = TAB_ITEMS[id];
    return raised ? (
      <div className="flex flex-1 justify-center">
        <span className="-mt-5 flex size-14 flex-col items-center justify-center rounded-full border-4 border-[#0b0b0c] bg-[#e3121b] text-white">
          <it.icon className="size-5" />
          <span className="text-[8px] font-black uppercase leading-none">{it.label}</span>
        </span>
      </div>
    ) : (
      <span className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[9px] font-bold uppercase text-white/70">
        <it.icon className="size-4" />
        {it.label}
      </span>
    );
  };

  return (
    <div className="mt-6 rounded-3xl border-2 border-[#0b0b0c] bg-white p-5 text-[#0b0b0c]" data-testid="tabbar-settings">
      <h2 className="inline-flex items-center gap-2 font-display text-xl"><Smartphone className="size-5 text-[#e3121b]" /> Mobile tab bar</h2>
      <p className="mt-1 text-sm text-[#55555c]">Pick the big raised button in the middle of the bottom bar, and the four buttons around it. Menu always stays on the right.</p>

      <div className="mt-4 overflow-hidden rounded-2xl bg-[#0b0b0c] px-2 pt-6" aria-label="Preview" data-testid="tabbar-preview">
        <div className="mx-auto flex h-14 max-w-md items-stretch">
          {preview(draft.slots[0])}
          {preview(draft.slots[1])}
          {preview(draft.center, true)}
          {preview(draft.slots[2])}
          {preview(draft.slots[3])}
          <span className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[9px] font-bold uppercase text-white/70"><Grid3x3 className="size-4" />Menu</span>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-black uppercase tracking-[0.15em] text-[#e3121b]">Centre button</legend>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {TAB_IDS.map((id) => {
            const it = TAB_ITEMS[id];
            const on = draft.center === id;
            return (
              <button key={id} type="button" aria-pressed={on} onClick={() => setCenter(id)} data-testid={`center-${id}`}
                className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-xs font-bold", on ? "border-[#e3121b] bg-[#e3121b] text-white" : "border-black/15 hover:border-[#0b0b0c]")}>
                <it.icon className="size-5" />
                {it.hint === "Mr CluedUp AI" ? "Mr CluedUp" : it.label}
                {on && <Check className="size-3.5" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-xs font-black uppercase tracking-[0.15em] text-[#e3121b]">Other buttons</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {draft.slots.map((sid, i) => (
            <label key={i} className="block text-xs font-bold text-[#55555c]">
              {SLOT_NAMES[i]}
              <select value={sid} onChange={(e) => setSlot(i, e.target.value as TabId)} data-testid={`slot-${i}`} className="mt-1 h-10 w-full rounded-xl border border-black/15 bg-white px-2 text-sm text-[#0b0b0c]">
                {TAB_IDS.map((id) => <option key={id} value={id}>{TAB_ITEMS[id].hint === "Mr CluedUp AI" ? "Mr CluedUp" : TAB_ITEMS[id].label}</option>)}
              </select>
            </label>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-[#55555c]">Picking something that's already in the bar swaps the two.</p>
      </fieldset>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={!dirty} onClick={() => { saveTabbar(draft); toast.success("Tab bar saved"); }} className="inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40" data-testid="tabbar-save">
          <Check className="size-4" /> Save
        </button>
        <button type="button" disabled={isDefault && !dirty} onClick={() => { saveTabbar(null); setDraft(DEFAULT_TABBAR); toast.success("Back to the default tab bar"); }} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] px-4 py-2 text-sm font-bold disabled:opacity-40" data-testid="tabbar-reset">
          <RotateCcw className="size-4" /> Reset to default
        </button>
      </div>
      <p className="mt-3 text-[11px] text-[#55555c]">Default: Plates in the centre with Home, Shop, Auto and PinDrop. Stored in the first-party cookie <code>siftah_tabbar</code> for one year.</p>
    </div>
  );
}
