import type { ReactNode } from "react";
import { Header, Footer } from "./Header";
import { Toaster } from "@/components/ui/sonner";

export function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster richColors position="top-center" />
    </div>
  );
}
