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
  ShieldCheck 
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — Provision Pal" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in successfully!");
    navigate({ to: "/admin" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email if confirmation is required.");
  };

  return (
    <ShopLayout>
      <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 md:py-20 overflow-hidden font-sans">
        
        {/* Subtle Ambient Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 h-[250px] w-[250px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 z-10">
          
          {/* Card Container */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
            
            {/* Header branding */}
            <div className="flex flex-col items-center text-center space-y-2 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 shadow-xs ring-4 ring-primary/5">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-xs text-muted-foreground max-w-[260px]">
                Sign in to manage inventory or track deliveries in real-time.
              </p>
            </div>

            <Tabs defaultValue="signin" className="w-full">
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
                        className="pl-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans text-sm"
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
                        className="pl-9 pr-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans text-sm"
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

                  <Button type="submit" className="w-full rounded-xl font-semibold shadow-md py-5.5 mt-2" disabled={busy}>
                    {busy ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* CREATE ACCOUNT */}
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
                        placeholder="Akwasi Mensah"
                        className="pl-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans text-sm"
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
                        placeholder="akwasi@example.com"
                        className="pl-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans text-sm"
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
                        className="pl-9 pr-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans text-sm"
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

                  <Button type="submit" className="w-full rounded-xl font-semibold shadow-md py-5.5 mt-2" disabled={busy}>
                    {busy ? "Registering..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          {/* Secure details footer */}
          <div className="flex flex-col items-center justify-center gap-4 text-center">
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
