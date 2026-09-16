import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LogOut,
  Store,
  Menu,
  Film,
  Image as ImageIcon,
  Settings,
  LayoutTemplate,
  FolderTree,
  Users,
  Truck,
  Camera,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, type ReactNode } from "react";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: "/portal", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/portal/storefront", label: "Storefront Builder", Icon: LayoutTemplate },
    { to: "/portal/orders", label: "Orders", Icon: ShoppingBag },
    { to: "/portal/products", label: "Products", Icon: Package },
    { to: "/portal/categories", label: "Categories", Icon: FolderTree },
    { to: "/portal/delivery", label: "Delivery & Logistics", Icon: Truck },
    { to: "/portal/users", label: "Users & Customers", Icon: Users },
    { to: "/portal/gallery", label: "Visual Gallery", Icon: Camera },
    { to: "/portal/hero", label: "Hero Video", Icon: Film },
    { to: "/portal/media", label: "Site Images Hub", Icon: ImageIcon },
    { to: "/portal/settings", label: "Settings", Icon: Settings },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const renderLink = (to: string, label: string, Icon: any, onClick?: () => void) => {
    const active = pathname === to;
    return (
      <Link
        key={to}
        to={to}
        onClick={onClick}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
          active
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" /> {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/85 px-4 backdrop-blur-md md:hidden">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white border border-amber-500/40 p-0.5 shadow-sm overflow-hidden shrink-0">
            <img
              src="/images/barima-ba-logo.png"
              alt="Barima Ba Shito Logo"
              className="h-full w-full object-contain rounded-md"
            />
          </div>
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            BARIMA BA <span className="text-amber-500">· Admin</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <Store className="h-3.5 w-3.5 text-amber-500" />
            <span>Store</span>
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg border border-border"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 flex flex-col justify-between p-0">
              <div className="flex-1 overflow-y-auto p-6">
                <SheetHeader className="pb-5 border-b text-left">
                  <SheetTitle className="flex items-center gap-2.5 text-left">
                    <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white border border-amber-500/40 p-0.5 shadow-sm overflow-hidden shrink-0">
                      <img
                        src="/images/barima-ba-logo.png"
                        alt="Barima Ba Shito Logo"
                        className="h-full w-full object-contain rounded-md"
                      />
                    </div>
                    <span className="font-display text-base font-bold tracking-tight text-foreground">
                      BARIMA BA <span className="text-amber-500">· Admin</span>
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-5 flex flex-col gap-1.5">
                  {navItems.map((item) =>
                    renderLink(item.to, item.label, item.Icon, () => setOpen(false)),
                  )}
                </nav>
              </div>
              <div className="border-t p-4 bg-muted/20">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl font-semibold"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="mx-auto flex max-w-7xl gap-8 px-3.5 py-4 sm:px-6 sm:py-8">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 md:flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-24 pb-4">
          <div>
            <Link to="/" className="mb-8 flex items-center gap-3 px-3">
              <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-white border border-amber-500/40 p-0.5 shadow-sm overflow-hidden shrink-0">
                <img
                  src="/images/barima-ba-logo.png"
                  alt="Barima Ba Shito Logo"
                  className="h-full w-full object-contain rounded-md"
                />
              </div>
              <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
                BARIMA BA <span className="text-amber-500">· Admin</span>
              </span>
            </Link>
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => renderLink(item.to, item.label, item.Icon))}
            </nav>
          </div>
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl font-semibold"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2.5 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        {/* Content Box with safe mobile bottom spacing */}
        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile Admin Bottom Bar for Quick 1-Tap Access */}
      <nav
        aria-label="Admin Mobile Quick Bar"
        className="fixed bottom-0 left-0 right-0 z-40 block border-t border-border bg-card/95 pb-safe backdrop-blur-xl md:hidden shadow-[0_-8px_20px_rgba(0,0,0,0.2)]"
      >
        <div className="grid h-15 grid-cols-5 items-center px-1">
          <Link
            to="/portal"
            className={`flex flex-col items-center justify-center py-1 text-[10px] transition-all ${
              pathname === "/portal" ? "text-amber-500 font-extrabold" : "text-muted-foreground"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 mb-0.5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/portal/orders"
            className={`flex flex-col items-center justify-center py-1 text-[10px] transition-all ${
              pathname === "/portal/orders"
                ? "text-amber-500 font-extrabold"
                : "text-muted-foreground"
            }`}
          >
            <ShoppingBag className="h-4 w-4 mb-0.5" />
            <span>Orders</span>
          </Link>

          <Link
            to="/portal/products"
            className={`flex flex-col items-center justify-center py-1 text-[10px] transition-all ${
              pathname === "/portal/products"
                ? "text-amber-500 font-extrabold"
                : "text-muted-foreground"
            }`}
          >
            <Package className="h-4 w-4 mb-0.5" />
            <span>Products</span>
          </Link>

          <Link
            to="/portal/storefront"
            className={`flex flex-col items-center justify-center py-1 text-[10px] transition-all ${
              pathname === "/portal/storefront"
                ? "text-amber-500 font-extrabold"
                : "text-muted-foreground"
            }`}
          >
            <LayoutTemplate className="h-4 w-4 mb-0.5" />
            <span>Storefront</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center py-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-4 w-4 mb-0.5 text-amber-500" />
            <span>More Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
