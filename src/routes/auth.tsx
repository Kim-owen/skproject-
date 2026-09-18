import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { sendPhoneOTP, verifyPhoneOTP, resolvePaystackAccount } from "@/lib/orders.functions";
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
  CheckCircle2,
  Sparkles,
  KeyRound,
  AlertCircle,
  Loader2,
} from "lucide-react";

const SUPER_ADMIN_EMAILS = [
  "admin@barimaba.com",
  "barimabafoods@gmail.com",
  "sunumanfred14@gmail.com",
  "barimabashito@gmail.com",
];

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — Barima Ba Foods" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [usePasswordLogin, setUsePasswordLogin] = useState(false);
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
  const resolveAccount = useServerFn(resolvePaystackAccount);

  const [resolvingPaystack, setResolvingPaystack] = useState(false);
  const [paystackVerifiedName, setPaystackVerifiedName] = useState<string | null>(null);
  const [paystackProvider, setPaystackProvider] = useState<string | null>(null);

  const handleVerifyWithPaystack = async (phoneToVerify?: string) => {
    const targetPhone = phoneToVerify || phone;
    const clean = (targetPhone || "").replace(/[^0-9]/g, "");
    if (clean.length < 9) {
      toast.error("Please enter a valid phone number (e.g. 024 123 4567).");
      return;
    }
    setResolvingPaystack(true);
    try {
      const res = await resolveAccount({ data: { phone: targetPhone } });
      if (res.success && res.account_name) {
        setName(res.account_name);
        setPaystackVerifiedName(res.account_name);
        setPaystackProvider(res.provider || "Mobile Money");
        toast.success(`Paystack Account Verified: ${res.account_name} (${res.provider})`);
      } else {
        toast.error(
          res.message || "Could not verify account name via Paystack. Please enter name manually.",
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify account via Paystack.");
    } finally {
      setResolvingPaystack(false);
    }
  };

  const [sessionUser, setSessionUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      const hash = window.location.hash;
      const search = window.location.search;

      if (
        url.includes("type=recovery") ||
        hash.includes("access_token=") ||
        search.includes("type=recovery")
      ) {
        setIsRecoveryMode(true);

        if (hash.includes("access_token=")) {
          const params = new URLSearchParams(hash.replace("#", "?"));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            supabase.auth
              .setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
              .then(({ data, error }) => {
                if (error) {
                  console.error("[Recovery] Error setting session from hash:", error);
                } else if (data.session) {
                  setIsRecoveryMode(true);
                  setSessionUser(data.session.user);
                }
              });
          }
        }
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        if (session?.user) setSessionUser(session.user);
      }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setSessionUser(data.user);
        supabase
          .from("profiles")
          .select("full_name, phone, wallet_balance_ghs")
          .eq("id", data.user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof) setUserProfile(prof);
          });

        const userEmail = data.user.email?.toLowerCase();
        if (userEmail && SUPER_ADMIN_EMAILS.includes(userEmail)) {
          setIsAdminUser(true);
        } else {
          supabase
            .rpc("has_role", { _user_id: data.user.id, _role: "admin" })
            .then(({ data: isAdm }) => {
              if (isAdm) setIsAdminUser(true);
            });
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
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

    let loginIdentifier = (email || phone).trim();
    if (!loginIdentifier.includes("@") && loginIdentifier.length >= 9) {
      const clean = loginIdentifier.replace(/[^0-9]/g, "");
      const formatted = clean.startsWith("0") ? `233${clean.slice(1)}` : clean;
      loginIdentifier = `${formatted}@phone.barimaba.com`;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginIdentifier,
      password,
    });
    setBusy(false);

    if (error) {
      console.error("Sign-in error:", error);
      if (error.message.includes("Invalid login credentials")) {
        setAuthError(
          "Invalid phone/email or password. Please verify your details or sign in with SMS code.",
        );
      } else if (error.message.includes("Email not confirmed")) {
        setAuthError("Account not confirmed. Please use SMS verification to sign in.");
      } else {
        setAuthError(error.message);
      }
      return toast.error("Sign-in failed. Please check credentials.");
    }

    const userId = data.user?.id;
    const userEmail = data.user?.email?.toLowerCase();
    toast.success("Welcome back! Signed in successfully.");
    if (userId) {
      const isSuperAdmin = userEmail && SUPER_ADMIN_EMAILS.includes(userEmail);
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (isSuperAdmin || isAdmin) {
        navigate({ to: "/portal" });
        return;
      }
    }
    navigate({ to: "/checkout" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAuthError(null);

    if (!name || name.trim().length < 2) {
      setBusy(false);
      setAuthError("Please enter your full name (minimum 2 characters).");
      return toast.error("Please enter your full name.");
    }

    if (!phone || phone.trim().length < 9) {
      setBusy(false);
      setAuthError("Please enter a valid Ghanaian phone number (e.g. 024 123 4567).");
      return toast.error("Please enter a valid phone number.");
    }

    try {
      await sendOtp({ data: { phone: phone.trim() } });
      toast.success(`6-digit SMS verification code sent to ${phone}`);
      navigate({
        to: "/verify-otp",
        search: { phone: phone.trim(), name: name.trim() },
      });
    } catch (smsErr: any) {
      console.error("SMS OTP signup error:", smsErr);
      setAuthError(
        smsErr.message || "Failed to send SMS verification code. Please check your phone number.",
      );
      toast.error(smsErr.message || "Failed to send SMS verification code.");
    } finally {
      setBusy(false);
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
      navigate({ to: "/verify-otp", search: { phone, name } });
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
      const res = await verifyOtp({
        data: {
          phone,
          code: otpCode,
          name: name ? name.trim() : undefined,
        },
      });
      toast.success("Phone verified successfully!");

      if (res?.token_hash) {
        try {
          await supabase.auth.verifyOtp({
            token_hash: res.token_hash,
            type: "magiclink",
          });
        } catch (authErr) {
          console.warn("[handleVerifyOtp] session token exchange warning:", authErr);
        }
      }

      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ phone, is_phone_verified: true })
          .eq("id", data.user.id);
      }
      navigate({ to: "/checkout" });
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

    try {
      const { requestPasswordResetLink } = await import("@/lib/email.functions");
      await requestPasswordResetLink({
        data: {
          email: targetEmail,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      setResetSent(true);
      toast.success("Password reset instructions sent to your email!");
    } catch (err: any) {
      console.warn(
        "[handleForgotPassword] Resend generator failed, attempting Supabase Auth SDK fallback:",
        err,
      );
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth?type=recovery`,
      });
      if (error) {
        setAuthError(error.message);
        toast.error(error.message);
      } else {
        setResetSent(true);
        toast.success("Password reset instructions sent to your email!");
      }
    } finally {
      setBusy(false);
    }
  };

  // Handle Recovery Password Update
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = forgotEmail || email;

    if (!targetEmail || !targetEmail.includes("@")) {
      toast.error("Please enter your account email address.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setBusy(true);
    setAuthError(null);

    try {
      // 1. Attempt client session update first
      const { error: clientErr } = await supabase.auth.updateUser({ password: newPassword });

      if (clientErr) {
        console.warn(
          "[handleResetPasswordSubmit] Client session update failed, attempting admin server reset:",
          clientErr.message,
        );
        // 2. Call server function fallback using service role admin API
        const { performPasswordReset } = await import("@/lib/email.functions");
        await performPasswordReset({ data: { email: targetEmail, newPassword } });
      }

      // 3. Immediately sign in with new credentials
      const signInRes = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: newPassword,
      });

      if (signInRes.data.session) {
        setSessionUser(signInRes.data.session.user);
        toast.success("Password updated & signed in successfully!");
      } else {
        toast.success("Password updated successfully! Please sign in with your new password.");
      }

      setIsRecoveryMode(false);
      setShowForgotPassword(false);
      setActiveTab("signin");
    } catch (err: any) {
      console.error("[handleResetPasswordSubmit] Error resetting password:", err);
      setAuthError(err.message || "Failed to reset password. Please check password rules.");
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ShopLayout>
      <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 md:py-20 overflow-hidden font-sans">
        {/* Ambient Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-87.5 w-87.5 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 h-62.5 w-62.5 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 z-10">
          {isRecoveryMode ? (
            <div className="rounded-3xl border border-amber-500/40 bg-linear-to-b from-zinc-900/90 via-black to-zinc-950 p-8 shadow-2xl backdrop-blur-xl space-y-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-1 border border-amber-500/40 shadow-lg">
                  <KeyRound className="h-7 w-7 text-amber-400" />
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Set New Account Password
                </h1>
                <p className="text-xs text-muted-foreground max-w-72">
                  Enter and confirm your new password below to recover your Barima Ba account.
                </p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Account Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      value={forgotEmail || email}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setEmail(e.target.value);
                      }}
                      placeholder="name@example.com"
                      className="pl-9 rounded-xl border-border bg-background text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 text-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md py-5.5 mt-2"
                >
                  {busy ? "Updating Password..." : "Update Password & Sign In"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRecoveryMode(false)}
                  className="w-full rounded-xl text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel & Return to Sign In
                </Button>
              </form>
            </div>
          ) : sessionUser ? (
            <div className="rounded-3xl border border-amber-500/40 bg-linear-to-b from-zinc-900/90 via-black to-zinc-950 p-8 shadow-2xl backdrop-blur-xl space-y-6">
              {/* Signed In Header */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-black font-extrabold text-2xl shadow-xl ring-4 ring-amber-500/20">
                    {userProfile?.full_name
                      ? userProfile.full_name[0].toUpperCase()
                      : sessionUser.email[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black text-xs font-bold ring-2 ring-black">
                    ✓
                  </div>
                </div>

                <div>
                  <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-400 border border-amber-500/30 mb-1">
                    ACTIVE ACCOUNT
                  </span>
                  <h1 className="font-display text-2xl font-bold text-foreground capitalize">
                    {userProfile?.full_name && userProfile.full_name !== "Customer"
                      ? userProfile.full_name
                      : sessionUser.user_metadata?.full_name &&
                          sessionUser.user_metadata.full_name !== "Customer"
                        ? sessionUser.user_metadata.full_name
                        : "Valued Customer"}
                  </h1>
                  <p className="text-xs text-muted-foreground font-mono">
                    {sessionUser.email?.includes("@phone.barimaba.com")
                      ? userProfile?.phone ||
                        sessionUser.user_metadata?.phone ||
                        (() => {
                          const p = sessionUser.email.replace("@phone.barimaba.com", "");
                          const clean = p.replace(/[^0-9]/g, "");
                          return clean.startsWith("233")
                            ? `+233 ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`
                            : p;
                        })()
                      : sessionUser.email}
                  </p>
                </div>
              </div>

              {/* Profile Details & Wallet Summary Card */}
              <div className="rounded-2xl border border-amber-500/30 bg-linear-to-r from-amber-500/10 via-zinc-900 to-black p-4 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400 font-medium">Mobile Phone:</span>
                  <span className="font-bold font-mono text-amber-400">
                    {userProfile?.phone || sessionUser.user_metadata?.phone || "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Barima Ba Wallet:</span>
                  <span className="font-bold font-mono text-emerald-400 text-sm">
                    ₵{Number(userProfile?.wallet_balance_ghs || 0).toFixed(2)} GHS
                  </span>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 py-5"
                >
                  <Link to="/checkout">
                    <span>Proceed to Order Checkout</span>
                    <span className="ml-1 text-base">→</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full rounded-2xl border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800 font-bold text-xs py-5"
                >
                  <Link to="/shop">Explore Products Catalog</Link>
                </Button>

                {isAdminUser && (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="w-full rounded-2xl border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-extrabold text-xs py-5"
                  >
                    <Link to="/portal">Open Store Manager Portal</Link>
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
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Barima Ba Account
                </h1>
                <p className="text-xs text-muted-foreground max-w-70">
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

              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "signin" | "signup")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/60 p-1 mb-6 border">
                  <TabsTrigger
                    value="signin"
                    className="rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

                {/* SIGN IN */}
                <TabsContent value="signin" className="space-y-4">
                  {!showForgotPassword ? (
                    !usePasswordLogin ? (
                      <form onSubmit={handleRequestOtp} className="space-y-4.5">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="signin-phone"
                            className="text-[10px] font-bold uppercase tracking-wider text-amber-500"
                          >
                            Ghanaian Mobile Phone Number *
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                            <Input
                              id="signin-phone"
                              type="tel"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="024 123 4567"
                              className="pl-9 rounded-xl border-amber-500/40 bg-amber-500/5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-semibold"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Enter your phone number to receive a 6-digit SMS verification code.
                          </p>
                        </div>

                        <Button
                          type="submit"
                          className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md py-5.5 mt-2 cursor-pointer transition-all"
                          disabled={otpBusy}
                        >
                          {otpBusy ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Sending SMS Code...</span>
                            </div>
                          ) : (
                            "Send SMS Login Code"
                          )}
                        </Button>

                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => setUsePasswordLogin(true)}
                            className="text-xs text-muted-foreground hover:text-amber-400 font-semibold transition-colors cursor-pointer"
                          >
                            Store Manager / Admin? Sign in with password
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={signIn} className="space-y-4.5">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="signin-email"
                            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                          >
                            Admin Email or Phone
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="signin-email"
                              type="text"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="admin@barimaba.com or 0241234567"
                              className="pl-9 rounded-xl border-border bg-background focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="signin-password"
                              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                            >
                              Password
                            </Label>
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
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md py-5.5 mt-2 cursor-pointer"
                          disabled={busy}
                        >
                          {busy ? "Signing in..." : "Sign In with Password"}
                        </Button>

                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => setUsePasswordLogin(false)}
                            className="text-xs text-amber-400 hover:underline font-semibold transition-colors cursor-pointer"
                          >
                            ← Back to SMS Login (Default)
                          </button>
                        </div>
                      </form>
                    )
                  ) : (
                    <form
                      onSubmit={handleForgotPassword}
                      className="space-y-4.5 border border-amber-500/30 rounded-2xl bg-amber-500/5 p-4"
                    >
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-amber-400">Reset Your Password</h4>
                        <p className="text-xs text-muted-foreground">
                          Enter your account email address and we'll send you a password reset link.
                        </p>
                      </div>

                      {!resetSent ? (
                        <>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="forgot-email"
                              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                            >
                              Account Email Address
                            </Label>
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
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowForgotPassword(false)}
                              className="w-1/3 rounded-xl text-xs font-bold"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={busy}
                              className="w-2/3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs"
                            >
                              {busy ? "Sending..." : "Send Reset Link"}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3 text-center">
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-semibold">
                            ✓ Reset link sent to{" "}
                            <span className="font-bold text-white">{forgotEmail || email}</span>!
                            Please check your inbox.
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowForgotPassword(false)}
                            className="w-full rounded-xl text-xs font-bold"
                          >
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
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="signup-name"
                          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          Full Name *
                        </Label>
                        {paystackVerifiedName && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Paystack Verified
                          </span>
                        )}
                      </div>
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
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="signup-phone"
                          className="text-[10px] font-bold uppercase tracking-wider text-amber-500"
                        >
                          Ghanaian Mobile Phone Number *
                        </Label>
                        <button
                          type="button"
                          onClick={() => handleVerifyWithPaystack()}
                          disabled={resolvingPaystack || !phone || phone.trim().length < 9}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 cursor-pointer"
                        >
                          {resolvingPaystack ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Verifying...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" /> Verify via MoMo (Paystack)
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                        <Input
                          id="signup-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (paystackVerifiedName) setPaystackVerifiedName(null);
                          }}
                          placeholder="024 123 4567"
                          className="pl-9 rounded-xl border-amber-500/40 bg-amber-500/5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-semibold"
                        />
                      </div>
                      {paystackVerifiedName ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-300 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            <div>
                              <span className="font-bold text-white block">
                                {paystackVerifiedName}
                              </span>
                              <span className="text-[10px] text-emerald-400">
                                {paystackProvider} Account Verified
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Paystack
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Enter your MoMo number. Click "Verify via MoMo" to auto-fetch your legal
                          account name from Paystack.
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-md py-5.5 mt-2 transition-all cursor-pointer"
                      disabled={busy}
                    >
                      {busy ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending Verification Code...</span>
                        </div>
                      ) : (
                        "Register & Verify Phone Number (SMS OTP)"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Footer details */}
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> SECURED BY SUPABASE SSL
            </p>
            <Link
              to="/"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to shop
            </Link>
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
