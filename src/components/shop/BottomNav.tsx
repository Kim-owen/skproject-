import { Link, useRouterState } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, ShoppingBag, ShoppingCart, Truck, User, ShieldCheck } from "lucide-react";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { count } = useCart();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase
          .rpc("has_role", { _user_id: data.user.id, _role: "admin" })
          .then(({ data: hasAdmin }) => {
            setIsAdmin(!!hasAdmin);
          });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .rpc("has_role", { _user_id: session.user.id, _role: "admin" })
          .then(({ data: hasAdmin }) => {
            setIsAdmin(!!hasAdmin);
          });
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Don't show bottom nav inside portal/admin dashboard (Portal has its own mobile nav)
  if (pathname.startsWith("/portal") || pathname.startsWith("/admin")) {
    return null;
  }

  const navLinks = [
    { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    {
      to: "/shop",
      label: "Menu",
      icon: ShoppingBag,
      match: (p: string) => p.startsWith("/shop") || p.startsWith("/product/"),
    },
    {
      to: "/cart",
      label: "Cart",
      icon: ShoppingCart,
      badge: count > 0 ? count : null,
      match: (p: string) => p === "/cart" || p === "/checkout",
    },
    {
      to: "/track",
      label: "Track",
      icon: Truck,
      match: (p: string) => p.startsWith("/track") || p.startsWith("/order/"),
    },
    {
      to: user ? (isAdmin ? "/portal" : "/profile") : "/auth",
      label: user ? (isAdmin ? "Portal" : "Account") : "Sign In",
      icon: isAdmin ? ShieldCheck : User,
      match: (p: string) => p === "/profile" || p === "/auth" || p === "/orders" || p.startsWith("/portal"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block border-t border-amber-500/20 bg-background/95 pb-safe backdrop-blur-xl md:hidden shadow-[0_-8px_25px_rgba(0,0,0,0.3)] transition-all duration-200"
    >
      <div className="grid h-16 grid-cols-5 items-center px-1">
        {navLinks.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                isActive ? "text-amber-500 font-extrabold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? "bg-amber-500/20 text-amber-500 shadow-sm shadow-amber-500/30"
                      : ""
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[10px] font-black text-black shadow-md ring-2 ring-background animate-in zoom-in">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? "font-bold text-amber-500" : "font-medium"}`}>
                {item.label}
              </span>

              {isActive && (
                <span className="absolute bottom-0.5 h-1 w-5 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
