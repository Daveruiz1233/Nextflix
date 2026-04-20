"use client";

/**
 * ShieldedPlayer: Secure streaming iframe with CSS fullscreen.
 *
 * Uses CSS position:fixed fullscreen instead of the browser Fullscreen API,
 * so iOS doesn't hand off to AVKit (which shows different controls).
 * The player looks identical whether "fullscreen" or not.
 */

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@/shared/components";
import {
  AlertTriangle, RefreshCw, Shield, ShieldCheck,
  Maximize2, Minimize2
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import type { LayoutMode } from "@/shared/hooks";

interface ShieldedPlayerProps {
  src: string;
  iframeKey: string | number;
  layoutMode: LayoutMode;
  className?: string;
}

export function ShieldedPlayer({ src, iframeKey, layoutMode, className }: ShieldedPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [isShieldArmed, setIsShieldArmed] = useState(false);

  // CSS-based fullscreen — keeps VidSrc's own controls consistent
  // Does NOT trigger iOS AVKit takeover (unlike the browser Fullscreen API)
  const [isCSSFullscreen, setIsCSSFullscreen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = () => setIsLoading(false);
  const handleError = () => { setIsLoading(false); setIsError(true); };
  const handleRetry = () => { setIsLoading(true); setIsError(false); };

  const incrementBlocked = useCallback(() => setBlockedCount((c) => c + 1), []);

  // Toggle CSS fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsCSSFullscreen((prev) => {
      const next = !prev;
      // Lock/unlock body scroll
      document.body.style.overflow = next ? "hidden" : "";
      return next;
    });
  }, []);

  // Escape key exits fullscreen
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCSSFullscreen) {
        setIsCSSFullscreen(false);
        document.body.style.overflow = "";
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isCSSFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (navigator.serviceWorker?.controller) setIsShieldArmed(true);

    import("@/shared/lib/adblock-engine").then(({ adblockEngine }) => {
      if (adblockEngine) setIsShieldArmed(true);
    }).catch(() => {});

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "AD_BLOCKED") {
        incrementBlocked();
        setIsShieldArmed(true);
      }
    };

    const handleMainThreadBlock = () => {
      incrementBlocked();
      setIsShieldArmed(true);
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    window.addEventListener("AD_BLOCKED", handleMainThreadBlock);

    // Kill external link redirects from OUR page layer
    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (anchor && anchor.target === "_blank") {
        const href = anchor.href || "";
        if (!href.startsWith(window.location.origin)) {
          e.preventDefault();
          e.stopPropagation();
          incrementBlocked();
        }
      }
    };
    document.addEventListener("click", handleLinkClick, true);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
      window.removeEventListener("AD_BLOCKED", handleMainThreadBlock);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [iframeKey, incrementBlocked]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative w-full overflow-hidden bg-black shadow-2xl transition-all duration-700 ease-out-expo",
        // Enhanced shadows and border treatment
        "ring-1 ring-white/5",
        // Base (non-fullscreen)
        !isCSSFullscreen && [
          "rounded-2xl mx-auto",
          layoutMode === "stacked" ? "h-[40dvh]" : "aspect-video max-w-[1100px]"
        ],
        // Nuclear Fullscreen (Theater Mode)
        isCSSFullscreen && [
          "fixed inset-0 z-[9999] rounded-none ring-0 w-screen h-[100dvh] bg-black",
          "flex items-center justify-center"
        ],
        className
      )}
      style={{
        // Custom cubic-bezier for that premium feel
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* 🔮 Background Glow (Fullscreen only) */}
      {isCSSFullscreen && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-nf-accent/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
      )}

      {/* 🚨 Loading Overlay (Premium Glass) */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[40] flex items-center justify-center bg-black/80 backdrop-blur-3xl"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <Spinner size="lg" className="text-nf-accent scale-125" />
              <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white/20 animate-pulse" />
            </div>
            <div className="flex flex-col items-center text-center space-y-2">
              <h3 className="text-white font-bold tracking-tight text-lg">Initializing Shield</h3>
              <p className="text-nf-text-muted text-sm px-8 max-w-xs leading-relaxed">
                Neutralizing redirects and deep-cleaning the stream for an ad-free experience.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 🛡️ Performance Shield Badge */}
      <AnimatePresence mode="wait">
        {isShieldArmed && (
          <motion.div
            key={blockedCount > 0 ? "active" : "standby"}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={cn(
              "absolute top-4 left-4 z-[50] flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-xl border shadow-2xl transition-all duration-500",
              blockedCount > 0
                ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-400 animate-pulse-subtle"
                : "bg-nf-accent/10 border-white/10 text-white/70"
            )}
          >
            {blockedCount > 0 ? (
              <>
                <div className="relative">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <div className="absolute inset-0 animate-ping opacity-40">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-widest font-black tabular-nums">
                  {blockedCount} Vectors Killed
                </span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 opacity-50" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Nuclear Shield Active</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎮 Premium Controls (Top Right) */}
      {!isLoading && !isError && (
        <div className="absolute top-4 right-4 z-[50] flex items-center gap-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300">
           {/* Info Pill */}
           <div className="px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/5 text-[10px] text-white/40 font-bold uppercase tracking-tighter">
             {isCSSFullscreen ? 'Theater Mode' : 'HD Stream'}
           </div>

           {/* Fullscreen Toggle */}
           <button
            onClick={toggleFullscreen}
            className={cn(
              "flex items-center justify-center",
              "w-10 h-10 rounded-xl",
              "bg-white/10 backdrop-blur-2xl border border-white/10",
              "text-white shadow-2xl hover:bg-white/20 active:scale-90",
              "transition-all duration-300 transform-gpu"
            )}
          >
            {isCSSFullscreen
              ? <Minimize2 className="w-5 h-5" />
              : <Maximize2 className="w-5 h-5" />
            }
          </button>
        </div>
      )}

      {/* ⚠️ Error State (Sleek) */}
      {isError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-[45] flex items-center justify-center bg-black/95 backdrop-blur-md"
        >
          <div className="flex flex-col items-center gap-6 text-center px-8">
            <div className="w-20 h-20 rounded-full bg-nf-accent/10 flex items-center justify-center border border-nf-accent/20">
              <AlertTriangle className="w-10 h-10 text-nf-accent" />
            </div>
            <div className="space-y-2">
              <h2 className="text-white font-bold text-xl tracking-tight">Stream Unavailable</h2>
              <p className="text-nf-text-muted text-sm leading-relaxed max-w-sm">
                This source was blocked or is currently offline. Our shield might have neutralized a compromise.
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-nf-accent hover:bg-nf-accent-hover text-white text-sm font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-nf-accent/40"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Re-Engage
            </button>
          </div>
        </motion.div>
      )}

      {/* 📺 The Stream Engine (Aggressively Shielded) */}
      <iframe
        ref={iframeRef}
        key={iframeKey}
        src={src}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="no-referrer"
        scrolling="no"
        frameBorder={0}
        className={cn(
          "w-full h-full border-0 absolute inset-0 transition-opacity duration-1000",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* 🧤 Interaction Guard (Bottom) */}
      {!isLoading && !isCSSFullscreen && (
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
    </div>
    </div>
  );
}
