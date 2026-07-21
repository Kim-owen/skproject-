import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, ShoppingBag, LogOut, Store, Menu, Film, Image as ImageIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, type ReactNode } from "react";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: "/admin", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/admin/orders", label: "Orders", Icon: ShoppingBag },
    { to: "/admin/products", label: "Products", Icon: Package },
    { to: "/admin/hero", label: "Hero Video", Icon: Film },
    { to: "/admin/media", label: "Site Images Hub", Icon: ImageIcon },
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
            <img src="/images/barima-ba-logo.png" alt="Barima Ba Shito Logo" className="h-full w-full object-contain rounded-md" />
          </div>
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            BARIMA BA <span className="text-amber-500">· Admin</span>
          </span>
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg border border-border">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 flex flex-col justify-between">
            <div>
              <SheetHeader className="pb-6 border-b">
                <SheetTitle className="flex items-center gap-2.5 text-left">
                  <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white border border-amber-500/40 p-0.5 shadow-sm overflow-hidden shrink-0">
                    <img src="/images/barima-ba-logo.png" alt="Barima Ba Shito Logo" className="h-full w-full object-contain rounded-md" />
                  </div>
                  <span className="font-display text-base font-bold tracking-tight text-foreground">
                    BARIMA BA <span className="text-amber-500">· Admin</span>
                  </span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1.5">
                {navItems.map((item) => renderLink(item.to, item.label, item.Icon, () => setOpen(false)))}
              </nav>
            </div>
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Layout Container */}
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 md:flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-24 pb-4">
          <div>
            <Link to="/" className="mb-8 flex items-center gap-3 px-3">
              <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-white border border-amber-500/40 p-0.5 shadow-sm overflow-hidden shrink-0">
                <img src="/images/barima-ba-logo.png" alt="Barima Ba Shito Logo" className="h-full w-full object-contain rounded-md" />
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

        {/* Content Box */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
