import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShopLayout } from "@/components/shop/Layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Mail, 
  Lock, 
  User, 
  ArrowLeft, 
  ShoppingBag, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Sparkles,
  KeyRound,
  AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — Barima Ba Foods" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      console.error("Sign-in error:", error);
      if (error.message.includes("Invalid login credentials")) {
        setAuthError("Invalid email or password. Please verify your details or register a new account.");
      } else if (error.message.includes("Email not confirmed")) {
        setAuthError("Email not confirmed. Please check your inbox or try registered credentials.");
      } else {
        setAuthError(error.message);
      }
      return toast.error("Sign-in failed. Please check credentials.");
    }

    const userId = data.user?.id;
    toast.success("Welcome back! Signed in successfully.");
    if (userId) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (isAdmin) {
        navigate({ to: "/admin" });
        return;
      }
    }
    navigate({ to: "/checkout" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAuthError(null);

    if (password.length < 6) {
      setBusy(false);
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setBusy(false);

    if (error) {
      console.error("Sign-up error:", error);
      if (error.message.includes("User already registered")) {
        setAuthError("An account with this email already exists. Please click Sign In.");
        setActiveTab("signin");
      } else {
        setAuthError(error.message);
      }
      return toast.error("Registration error. See details below.");
    }

    if (data.session) {
      toast.success("Account created & logged in!");
      navigate({ to: "/checkout" });
    } else if (data.user) {
      toast.success("Account created successfully! Now sign in with your password.");
      setActiveTab("signin");
    }
  };

  // Quick Demo Admin Login Helper
  const quickDemoLogin = async () => {
    const demoEmail = "admin@barimaba.com";
    const demoPass = "BarimaBa2026!";
    setEmail(demoEmail);
    setPassword(demoPass);
    setBusy(true);
    setAuthError(null);

    // Try signing in with demo account
    let { data, error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPass,
    });

    // If demo user doesn't exist yet, create it
    if (error && error.message.includes("Invalid login credentials")) {
      const res = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPass,
        options: { data: { full_name: "Barima Ba Admin" } },
      });
      if (res.data.session) {
        toast.success("Demo Admin created & signed in!");
        setBusy(false);
        return navigate({ to: "/admin" });
      }
      // Re-try signin
      const res2 = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPass,
      });
      data = res2.data;
      error = res2.error;
    }

    setBusy(false);
    if (error) {
      toast.error(error.message);
      setAuthError(error.message);
    } else {
      toast.success("Logged in as Demo Store Manager!");
      navigate({ to: "/admin" });
    }
  };

  return (
    <ShopLayout>
      <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 md:py-20 overflow-hidden font-sans">
        
        {/* Ambient Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 h-[250px] w-[250px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 z-10">
          
          {/* Card Container */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
            
            {/* Header branding */}
            <div className="flex flex-col items-center text-center space-y-2 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-2 shadow-xs ring-4 ring-amber-500/5">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Barima Ba Account</h1>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Sign in or register to manage orders, track deliveries, and access admin controls.
              </p>
            </div>

            {/* Auth Error Banner */}
            {authError && (
              <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-white">Authentication Note</span>
                  <span>{authError}</span>
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/60 p-1 mb-6 border">
                <TabsTrigger value="signin" className="rounded-lg text-xs font-bold uppercase tracking-wider transition-all">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-xs font-bold uppercase tracking-wider transition-all">Register</TabsTrigger>
              </TabsList>

              {/* SIGN IN */}
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={signIn} className="space-y-4.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="pl-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 pr-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md py-5.5 mt-2" disabled={busy}>
                    {busy ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* REGISTER */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={signUp} className="space-y-4.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Kwame Mensah"
                        className="pl-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="kwame@example.com"
                        className="pl-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password (Min. 6 chars)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 pr-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md py-5.5 mt-2" disabled={busy}>
                    {busy ? "Registering..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Quick Demo Login Option */}
            <div className="mt-6 pt-4 border-t border-border text-center">
              <Button
                type="button"
                variant="outline"
                onClick={quickDemoLogin}
                className="w-full rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-bold text-xs gap-2 py-4"
                disabled={busy}
              >
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>1-Click Store Manager Login (Demo)</span>
              </Button>
            </div>
          </div>

          {/* Footer details */}
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> SECURED BY SUPABASE SSL
            </p>
            <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to shop
            </Link>
          </div>

        </div>
      </div>
    </ShopLayout>
  );
}
