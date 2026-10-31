import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { KeyButton } from "@/components/key-button";
import { useProductSearch } from "@/lib/product-search";
import { cn } from "@/lib/utils";

export function ShopSearch({
  className,
  inputClassName,
  autoFocus = false,
  placeholder = "Search marketplace…",
  showButton = true,
  variant = "key",
  size = "default",
}: {
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  placeholder?: string;
  showButton?: boolean;
  variant?: "key" | "plain" | "hero";
  size?: "default" | "lg";
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const query = useProductSearch((s) => s.query);
  const setQuery = useProductSearch((s) => s.setQuery);

  function goSearch() {
    if (pathname === "/" || !pathname.startsWith("/shop")) {
      void navigate({ to: "/shop" });
    }
  }

  if (variant === "hero") {
    return (
      <form
        className={cn(
          "flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm",
          className,
        )}
        onSubmit={(e) => {
          e.preventDefault();
          goSearch();
        }}
        role="search"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
          <Search className="size-5 shrink-0 text-[#ff9a00]" strokeWidth={2} />
          <input
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search marketplace"
            className={cn(
              "w-full bg-transparent py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground",
              inputClassName,
            )}
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-[#ff9a00] px-5 py-2.5 text-sm font-bold text-[#1a1000] hover:bg-[#ffb020]"
        >
          Search
        </button>
      </form>
    );
  }

  if (variant === "plain") {
    return (
      <form
        className={cn("shop-search", className)}
        onSubmit={(e) => {
          e.preventDefault();
          goSearch();
        }}
        role="search"
      >
        <Search className="shop-search-icon" />
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search marketplace"
          className={cn("shop-search-input", inputClassName)}
        />
        {showButton ? (
          <button type="submit" className="shop-search-btn">
            Search
          </button>
        ) : null}
      </form>
    );
  }

  return (
    <form
      className={cn("flex min-w-0 items-center gap-1.5", className)}
      onSubmit={(e) => {
        e.preventDefault();
        goSearch();
      }}
      role="search"
    >
      <span
        className={cn(
          "kb-key kb-white kb-search-key min-w-0 flex-1",
          size === "lg" ? "kb-key" : "kb-key-sm",
        )}
      >
        <span className="kb-cap">
          <Search className="size-3.5 shrink-0" />
          <input
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search marketplace"
            className={cn("kb-search-input", inputClassName)}
          />
        </span>
      </span>
      {showButton ? (
        <KeyButton type="submit" size="sm" tone="teal" className="shrink-0">
          Search
        </KeyButton>
      ) : null}
    </form>
  );
}
