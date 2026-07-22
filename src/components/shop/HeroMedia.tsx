import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Film, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HeroMediaSettings } from "@/lib/settings.functions";

interface HeroMediaProps {
  settings: HeroMediaSettings;
  previewMode?: boolean;
}

export function HeroMedia({ settings, previewMode = false }: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(settings.autoplay);
  const [isMuted, setIsMuted] = useState<boolean>(settings.muted);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (settings.autoplay) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Autoplay with audio can be blocked by browser policy; fallback to muted autoplay
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current.play().catch(() => setIsPlaying(false));
              }
            });
        }
      }
    }
  }, [settings.video_url, settings.autoplay]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const isVideo = settings.media_type === "video" && !hasError && settings.video_url;

  return (
    <div
      ref={containerRef}
      className="group relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-border/80 bg-card shadow-2xl shadow-foreground/5 animate-float transition-all duration-500"
    >
      {/* Video or Image Element */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={settings.video_url}
          poster={settings.poster_url}
          autoPlay={settings.autoplay}
          muted={isMuted}
          loop={settings.loop}
          playsInline
          onLoadedData={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}

      {/* Fallback image when video is loading, errored, or media_type is image */}
      {(!isVideo || !isLoaded || hasError) && (
        <img
          src={
            settings.poster_url ||
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"
          }
          alt="Hero visual"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-102"
        />
      )}

      {/* Ambient Gradient Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

      {/* Top Live Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-background/60 px-3 py-1.5 backdrop-blur-md shadow-lg">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
          {settings.overlay_text || "Accra Express Fresh"}
        </span>
      </div>

      {/* Controls Overlay (Only shown for video mode) */}
      {isVideo && (
        <div className="absolute bottom-20 right-4 z-10 flex flex-col gap-2 transition-opacity duration-300 opacity-90 group-hover:opacity-100">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={togglePlay}
            className="h-10 w-10 rounded-full border border-white/20 bg-background/70 text-foreground backdrop-blur-md hover:bg-background shadow-md transition-transform hover:scale-105"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={toggleMute}
            className="h-10 w-10 rounded-full border border-white/20 bg-background/70 text-foreground backdrop-blur-md hover:bg-background shadow-md transition-transform hover:scale-105"
            title={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          {!previewMode && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={toggleFullscreen}
              className="h-10 w-10 rounded-full border border-white/20 bg-background/70 text-foreground backdrop-blur-md hover:bg-background shadow-md transition-transform hover:scale-105"
              title="Fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Bottom Information Glass Card */}
      <div className="absolute bottom-4 left-4 right-4 z-10 rounded-2xl border border-border/60 bg-background/85 p-4 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {settings.badge_text || "Same-day delivery across Accra"}
              </p>
            </div>
            <p className="font-display text-base font-semibold text-foreground mt-0.5">
              Freshly packed & dispatched
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Film className="h-3.5 w-3.5" />
            <span>100% Quality</span>
          </div>
        </div>
      </div>
    </div>
  );
}
