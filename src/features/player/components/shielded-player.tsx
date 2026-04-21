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
        "relative w-full overflow-hidden rounded-2xl bg-black shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/5",
        "transition-all duration-500 ease-in-out",
        // Normal sizing
        !isCSSFullscreen && layoutMode === "stacked" && "h-[45dvh]",
        !isCSSFullscreen && layoutMode !== "stacked" && "aspect-video max-w-[1200px] mx-auto",
        // CSS Fullscreen: fixed overlay covering entire screen
        // This is the key — no AVKit, same VidSrc controls, consistent look
        isCSSFullscreen && [
          "fixed inset-0 z-[9999]",
          "w-screen h-[100dvh]",
          "rounded-none ring-0 shadow-none",
        ],
        className
      )}
    >
      {/* Background glow effect in fullscreen */}
      {isCSSFullscreen && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-[-10%] bg-nf-accent/10 blur-[100px] opacity-50" />
        </div>
      )}

      {/* Loading overlay with glassmorphism */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-nf-accent/20 blur-xl rounded-full animate-pulse" />
              <Spinner size="lg" className="text-nf-accent relative z-10" />
            </div>
            <div className="flex flex-col items-center text-center space-y-1">
              <p className="text-white font-semibold text-lg tracking-tight">Engaging Iron Dome</p>
              <p className="text-nf-text-muted text-xs uppercase tracking-widest font-bold">Stealth Shield v3.0 Active</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shield badge - Premium floating design */}
      <AnimatePresence>
        {isShieldArmed && (
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={cn(
              "absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-2xl transition-all duration-300",
              blockedCount > 0
                ? "bg-nf-accent/20 border-nf-accent/40 text-nf-accent"
                : "bg-white/5 border-white/10 text-white/60"
            )}
          >
            {blockedCount > 0 ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-nf-accent animate-pulse" />
                <span className="tabular-nums font-black text-[10px] tracking-tighter">{blockedCount} AD-LOOPS KILLED</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 opacity-50" />
                <span className="font-bold text-[10px] tracking-widest uppercase">Shield Armed</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Fullscreen toggle button - Sleek Integrated look */}
      {!isLoading && !isError && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
           <button
            onClick={toggleFullscreen}
            aria-label={isCSSFullscreen ? "Exit theater mode" : "Enter theater mode"}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-1.5 rounded-full",
              "bg-white/5 backdrop-blur-xl border border-white/10",
              "text-white/80 hover:text-white hover:bg-white/10 active:scale-95",
              "transition-all duration-200 group shadow-xl"
            )}
          >
            {isCSSFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Exit Theater</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Theater Mode</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error overlay - Premium styled */}
      {isError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/95 backdrop-blur-lg"
        >
          <div className="flex flex-col items-center gap-6 text-center px-8">
            <div className="p-4 rounded-3xl bg-nf-accent/10 border border-nf-accent/20">
              <AlertTriangle className="w-10 h-10 text-nf-accent" />
            </div>
            <div className="space-y-2">
              <p className="text-white font-bold text-xl tracking-tight">Signal Interrupted</p>
              <p className="text-nf-text-muted text-sm max-w-xs leading-relaxed">
                The stream source has been blocked or is currently unavailable. Our automatic bypass is cooling down.
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="group relative px-8 py-3 rounded-full bg-nf-accent text-white text-sm font-black transition-all hover:shadow-[0_0_30px_-5px_rgba(229,9,20,0.5)] active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="relative flex items-center gap-2">
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                RE-ENGAGE SHIELD
              </div>
            </button>
          </div>
        </motion.div>
      )}

      {/* The iframe itself - Protected by Iron Dome Native Firewall */}
      <iframe
        ref={iframeRef}
        key={iframeKey}
        src={src}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="no-referrer"
        scrolling="no"
        frameBorder={0}
        className="w-full h-full border-0 absolute inset-0 z-0 bg-black"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
