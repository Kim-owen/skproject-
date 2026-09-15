import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStorefrontConfig } from "@/lib/storefront.functions";
import { generateStorefrontThemeCss, DEFAULT_THEME_CONFIG } from "@/lib/theme-presets";
import { Header, Footer } from "./Header";
import { BottomNav } from "./BottomNav";
import { Toaster } from "@/components/ui/sonner";

export function ShopLayout({ children }: { children: ReactNode }) {
  const fetchConfig = useServerFn(getStorefrontConfig);
  const { data: config } = useQuery({
    queryKey: ["storefront-config"],
    queryFn: () => fetchConfig(),
    staleTime: 60_000,
  });

  const themeCss = generateStorefrontThemeCss(config?.theme || DEFAULT_THEME_CONFIG);

  return (
    <div className="relative flex min-h-screen flex-col font-sans bg-background text-foreground transition-colors duration-300 selection:bg-amber-500 selection:text-black">
      {/* Dynamic Storefront Theme (Colors & Fonts) */}
      <style id="storefront-theme-override" dangerouslySetInnerHTML={{ __html: themeCss }} />

      {/* Vibrant Spicy African Culinary Background Texture */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src="/images/spicy-african-bg.png"
          alt="Spicy African Backdrop"
          className="h-full w-full object-cover opacity-25 dark:opacity-80 scale-105 animate-slow-pan transition-opacity duration-500"
        />
        {/* Scrim Overlay tailored for Light Ivory & Dark Obsidian Themes */}
        <div className="absolute inset-0 bg-linear-to-b from-background/80 via-background/40 to-background/90 dark:from-black/70 dark:via-black/40 dark:to-black/80 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-background/80 dark:to-black/70" />
      </div>

      <Header />
      <main className="flex-1 relative z-10 pb-16 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <Toaster richColors position="top-center" />
    </div>
  );
}
