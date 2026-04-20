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
        // Base (non-fullscreen)
        "relative w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10",
        // Normal sizing
        !isCSSFullscreen && layoutMode === "stacked" && "h-[45dvh]",
        !isCSSFullscreen && layoutMode !== "stacked" && "aspect-video max-w-[1100px] mx-auto",
        // CSS Fullscreen: fixed overlay covering entire screen
        // This is the key — no AVKit, same VidSrc controls, consistent look
        isCSSFullscreen && [
          "fixed inset-0 z-[9999]",
          "w-screen h-[100dvh]",
          "rounded-none ring-0",
        ],
        className
      )}
    >
      {/* Safe Zone Pulse — subtle outer glow when shield is active */}
      <AnimatePresence>
        {isShieldArmed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "absolute inset-0 z-0 pointer-events-none transition-all duration-1000",
              blockedCount > 0 
                ? "shadow-[inset_0_0_80px_rgba(34,197,94,0.15)]" 
                : "shadow-[inset_0_0_40px_rgba(229,9,20,0.1)]"
            )}
          />
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Spinner size="lg" className="text-nf-accent relative z-10" />
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-nf-accent/20 rounded-full blur-xl"
              />
            </div>
            <div className="flex flex-col items-center text-center">
              <p className="text-white font-bold tracking-tight">Hardening Connection...</p>
              <p className="text-nf-text-muted text-[10px] uppercase tracking-widest font-black opacity-50">Stealth Shield v3.0</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shield badge — Enhanced with pulse */}
      <AnimatePresence>
        {isShieldArmed && (
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-xl border text-[10px] font-black uppercase tracking-wider shadow-2xl transition-all duration-700",
              blockedCount > 0
                ? "bg-green-600/20 border-green-400/30 text-green-400"
                : "bg-nf-accent/10 border-white/10 text-nf-accent"
            )}
          >
            <div className="relative flex items-center justify-center">
              <ShieldCheck className={cn("w-3.5 h-3.5", blockedCount > 0 ? "text-green-400" : "text-nf-accent opacity-50")} />
              {blockedCount > 0 && (
                <motion.div 
                  animate={{ scale: [1, 2], opacity: [1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-green-400 rounded-full"
                />
              )}
            </div>
            <span className="tabular-nums">
              {blockedCount > 0 ? `${blockedCount} INTRUSIONS BLOCKED` : "SHIELD PROTECTED"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Fullscreen toggle button */}
      {!isLoading && !isError && (
        <button
          onClick={toggleFullscreen}
          aria-label={isCSSFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className={cn(
            "absolute z-20 flex items-center justify-center",
            "w-10 h-10 rounded-xl",
            "bg-black/40 backdrop-blur-xl border border-white/10",
            "text-white/80 hover:text-white hover:bg-black/60 active:scale-90",
            "transition-all duration-300 shadow-2xl",
            "top-4 right-4"
          )}
        >
          {isCSSFullscreen
            ? <Minimize2 className="w-5 h-5" />
            : <Maximize2 className="w-5 h-5" />
          }
        </button>
      )}

      {/* Hint overlay for first-time use */}
      {!isLoading && !isError && !isCSSFullscreen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] whitespace-nowrap bg-black/20 px-4 py-1 rounded-full backdrop-blur-sm">
            Hardened IFrame Playback Enabled
          </p>
        </motion.div>
      )}

      {/* Error overlay */}
      {isError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/95"
        >
          <div className="flex flex-col items-center gap-6 text-center px-10">
            <div className="w-20 h-20 rounded-full bg-nf-accent/10 flex items-center justify-center border border-nf-accent/20">
              <AlertTriangle className="w-10 h-10 text-nf-accent" />
            </div>
            <div className="space-y-2">
              <p className="text-white font-black text-xl tracking-tight uppercase">Shield Interference</p>
              <p className="text-nf-text-muted text-sm max-w-xs leading-relaxed">
                The stream was terminated by the shield or source. Try a different provider.
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-nf-accent hover:bg-nf-accent-hover text-white text-sm font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-nf-accent/40"
            >
              <RefreshCw className="w-4 h-4" />
              Re-Engage Shield
            </button>
          </div>
        </motion.div>
      )}

      {/* The iframe itself — playsinline is key to prevent iOS takeover */}
      <iframe
        ref={iframeRef}
        key={iframeKey}
        src={src}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="no-referrer"
        scrolling="no"
        frameBorder={0}
        className="w-full h-full border-0 absolute inset-0 z-[1] bg-black"
        onLoad={handleLoad}
        onError={handleError}
        title="Streaming Content"
      />
    </div>
  );
}
