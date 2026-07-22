import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Search, Truck, ShieldCheck, Phone } from "lucide-react";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [{ title: "Track Uber Delivery — Barima Ba Foods" }] }),
  component: Track,
});

function Track() {
  const [num, setNum] = useState("");
  const navigate = useNavigate();
  return (
    <ShopLayout>
      <div className="mx-auto max-w-md px-4 py-16 space-y-6">
        <div className="rounded-3xl border border-amber-500/30 bg-zinc-950 p-6 sm:p-8 shadow-2xl text-white space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Truck className="h-6 w-6" />
          </div>

          <div>
            <h1 className="font-display text-2xl font-extrabold text-white">
              Track Order Delivery
            </h1>
            <p className="mt-1 text-xs text-zinc-300">
              Enter your order reference code (e.g., PS-12345678) to track your Uber rider and
              kitchen status in real time.
            </p>
          </div>

          <form
            className="space-y-4 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (num.trim())
                navigate({ to: "/order/$orderNumber", params: { orderNumber: num.trim() } });
            }}
          >
            <div>
              <Label
                htmlFor="on"
                className="text-xs font-bold uppercase tracking-wider text-amber-400"
              >
                Order Reference Number
              </Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="on"
                  placeholder="e.g. PS-A1B2C3D4"
                  value={num}
                  onChange={(e) => setNum(e.target.value.toUpperCase())}
                  className="pl-10 h-12 rounded-xl bg-zinc-900 border-zinc-700 text-white font-mono text-sm tracking-wider focus:border-amber-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-sm py-6 shadow-lg shadow-amber-500/20"
            >
              Track Live Delivery →
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs space-y-2 text-foreground">
          <div className="flex items-center gap-2 font-bold text-amber-500">
            <ShieldCheck className="h-4 w-4" />
            <span>Need Immediate Help with Uber Rider?</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Need to update your delivery address or contact customer support? Call or WhatsApp our
            hotline directly at{" "}
            <a
              href="https://wa.me/233241234567"
              target="_blank"
              rel="noreferrer"
              className="font-extrabold text-amber-500 hover:underline"
            >
              +233 24 123 4567
            </a>
            .
          </p>
        </div>
      </div>
    </ShopLayout>
  );
}
