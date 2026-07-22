import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="group relative inline-flex h-9 w-16 items-center rounded-full border border-white/10 bg-card/60 p-1 backdrop-blur transition-colors hover:border-primary/40"
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-300 ease-out"
        style={{ transform: isDark ? "translateX(0)" : "translateX(28px)" }}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : (
          <Sun className="h-3.5 w-3.5" strokeWidth={2.5} />
        )}
      </span>
      <Sun
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground opacity-60"
        strokeWidth={2.5}
      />
      <Moon
        className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground opacity-60"
        strokeWidth={2.5}
      />
    </button>
  );
}
