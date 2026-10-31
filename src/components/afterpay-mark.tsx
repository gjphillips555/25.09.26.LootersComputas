import { ARTWORK } from "@/lib/artwork";
import { cn } from "@/lib/utils";

export function AfterpayMark({ className }: { className?: string }) {
  return (
    <img
      src={ARTWORK.afterpayMark}
      alt="Afterpay"
      width={139}
      height={49}
      className={cn("inline-block h-5 w-auto shrink-0", className)}
      decoding="async"
    />
  );
}

export function AfterpayLine({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  const each = Math.round((amount / 4) * 100) / 100;
  if (each <= 0) return null;
  const label = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
  }).format(each);

  return (
    <p className={cn("flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <AfterpayMark />
      <span>
        Pay 4 instalments of <span className="font-semibold text-foreground">{label}</span>
      </span>
    </p>
  );
}
