import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, LogIn, Sparkles } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useEffect, useRef, useState } from "react";

export function Header() {
  const { count } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [bump, setBump] = useState(false);
  const prev = useRef(count);
  useEffect(() => {
    if (count !== prev.current && count > 0) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);

  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors hover:text-primary ${
        pathname === to ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Provision<span className="text-primary">·Shop</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {link("/", "Home")}
          {link("/shop", "Shop")}
          {link("/track", "Track order")}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block"><ThemeToggle /></div>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link to="/auth"><LogIn className="mr-1 h-4 w-4" />Sign in</Link>
          </Button>
          <Button asChild size="sm" className="relative rounded-xl shadow-sm transition-all hover:opacity-95">
            <Link to="/cart">
              <ShoppingCart className="mr-1 h-4 w-4" />
              Cart
              {count > 0 && (
                <span
                  className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background/95 px-1.5 text-[10px] font-bold text-primary transition-transform ${bump ? "scale-125" : "scale-100"}`}
                >
                  {count}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">
                Provision<span className="text-primary">·Shop</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The curated pantry for modern living in Accra. Same-day delivery on meat, poultry, shito, grains and essentials.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Payments</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-sans">
              <li>Mobile Money · MTN, Telecel, AT</li>
              <li>Paystack · Card</li>
              <li>Cash on Delivery</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Coverage</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-sans">
              <li>Accra · Same-day</li>
              <li>East Legon · 30–60 min</li>
              <li>Spintex · 30–60 min</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row font-sans">
          <p>© {new Date().getFullYear()} Provision Shop · Built for category leaders.</p>
          <p>Accra, Ghana</p>
        </div>
      </div>
    </footer>
  );
}
