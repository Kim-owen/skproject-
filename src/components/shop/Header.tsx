import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, LogIn, LogOut, User, Crown, Phone, Instagram, Menu, X, Truck, ChevronDown, Camera, Star, HelpCircle, PackageCheck, Utensils, Shield } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Header() {
  const { count } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [bump, setBump] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const prev = useRef(count);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAuthUser(data.user);
        setUserName(data.user.user_metadata?.full_name || "");
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        setUserName(session.user.user_metadata?.full_name || "");
      } else {
        setAuthUser(null);
        setUserName("");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setUserMenuOpen(false);
    setMobileOpen(false);
    toast.success("Signed out successfully");
    navigate({ to: "/" });
  };

  useEffect(() => {
    if (count !== prev.current && count > 0) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      className={`text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:text-amber-400 py-1 ${
        pathname === to ? "text-amber-400 font-extrabold border-b-2 border-amber-400" : "text-foreground/80 hover:scale-105"
      }`}
    >
      {label}
    </Link>
  );

  const drawerNavLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold tracking-wide transition-all ${
        pathname === to
          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          : "text-zinc-200 hover:bg-zinc-900 hover:text-amber-400"
      }`}
    >
      <span>{label}</span>
      <span className="text-amber-400/60">→</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-amber-500/20 bg-background/95 backdrop-blur-xl transition-all shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand Logo & Client Barima Ba Chef Emblem */}
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-11 w-14 items-center justify-center rounded-xl bg-white border border-amber-500/50 p-1 shadow-lg shadow-amber-500/20 transition-transform group-hover:scale-105 overflow-hidden">
            <img
              src="/images/barima-ba-logo.png"
              alt="Barima Ba Shito Logo"
              className="h-full w-full object-contain rounded-md"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-extrabold tracking-tight text-foreground leading-none">
              BARIMA BA <span className="text-amber-500">FOODS</span>
            </span>
            <span className="text-[10px] font-serif italic text-amber-500/90 tracking-wider mt-0.5">
              Taste. Quality. Trust.
            </span>
          </div>
        </Link>

        {/* Clean Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          {navLink("/", "Home")}
          {navLink("/shop", "Products")}
          {navLink("/catering", "Catering")}
          {navLink("/about", "About")}

          {/* More / Explore Glassmorphic Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground/80 hover:text-amber-400 py-1 transition-colors focus:outline-none"
            >
              <span>Explore</span>
              <ChevronDown className={`h-3.5 w-3.5 text-amber-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 rounded-2xl border border-amber-500/30 bg-black/90 p-2 backdrop-blur-2xl shadow-2xl animate-fade-in-up z-50">
                <Link
                  to="/gallery"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-2.5 text-xs font-semibold text-zinc-200 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
                >
                  <Camera className="h-4 w-4 text-amber-400" />
                  <span>Visual Gallery</span>
                </Link>
                <Link
                  to="/testimonials"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-2.5 text-xs font-semibold text-zinc-200 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
                >
                  <Star className="h-4 w-4 text-amber-400" />
                  <span>Testimonials</span>
                </Link>
                <Link
                  to="/faq"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-2.5 text-xs font-semibold text-zinc-200 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
                >
                  <HelpCircle className="h-4 w-4 text-amber-400" />
                  <span>FAQ & Help</span>
                </Link>
                <Link
                  to="/track"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-2.5 text-xs font-semibold text-zinc-200 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
                >
                  <PackageCheck className="h-4 w-4 text-amber-400" />
                  <span>Track Delivery</span>
                </Link>
              </div>
            )}
          </div>

          {navLink("/contact", "Contact")}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block"><ThemeToggle /></div>

          {authUser ? (
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-extrabold text-amber-400 hover:bg-amber-500/25 transition-all shadow-sm"
              >
                <User className="h-3.5 w-3.5 text-amber-400" />
                <span className="max-w-[110px] truncate">{userName || authUser.email?.split("@")[0]}</span>
                <ChevronDown className={`h-3 w-3 text-amber-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-amber-500/30 bg-zinc-950/95 p-2.5 backdrop-blur-2xl shadow-2xl z-50 animate-fade-in-up">
                  <div className="border-b border-zinc-800 pb-2 mb-2 px-2">
                    <span className="block text-xs font-extrabold text-amber-400 truncate">{userName || "Barima Ba Customer"}</span>
                    <span className="block text-[10px] text-zinc-400 truncate">{authUser.email}</span>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl p-2 text-xs font-bold text-zinc-200 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
                  >
                    <User className="h-4 w-4 text-amber-400" />
                    <span>My Account & Wallet</span>
                  </Link>
                  <Link
                    to="/track"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl p-2 text-xs font-bold text-zinc-200 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
                  >
                    <PackageCheck className="h-4 w-4 text-amber-400" />
                    <span>Track My Delivery</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 rounded-xl p-2 text-xs font-extrabold text-red-400 hover:bg-red-500/15 transition-all mt-1"
                  >
                    <LogOut className="h-4 w-4 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl text-muted-foreground hover:text-foreground hover:bg-amber-500/10 text-xs font-bold">
              <Link to="/auth"><LogIn className="mr-1.5 h-4 w-4 text-amber-500" />Sign In</Link>
            </Button>
          )}
          <Button asChild size="sm" className="relative rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold shadow-lg shadow-amber-500/20 transition-all hover:scale-102">
            <Link to="/cart">
              <ShoppingCart className="mr-1.5 h-4 w-4 fill-black" />
              Order Now
              {count > 0 && (
                <span
                  className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-[10px] font-extrabold text-amber-400 shadow-sm transition-transform ${bump ? "scale-125 ring-2 ring-amber-400" : "scale-100"}`}
                >
                  {count}
                </span>
              )}
            </Link>
          </Button>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-foreground hover:text-amber-500 focus:outline-none rounded-xl border border-amber-500/20 bg-background/50"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X className="h-6 w-6 text-amber-400" /> : <Menu className="h-6 w-6 text-foreground" />}
          </button>
        </div>
      </div>

      {/* Premium Full-Screen Mobile Navigation Overlay (iOS & Android Optimized) */}
      {mobileOpen && (
        <div className="fixed inset-0 top-0 left-0 z-[100] h-[100dvh] w-full md:hidden bg-zinc-950 p-5 sm:p-7 overflow-y-auto animate-fade-in text-white flex flex-col justify-between">
          <div>
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 mb-6">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                <div className="flex h-11 w-14 items-center justify-center rounded-xl bg-white border border-amber-500/50 p-1 shadow-md shrink-0 overflow-hidden">
                  <img
                    src="/images/barima-ba-logo.png"
                    alt="Barima Ba Shito Logo"
                    className="h-full w-full object-contain rounded-md"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-lg font-extrabold tracking-tight text-white leading-none">
                    BARIMA BA <span className="text-amber-400">FOODS</span>
                  </span>
                  <span className="text-[10px] font-serif italic text-amber-400/90 tracking-wider mt-0.5">
                    Taste. Quality. Trust.
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                <div className="bg-zinc-900/90 rounded-xl p-1 border border-amber-500/30">
                  <ThemeToggle />
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-amber-400 hover:bg-amber-500/20 focus:outline-none transition-colors"
                  aria-label="Close Menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Primary Menu Categories */}
            <div className="space-y-2 mb-6">
              <div className="px-1 pb-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-400/80">Main Navigation</div>

              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-2xl p-3.5 transition-all ${
                  pathname === "/"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg"
                    : "bg-zinc-900/60 text-zinc-100 border border-zinc-800/80 hover:bg-zinc-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">Home</div>
                    <div className="text-[11px] text-zinc-400">Welcome & Hero Showcase</div>
                  </div>
                </div>
                <span className="text-amber-400 text-sm">→</span>
              </Link>

              <Link
                to="/shop"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-2xl p-3.5 transition-all ${
                  pathname === "/shop"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg"
                    : "bg-zinc-900/60 text-zinc-100 border border-zinc-800/80 hover:bg-zinc-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">Products Catalog</div>
                    <div className="text-[11px] text-zinc-400">Shito Jars, Meats & Delicacies</div>
                  </div>
                </div>
                <span className="text-amber-400 text-sm">→</span>
              </Link>

              <Link
                to="/catering"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-2xl p-3.5 transition-all ${
                  pathname === "/catering"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg"
                    : "bg-zinc-900/60 text-zinc-100 border border-zinc-800/80 hover:bg-zinc-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                    <Utensils className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">Catering Services</div>
                    <div className="text-[11px] text-zinc-400">Events, Weddings & Parties</div>
                  </div>
                </div>
                <span className="text-amber-400 text-sm">→</span>
              </Link>

              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-2xl p-3.5 transition-all ${
                  pathname === "/about"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg"
                    : "bg-zinc-900/60 text-zinc-100 border border-zinc-800/80 hover:bg-zinc-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">About Barima Ba</div>
                    <div className="text-[11px] text-zinc-400">Our Story & Quality Guarantee</div>
                  </div>
                </div>
                <span className="text-amber-400 text-sm">→</span>
              </Link>
            </div>

            {/* Explore Grid */}
            <div className="mb-6">
              <div className="px-1 pb-2 text-[11px] font-extrabold uppercase tracking-widest text-amber-400/80">Explore More</div>
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/gallery"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3 text-xs font-bold text-zinc-200 hover:border-amber-500/40 hover:text-amber-400 transition-all"
                >
                  <Camera className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Gallery</span>
                </Link>
                <Link
                  to="/testimonials"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3 text-xs font-bold text-zinc-200 hover:border-amber-500/40 hover:text-amber-400 transition-all"
                >
                  <Star className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Reviews</span>
                </Link>
                <Link
                  to="/faq"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3 text-xs font-bold text-zinc-200 hover:border-amber-500/40 hover:text-amber-400 transition-all"
                >
                  <HelpCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>FAQ & Help</span>
                </Link>
                <Link
                  to="/track"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3 text-xs font-bold text-zinc-200 hover:border-amber-500/40 hover:text-amber-400 transition-all"
                >
                  <PackageCheck className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Track Order</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="pt-4 border-t border-amber-500/20 space-y-3">
            <Button asChild size="lg" className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-extrabold text-sm py-6 shadow-xl shadow-amber-500/25 hover:scale-102 transition-transform">
              <Link to="/cart" onClick={() => setMobileOpen(false)}>
                <ShoppingCart className="mr-2 h-5 w-5 fill-black" />
                ORDER NOW ({count} ITEMS)
              </Link>
            </Button>

            <a
              href="https://wa.me/233241234567"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-zinc-900/90 py-3 text-xs font-extrabold text-amber-400 hover:bg-amber-500/10 transition-colors shadow-inner"
            >
              <Phone className="h-4 w-4 text-amber-400" />
              <span>Call / WhatsApp: +233 24 123 4567</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="border-t-2 border-amber-500/30 bg-zinc-950 text-white font-sans relative z-10">
      {/* 1. Gold Delivery & Contact Bar */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-4 text-black shadow-lg">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-amber-400 shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm uppercase tracking-wide text-black">NATIONWIDE DELIVERY</p>
              <p className="text-xs font-semibold text-zinc-900">We deliver to your doorstep anywhere in Ghana.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-amber-400 shrink-0">
              <Phone className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-900">CALL / WHATSAPP</p>
              <p className="text-sm font-extrabold text-black">+233 24 123 4567 | +233 50 123 4567</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-amber-400 shrink-0">
              <Instagram className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-900">FOLLOW US</p>
              <p className="text-sm font-extrabold text-black">@barimabafoods</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 4-Column Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Column 1: About Us */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-white border border-amber-500/50 p-1 shadow-md overflow-hidden shrink-0">
                <img
                  src="/images/barima-ba-logo.png"
                  alt="Barima Ba Shito Logo"
                  className="h-full w-full object-contain rounded-md"
                />
              </div>
              <span className="font-display text-2xl font-extrabold tracking-tight text-white">
                BARIMA BA <span className="text-amber-400">FOODS</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-zinc-200">
              Barima Ba Foods is a Ghanaian food brand committed to delivering premium quality, authentic and delicious foods. We value quality, hygiene and customer satisfaction in everything we do.
            </p>
            <div className="pt-2">
              <Button asChild size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs px-5">
                <Link to="/about">LEARN MORE</Link>
              </Button>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-400 mb-4 border-b border-amber-500/20 pb-2">Quick Links</p>
            <ul className="space-y-2 text-xs font-semibold text-zinc-200">
              <li><Link to="/" className="hover:text-amber-400 transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-amber-400 transition-colors">About Us</Link></li>
              <li><Link to="/shop" className="hover:text-amber-400 transition-colors">Products</Link></li>
              <li><Link to="/catering" className="hover:text-amber-400 transition-colors">Catering Services</Link></li>
              <li><Link to="/gallery" className="hover:text-amber-400 transition-colors">Gallery</Link></li>
              <li><Link to="/testimonials" className="hover:text-amber-400 transition-colors">Testimonials</Link></li>
              <li><Link to="/faq" className="hover:text-amber-400 transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-amber-400 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Care */}
          <div className="md:col-span-3">
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-400 mb-4 border-b border-amber-500/20 pb-2">Customer Care</p>
            <ul className="space-y-2 text-xs font-semibold text-zinc-200">
              <li><Link to="/track" className="hover:text-amber-400 transition-colors">Shipping & Delivery</Link></li>
              <li><Link to="/faq" className="hover:text-amber-400 transition-colors">Returns & Refunds</Link></li>
              <li><Link to="/faq" className="hover:text-amber-400 transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/faq" className="hover:text-amber-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-400 border-b border-amber-500/20 pb-2">Newsletter</p>
            <p className="text-xs text-zinc-200 leading-relaxed">
              Subscribe to get updates on new products, promotions and more.
            </p>

            {subscribed ? (
              <p className="text-xs font-bold text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                ✓ Thank you for subscribing to Barima Ba Foods!
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-amber-500/30 bg-zinc-900 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                />
                <Button type="submit" size="sm" className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs">
                  SUBSCRIBE
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* 3. Bottom Legal Copyright Bar */}
        <div className="mt-12 border-t border-amber-500/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-black font-extrabold text-xs">
              👑
            </div>
            <span className="font-display font-extrabold text-sm text-white">BARIMA BA FOODS</span>
          </div>
          <p className="text-xs font-medium text-zinc-300 text-center sm:text-left">
            © {new Date().getFullYear()} Barima Ba Foods · Taste. Quality. Trust. All rights reserved.
          </p>
          <span className="text-xs font-extrabold text-amber-400 tracking-wider">Accra, Ghana</span>
        </div>
      </div>
    </footer>
  );
}
