import { PayPalMark } from "@/components/pay-with-paypal";
import { cn } from "@/lib/utils";

export function PayPalAdvert({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={cn(
      "flex items-center justify-center gap-4 rounded-xl border border-[#003087]/15 bg-gradient-to-r from-[#f4f8ff] via-white to-[#eaf2ff] text-[#003087] shadow-sm",
      compact ? "px-3 py-2" : "mx-auto w-full max-w-3xl px-6 py-6 sm:py-8",
    )} aria-label="PayPal payment advert">
      <span className={cn("grid shrink-0 place-items-center rounded-full bg-white shadow-sm", compact ? "size-9" : "size-16")}>
        <PayPalMark className={compact ? "size-6" : "size-10"} />
      </span>
      <span className="min-w-0">
        <strong className={cn("block font-bold tracking-tight", compact ? "text-xs" : "text-xl sm:text-2xl")}>
          Pay securely with PayPal
        </strong>
        <span className={cn("block text-[#334b70]", compact ? "text-[10px]" : "mt-1 text-sm")}>
          Fast, trusted checkout. Your payment details stay protected by PayPal.
        </span>
      </span>
    </aside>
  );
}
