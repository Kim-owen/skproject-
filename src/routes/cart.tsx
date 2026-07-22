import { createFileRoute, Link } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/Layout";
import { useCart, formatGHS } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart — Provision Shop" }] }),
  component: CartPage,
});

function CartPage() {
  return (
    <ShopLayout>
      <CartPageInner />
    </ShopLayout>
  );
}

function CartPageInner() {
  const { items, setQty, remove, subtotal, count } = useCart();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Your cart</h1>
      {count === 0 ? (
        <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-secondary/60 via-card to-background p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary mint-glow">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold italic">Your cart is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Add fresh meat, poultry or pantry essentials and we'll deliver same day across Accra.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-2xl mint-glow">
              <Link to="/shop">
                Browse catalogue <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl">
              <Link to="/track">Track existing order</Link>
            </Button>
          </div>
          <div className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> 42 min average delivery today
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr,340px]">
          <ul className="space-y-3">
            {items.map((i) => (
              <li
                key={i.id}
                className="flex gap-4 rounded-2xl border border-white/10 bg-card/60 p-3 backdrop-blur transition-colors hover:border-primary/30"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {i.image_url && (
                    <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatGHS(i.price_ghs)} · per {i.unit}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      aria-label="Remove"
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-xl border border-white/10 bg-background/50">
                      <button
                        className="p-2 transition-colors hover:text-primary"
                        onClick={() => setQty(i.id, i.quantity - 1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold tabular-nums">
                        {i.quantity}
                      </span>
                      <button
                        className="p-2 transition-colors hover:text-primary"
                        onClick={() => setQty(i.id, i.quantity + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-display text-lg font-bold text-primary tabular-nums">
                      {formatGHS(i.price_ghs * i.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Summary</p>
            <dl className="mt-4 space-y-3 text-sm font-sans">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  {formatGHS(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <dt>Delivery</dt>
                <dd>Calculated at checkout</dd>
              </div>
              <div className="mt-3 border-t border-border pt-3 flex items-baseline justify-between">
                <dt className="text-sm text-muted-foreground font-semibold">Estimated total</dt>
                <dd className="font-display text-2xl font-bold text-primary tabular-nums">
                  {formatGHS(subtotal)}
                </dd>
              </div>
            </dl>

            <Button asChild size="lg" className="mt-6 w-full rounded-xl transition-all shadow-sm">
              <Link to="/checkout" className="flex items-center justify-center gap-1">
                Checkout <ArrowRight className="ml-1 h-4.5 w-4.5" />
              </Link>
            </Button>

            {/* Order via WhatsApp option */}
            {(() => {
              const whatsappNumber = "+233240000000";
              const formattedItems = items
                .map(
                  (item) =>
                    `- ${item.quantity} x ${item.name} (${item.unit}) - ${formatGHS(item.price_ghs * item.quantity)}`,
                )
                .join("\n");
              const messageText = encodeURIComponent(
                `Hello Provision Shop! I would like to place an order:\n\n${formattedItems}\n\nSubtotal: ${formatGHS(subtotal)}\n\nPlease assist me with checking out. Thank you!`,
              );
              const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\+/g, "")}?text=${messageText}`;

              return (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="mt-3 w-full rounded-xl border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 dark:text-emerald-400 font-semibold transition-all"
                >
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 2c-5.514 0-9.989 4.478-9.989 9.992 0 1.761.458 3.477 1.332 5.006L2 22l5.185-1.361c1.472.802 3.125 1.226 4.815 1.226 5.513 0 9.991-4.479 9.991-10.005C22.021 6.478 17.545 2 12.031 2zm6.177 14.28c-.273.769-1.353 1.4-1.859 1.492-.457.084-.961.168-3.048-.686-2.67-1.096-4.385-3.805-4.522-3.987-.137-.183-1.11-1.475-1.11-2.813 0-1.338.702-1.996.953-2.259.25-.262.548-.328.73-.328.183 0 .366.002.525.01.163.008.384-.061.602.463.224.538.769 1.874.836 2.012.067.138.113.298.02.482-.09.183-.138.298-.273.457-.137.159-.289.355-.412.476-.138.136-.282.285-.122.56.16.273.711 1.171 1.522 1.892.686.611 1.267.8 1.564.924.298.124.47-.023.642-.224.17-.202.73-.85 1.05-1.328.32-.477.639-.395 1.077-.233.438.163 2.784 1.313 2.876 1.359.093.047.155.07.224.183.07.113.07.659-.203 1.428z" />
                    </svg>
                    Order via WhatsApp
                  </a>
                </Button>
              );
            })()}
            <p className="mt-4 text-center text-[10px] tracking-wide text-muted-foreground font-sans uppercase">
              MoMo · Paystack · COD
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
