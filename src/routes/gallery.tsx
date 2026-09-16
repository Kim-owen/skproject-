import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShopLayout } from "@/components/shop/Layout";
import { getGalleryItems, type GalleryItem } from "@/lib/gallery.functions";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Camera, Settings, X, ZoomIn, Loader2, Play, Film } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Visual Gallery — Authentic Ghanaian Food & Events | Barima Ba Foods" },
      {
        name: "description",
        content:
          "Browse our visual gallery showcasing signature Shito Animi, freshly seasoned meats, spices, and royal catering events across Ghana.",
      },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const fetchItems = useServerFn(getGalleryItems);
  const { data: galleryItems = [], isLoading } = useQuery({
    queryKey: ["gallery-items"],
    queryFn: () => fetchItems(),
    staleTime: 1000 * 60,
  });

  const [activeTab, setActiveTab] = useState("All");
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .rpc("has_role", { _user_id: data.user.id, _role: "admin" })
          .then(({ data: hasRole }) => {
            setIsAdmin(!!hasRole);
          });
      }
    });
  }, []);

  // Compute dynamic categories
  const categories = [
    "All",
    ...Array.from(new Set(galleryItems.map((item) => item.category).filter(Boolean))),
  ];

  const filtered =
    activeTab === "All" ? galleryItems : galleryItems.filter((item) => item.category === activeTab);

  return (
    <ShopLayout>
      {/* Hero Header */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-black/60 backdrop-blur-xl shadow-2xl p-8 sm:p-16 text-center relative">
          {/* Admin Edit Shortcut */}
          {isAdmin && (
            <div className="absolute top-6 right-6">
              <Link
                to="/portal/gallery"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/20 px-3.5 py-1.5 text-xs font-extrabold text-amber-300 hover:bg-amber-500 hover:text-black transition-all shadow-md"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Manage Gallery</span>
              </Link>
            </div>
          )}

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold tracking-widest uppercase text-amber-400 mb-6">
            <Camera className="h-4 w-4" />
            <span>VISUAL GALLERY & REELS</span>
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
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm font-semibold">Loading authentic delicacies…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-amber-500/30 bg-black/40 p-12 text-center text-zinc-400">
            <p className="text-sm font-semibold">No media found in this category.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const isVideo = item.media_type === "video" || !!item.video_url;

              return (
                <div
                  key={item.id}
                  onClick={() => setLightboxItem(item)}
                  className="group cursor-pointer overflow-hidden rounded-3xl border border-amber-500/20 bg-black/50 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/50"
                >
                  <div className="relative h-64 overflow-hidden bg-black">
                    {isVideo && item.video_url ? (
                      <video
                        src={item.video_url}
                        poster={item.img}
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src={item.img}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute(
                            "src",
                            "/images/catering-jollof-feast.png",
                          );
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/85 via-transparent to-transparent opacity-90 pointer-events-none" />

                    <div className="absolute top-4 left-4 flex items-center gap-1.5">
                      <span className="rounded-full bg-amber-500/95 px-3 py-1 text-[10px] font-extrabold text-black uppercase tracking-wider shadow">
                        {item.category}
                      </span>
                      {isVideo && (
                        <span className="rounded-full bg-red-600/90 text-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow">
                          <Film className="h-3 w-3" />
                          <span>VIDEO</span>
                        </span>
                      )}
                    </div>

                    {/* Play Icon or Zoom Icon */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/60 p-2 text-white">
                      <ZoomIn className="h-4 w-4" />
                    </div>

                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="h-14 w-14 rounded-full bg-amber-500/90 backdrop-blur-sm text-black flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 fill-black ml-1" />
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                      <h3 className="font-display text-lg font-bold text-white">{item.title}</h3>
                      {item.description && (
                        <p className="mt-1 text-xs text-zinc-300 line-clamp-1 opacity-90">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Lightbox Preview Modal */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full overflow-hidden rounded-3xl border border-amber-500/40 bg-zinc-950 shadow-2xl"
          >
            <button
              onClick={() => setLightboxItem(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-h-[72vh] overflow-hidden bg-black flex items-center justify-center">
              {lightboxItem.media_type === "video" || lightboxItem.video_url ? (
                <video
                  src={lightboxItem.video_url || lightboxItem.img}
                  poster={lightboxItem.img}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[72vh] w-full object-contain"
                />
              ) : (
                <img
                  src={lightboxItem.img}
                  alt={lightboxItem.title}
                  className="max-h-[72vh] w-full object-contain"
                />
              )}
            </div>

            <div className="p-6 bg-zinc-950 border-t border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  {lightboxItem.category}
                </span>
                {(lightboxItem.media_type === "video" || lightboxItem.video_url) && (
                  <span className="rounded-full bg-red-600/20 text-red-400 border border-red-600/30 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <Film className="h-3 w-3" />
                    <span>Video Reel</span>
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl font-extrabold text-white">
                {lightboxItem.title}
              </h2>
              {lightboxItem.description && (
                <p className="mt-2 text-sm text-zinc-300">{lightboxItem.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </ShopLayout>
  );
}
