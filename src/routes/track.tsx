import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [{ title: "Track your order" }] }),
  component: Track,
});

function Track() {
  const [num, setNum] = useState("");
  const navigate = useNavigate();
  return (
    <ShopLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold">Track your order</h1>
        <p className="mt-1 text-muted-foreground">Enter the order number we sent you.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (num.trim()) navigate({ to: "/order/$orderNumber", params: { orderNumber: num.trim() } });
          }}
        >
          <div>
            <Label htmlFor="on">Order number</Label>
            <Input id="on" placeholder="PS-XXXXXX" value={num} onChange={(e) => setNum(e.target.value.toUpperCase())} />
          </div>
          <Button type="submit" className="w-full">Track order</Button>
        </form>
      </div>
    </ShopLayout>
  );
}
