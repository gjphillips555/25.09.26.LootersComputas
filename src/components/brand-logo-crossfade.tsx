import { ARTWORK } from "@/lib/artwork";
import { cn } from "@/lib/utils";

/**
 * Soft crossfade between Looters Computas and Siftah Mobile logos.
 * Used on the branded Google sign-in dialog (our UI — not Google's page).
 */
export function BrandLogoCrossfade({
  className,
  heightClass = "h-16",
}: {
  className?: string;
  heightClass?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-[280px] items-center justify-center",
        heightClass,
        className,
      )}
      aria-hidden
    >
      <img
        src={ARTWORK.logoLooters}
        alt=""
        className={cn(
          "absolute inset-x-0 mx-auto object-contain",
          heightClass,
          "animate-[lc-logo-fade_6s_ease-in-out_infinite]",
        )}
      />
      <img
        src={ARTWORK.logoSiftah}
        alt=""
        className={cn(
          "absolute inset-x-0 mx-auto object-contain",
          heightClass,
          "animate-[lc-logo-fade_6s_ease-in-out_infinite_reverse]",
        )}
      />
      <style>{`
        @keyframes lc-logo-fade {
          0%, 42% { opacity: 1; transform: scale(1); }
          50%, 92% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
