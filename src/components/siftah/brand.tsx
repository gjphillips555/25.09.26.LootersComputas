import { cn } from "@/lib/utils";

export const SIFTAH_LOGO_SRC = "/brand/siftah-solutions-logo.svg";
export const SIFTAH_MARK_SRC = "/brand/siftah-mark.svg";

/** The Siftah Solutions sticker logo ("trading as: looterscomputas.online"). */
export function SiftahLogo({ className }: { className?: string }) {
  return (
    <img
      src={SIFTAH_LOGO_SRC}
      alt="Siftah Solutions – trading as looterscomputas.online"
      decoding="async"
      className={cn("h-11 w-auto object-contain", className)}
    />
  );
}

/** Square Siftah mark (favicon / app icon / signed-out chat head). */
export function SiftahMark({ className }: { className?: string }) {
  return <img src={SIFTAH_MARK_SRC} alt="" aria-hidden="true" decoding="async" className={cn("size-10", className)} />;
}
