import type { ReactNode } from "react";
import { Header, Footer } from "./Header";
import { Toaster } from "@/components/ui/sonner";

export function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col font-sans bg-background text-foreground transition-colors duration-300 selection:bg-amber-500 selection:text-black">
      {/* Vibrant Spicy African Culinary Background Texture */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src="/images/spicy-african-bg.png"
          alt="Spicy African Backdrop"
          className="h-full w-full object-cover opacity-25 dark:opacity-80 scale-105 animate-slow-pan transition-opacity duration-500"
        />
        {/* Scrim Overlay tailored for Light Ivory & Dark Obsidian Themes */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background/90 dark:from-black/70 dark:via-black/40 dark:to-black/80 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-background/80 dark:to-black/70" />
      </div>

      <Header />
      <main className="flex-1 relative z-10">{children}</main>
      <Footer />
      <Toaster richColors position="top-center" />
    </div>
  );
}
