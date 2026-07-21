import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { sendPhoneOTP, verifyPhoneOTP } from "@/lib/orders.functions";
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
  LogOut,
  Phone,
  Smartphone,
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
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "otp">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);

  // Forgot Password & Recovery states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const sendOtp = useServerFn(sendPhoneOTP);
  const verifyOtp = useServerFn(verifyPhoneOTP);

  const [sessionUser, setSessionUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setSessionUser(data.user);
        supabase
          .from("profiles")
          .select("full_name, phone, wallet_balance_ghs")
          .eq("id", data.user.id)
          .single()
          .then(({ data: prof }) => {
            if (prof) setUserProfile(prof);
          });
        supabase
          .rpc("has_role", { _user_id: data.user.id, _role: "admin" })
          .then(({ data: isAdm }) => {
            if (isAdm) setIsAdminUser(true);
          });
      }
    });
  }, []);

  const handleSignOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setSessionUser(null);
    setUserProfile(null);
    setIsAdminUser(false);
    setBusy(false);
    toast.success("Signed out of your account successfully.");
  };

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
        setAuthError("Email not confirmed. Please sign in with your password or use Phone OTP.");
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

    if (!phone || phone.trim().length < 9) {
      setBusy(false);
      setAuthError("Please enter a valid phone number (e.g. 0241234567).");
      return;
    }

    if (password.length < 6) {
      setBusy(false);
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setBusy(false);
      setAuthError("Passwords do not match. Please verify your password entry.");
      return toast.error("Passwords do not match!");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, phone: phone },
      },
    });
    setBusy(false);

    if (error) {
      console.error("Sign-up error:", error);
      if (error.message.includes("User already registered")) {
        setAuthError("An account with this email or phone already exists. Please click Sign In.");
        setActiveTab("signin");
      } else {
        setAuthError(error.message);
      }
      return toast.error("Registration error. See details below.");
    }

    // Upsert profile phone & name
    if (data.user) {
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, full_name: name, phone: phone, is_phone_verified: false }, { onConflict: "id" });
      try {
        await sendOtp({ data: { phone } });
      } catch (smsErr) {
        console.error("SMS OTP signup error:", smsErr);
      }
    }

    if (data.session) {
      toast.success("Account created! Verify your phone number to continue.");
      navigate({ to: "/verify-otp", search: { phone } });
    } else {
      // Attempt immediate login so user is not blocked by unconfirmed email setting
      const loginRes = await supabase.auth.signInWithPassword({ email, password });
      if (loginRes.data.session) {
        toast.success("Account created! Verify your phone number to continue.");
        navigate({ to: "/verify-otp", search: { phone } });
      } else {
        toast.success("Account created! Please verify your phone number.");
        navigate({ to: "/verify-otp", search: { phone } });
      }
    }
  };

  // Handle Requesting SMS OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 9) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setOtpBusy(true);
    try {
      await sendOtp({ data: { phone } });
      toast.success(`Verification OTP sent to ${phone}`);
      navigate({ to: "/verify-otp", search: { phone } });
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP code");
    } finally {
      setOtpBusy(false);
    }
  };

  // Handle Verifying SMS OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }
    setOtpBusy(true);
    try {
      await verifyOtp({ data: { phone, code: otpCode } });
      toast.success("Phone verified successfully!");
      // If user already signed in or creating profile, navigate
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.from("profiles").update({ phone }).eq("id", data.user.id);
        navigate({ to: "/checkout" });
      } else {
        setActiveTab("signin");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP code");
    } finally {
      setOtpBusy(false);
    }
  };

  // Handle Forgot Password Email Request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = forgotEmail || email;
    if (!targetEmail || !targetEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth?type=recovery`,
    });
    setBusy(false);
    if (error) {
      setAuthError(error.message);
      toast.error(error.message);
    } else {
      setResetSent(true);
      toast.success("Password reset instructions sent to your email!");
    }
  };

  // Handle Recovery Password Update
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully! Please sign in with your new password.");
      setIsRecoveryMode(false);
      setShowForgotPassword(false);
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
          
          {sessionUser ? (
            <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-b from-zinc-900/90 via-black to-zinc-950 p-8 shadow-2xl backdrop-blur-xl space-y-6">
              
              {/* Signed In Header */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-black font-extrabold text-2xl shadow-xl ring-4 ring-amber-500/20">
                    {userProfile?.full_name ? userProfile.full_name[0].toUpperCase() : sessionUser.email[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black text-xs font-bold ring-2 ring-black">
                    ✓
                  </div>
                </div>

                <div>
                  <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-400 border border-amber-500/30 mb-1">
                    ACTIVE ACCOUNT
                  </span>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {userProfile?.full_name || sessionUser.user_metadata?.full_name || "Barima Ba Customer"}
                  </h1>
                  <p className="text-xs text-muted-foreground">{sessionUser.email}</p>
                </div>
              </div>

              {/* Profile Details & Wallet Summary Card */}
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-black p-4 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400 font-medium">Mobile Phone:</span>
                  <span className="font-bold font-mono text-amber-400">{userProfile?.phone || sessionUser.user_metadata?.phone || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Barima Ba Wallet:</span>
                  <span className="font-bold font-mono text-emerald-400 text-sm">₵{Number(userProfile?.wallet_balance_ghs || 0).toFixed(2)} GHS</span>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <Button asChild size="lg" className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 py-5">
                  <Link to="/checkout">
                    <span>Proceed to Order Checkout</span>
                    <span className="ml-1 text-base">→</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" size="lg" className="w-full rounded-2xl border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800 font-bold text-xs py-5">
                  <Link to="/shop">Explore Products Catalog</Link>
                </Button>

                {isAdminUser && (
                  <Button asChild variant="outline" size="lg" className="w-full rounded-2xl border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-extrabold text-xs py-5">
                    <Link to="/admin">Open Store Admin Panel</Link>
                  </Button>
                )}
              </div>

              {/* Redesigned Sign Out Button */}
              <div className="pt-3 border-t border-zinc-800">
                <Button
                  onClick={handleSignOut}
                  disabled={busy}
                  className="w-full rounded-2xl bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 font-extrabold text-xs py-5 gap-2"
                >
                  <LogOut className="h-4 w-4 text-red-400" />
                  <span>{busy ? "Signing out..." : "Sign Out of Account"}</span>
                </Button>
              </div>

            </div>
          ) : (
            /* Card Container for Unauthenticated Users */
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

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup" | "otp")} className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/60 p-1 mb-6 border">
                <TabsTrigger value="signin" className="rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">Register</TabsTrigger>
                <TabsTrigger value="otp" className="rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1">
                  <span>Phone OTP</span>
                </TabsTrigger>
              </TabsList>

              {/* SIGN IN */}
              <TabsContent value="signin" className="space-y-4">
                {!showForgotPassword ? (
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
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-[11px] font-bold text-amber-400 hover:underline"
                        >
                          Forgot password?
                        </button>
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
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4.5 border border-amber-500/30 rounded-2xl bg-amber-500/5 p-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-amber-400">Reset Your Password</h4>
                      <p className="text-xs text-muted-foreground">Enter your account email address and we'll send you a password reset link.</p>
                    </div>

                    {!resetSent ? (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="forgot-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="forgot-email"
                              type="email"
                              required
                              value={forgotEmail || email}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              placeholder="name@example.com"
                              className="pl-9 rounded-xl border-border bg-background text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} className="w-1/3 rounded-xl text-xs font-bold">
                            Cancel
                          </Button>
                          <Button type="submit" disabled={busy} className="w-2/3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs">
                            {busy ? "Sending..." : "Send Reset Link"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3 text-center">
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-semibold">
                          ✓ Reset link sent to <span className="font-bold text-white">{forgotEmail || email}</span>! Please check your inbox.
                        </div>
                        <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} className="w-full rounded-xl text-xs font-bold">
                          Return to Sign In
                        </Button>
                      </div>
                    )}
                  </form>
                )}
              </TabsContent>

              {/* REGISTER */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={signUp} className="space-y-4.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name *</Label>
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
                    <Label htmlFor="signup-phone" className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Phone Number (For OTP Verification) *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="024 123 4567"
                        className="pl-9 rounded-xl border-amber-500/40 bg-amber-500/5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address *</Label>
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

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password (Min 6) *</Label>
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
                          className="pl-9 pr-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-confirm-password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`pl-9 pr-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 text-sm ${
                            confirmPassword && password !== confirmPassword ? "border-red-500/80 bg-red-500/5" : ""
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md py-5.5 mt-2" disabled={busy}>
                    {busy ? "Registering Account..." : "Create Account (No Email Confirmation Required)"}
                  </Button>
                </form>
              </TabsContent>

              {/* PHONE OTP TAB */}
              <TabsContent value="otp" className="space-y-4">
                {!otpSent ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-phone" className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Ghanaian Mobile Number</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                        <Input
                          id="otp-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="024 123 4567"
                          className="pl-9 rounded-xl border-amber-500/40 bg-amber-500/5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-semibold"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">We will send a 6-digit SMS OTP code to your phone for instant verification.</p>
                    </div>

                    <Button type="submit" className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md py-5.5 mt-2" disabled={otpBusy}>
                      {otpBusy ? "Sending SMS OTP..." : "Send SMS Verification OTP"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4.5">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 text-center font-semibold">
                      SMS OTP Code sent to <span className="font-mono text-white font-bold">{phone}</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="otp-code" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Enter 6-Digit OTP Code</Label>
                      <Input
                        id="otp-code"
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="rounded-xl border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-center tracking-[0.5em] font-mono text-lg font-bold"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="w-1/3 rounded-xl text-xs" onClick={() => setOtpSent(false)}>
                        Change Phone
                      </Button>
                      <Button type="submit" className="w-2/3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-5.5" disabled={otpBusy}>
                        {otpBusy ? "Verifying..." : "Verify OTP Code"}
                      </Button>
                    </div>
                  </form>
                )}
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
          )}

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
