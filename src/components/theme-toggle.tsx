import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ desktopOnly = false }: { desktopOnly?: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={
        desktopOnly
          ? "kb-key kb-key-sm kb-orange hidden md:inline-grid"
          : "kb-key kb-key-sm kb-orange"
      }
    >
      <span className="kb-cap">
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </span>
    </button>
  );
}
