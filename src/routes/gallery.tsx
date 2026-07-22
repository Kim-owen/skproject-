import { createFileRoute } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/Layout";
import { Sparkles, Camera } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/gallery")({
  component: GalleryPage,
});

const GALLERY_ITEMS = [
  {
    id: 1,
    title: "Signature Shito Animi Jars",
    category: "Shito",
    img: "/images/product-shito-jars.png",
  },
  {
    id: 2,
    title: "Seasoned Tender Beef Chunks",
    category: "Meats",
    img: "/images/product-beef-chunks.png",
  },
  {
    id: 3,
    title: "Royal Wedding Catering Setup",
    category: "Catering",
    img: "/images/catering-wedding-table.png",
  },
  {
    id: 4,
    title: "Fresh Green Chilli Pepper Sauce",
    category: "Sauces",
    img: "/images/product-green-chilli.png",
  },
  {
    id: 5,
    title: "Crispy Seasoned Chicken Chunks",
    category: "Meats",
    img: "/images/product-chicken-chunks.png",
  },
  {
    id: 6,
    title: "Corporate Banquet Buffet",
    category: "Catering",
    img: "/images/catering-chafing-buffet.png",
  },
];

function GalleryPage() {
  const [activeTab, setActiveTab] = useState("All");

  const categories = ["All", "Shito", "Meats", "Sauces", "Catering"];

  const filtered =
    activeTab === "All"
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === activeTab);

  return (
    <ShopLayout>
      {/* Hero Header */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold tracking-widest uppercase text-amber-400 mb-6">
            <Camera className="h-4 w-4" />
            <span>VISUAL GALLERY</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Barima Ba Foods In <span className="text-amber-400 italic font-serif">Action</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-zinc-300 max-w-xl mx-auto">
            Take a peak inside our kitchen, product packaging, and live catering events across
            Accra.
          </p>

          {/* Category Filter Tabs */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {categories.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                  activeTab === tab
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25"
                    : "bg-black/60 text-zinc-400 hover:text-white border border-amber-500/20"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-3xl border border-amber-500/20 bg-black/50 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/50"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={item.img}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                <span className="absolute top-4 left-4 rounded-full bg-amber-500/90 px-3 py-1 text-[10px] font-extrabold text-black uppercase tracking-wider">
                  {item.category}
                </span>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-display text-lg font-bold text-white">{item.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ShopLayout>
  );
}
