import { cn } from "@/lib/utils";
import type { AppUser } from "@/lib/auth/use-current-user";
import { SIFTAH_MARK_SRC } from "./brand";

/** Google profile photo when signed in; Siftah mark otherwise. */
export function UserAvatar({ user, className }: { user: AppUser | null; className?: string }) {
  if (user?.profileImageUrl) {
    return (
      <img
        src={user.profileImageUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("size-10 rounded-full object-cover", className)}
      />
    );
  }
  if (user) {
    const initial = (user.displayName ?? user.primaryEmail ?? "?").trim().charAt(0).toUpperCase();
    return (
      <span
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full bg-[#e3121b] font-display text-lg text-white",
          className,
        )}
      >
        {initial}
      </span>
    );
  }
  return <img src={SIFTAH_MARK_SRC} alt="" className={cn("size-10 rounded-full object-cover", className)} />;
}
