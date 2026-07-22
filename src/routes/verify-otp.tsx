import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { sendPhoneOTP, verifyPhoneOTP } from "@/lib/orders.functions";
import { supabase } from "@/integrations/supabase/client";
import { ShopLayout } from "@/components/shop/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Smartphone, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/verify-otp")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      phone: (search.phone as string) || "",
    };
  },
  head: () => ({ meta: [{ title: "Verify Phone Number — Barima Ba Foods" }] }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const { phone } = Route.useSearch();
  const navigate = useNavigate();
  const sendOtp = useServerFn(sendPhoneOTP);
  const verifyOtp = useServerFn(verifyPhoneOTP);

  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [timer, setTimer] = useState(60);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer logic
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Handle auto-focus and input routing for 6-digit verification pin box
  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return; // Allow single digits only

    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);

    // If entered a digit, shift focus to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace: shift focus back
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().slice(0, 6);
    if (!/^[0-9]{1,6}$/.test(pastedData)) return;

    const newValues = [...otpValues];
    for (let i = 0; i < pastedData.length; i++) {
      newValues[i] = pastedData[i];
    }
    setOtpValues(newValues);

    // Focus last filled input or next unfilled
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;
    setResending(true);
    try {
      await sendOtp({ data: { phone } });
      setTimer(60);
      toast.success("A fresh 6-digit verification code has been sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpValues.join("");
    if (fullCode.length < 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }

    setBusy(true);
    try {
      await verifyOtp({ data: { phone, code: fullCode } });
      toast.success("Phone number verified successfully!");

      // Update database profile verified flag
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase
          .from("profiles")
          .update({ is_phone_verified: true })
          .eq("id", userData.user.id);
      }

      navigate({ to: "/checkout" });
    } catch (err: any) {
      toast.error(err.message || "Verification code is incorrect or expired.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ShopLayout>
      <div className="mx-auto max-w-md px-4 py-20 space-y-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-amber-500 transition-all uppercase tracking-wider"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Account
        </button>

        <div className="rounded-3xl border border-amber-500/30 bg-zinc-950 p-6 sm:p-8 shadow-2xl text-white space-y-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Smartphone className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-2xl font-extrabold text-white">Verify Phone Number</h1>
            <p className="text-xs text-zinc-300 leading-relaxed">
              We have sent a 6-digit verification code to{" "}
              <span className="font-extrabold text-amber-400">{phone || "your number"}</span> via
              SMS.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                Enter Verification Code
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {otpValues.map((val, idx) => (
                  <Input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    className="h-14 text-center rounded-xl bg-zinc-900 border-zinc-700 text-white font-mono text-lg font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Code...
                </>
              ) : (
                "Verify & Complete →"
              )}
            </Button>
          </form>

          {/* Resend Countdown Controller */}
          <div className="text-center pt-2">
            {timer > 0 ? (
              <p className="text-[11px] text-zinc-400">
                Didn't receive the code? Resend in{" "}
                <span className="font-extrabold text-amber-400 font-mono">{timer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs font-extrabold text-amber-400 hover:text-amber-300 hover:underline transition-all uppercase tracking-wider flex items-center gap-1.5 mx-auto"
              >
                {resending ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" /> Sending...
                  </>
                ) : (
                  "Resend Code via SMS 🔁"
                )}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs space-y-2 text-foreground">
          <div className="flex items-center gap-2 font-bold text-amber-500">
            <ShieldCheck className="h-4 w-4" />
            <span>Secure SMS Verification</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Your verification ensures secure checkout transactions, instant refund routing, and live
            driver tracking notifications.
          </p>
        </div>
      </div>
    </ShopLayout>
  );
}
