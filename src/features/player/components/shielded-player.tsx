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
      {/* Loading overlay */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black"
        >
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" className="text-nf-accent" />
            <div className="flex flex-col items-center text-center">
              <p className="text-white font-medium">Securing playback...</p>
              <p className="text-nf-text-muted text-xs">Engaging Stealth Shield</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shield badge */}
      <AnimatePresence>
        {isShieldArmed && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-xs font-bold shadow-xl transition-colors duration-500",
              blockedCount > 0
                ? "bg-green-600/90 border-green-400/30 text-white"
                : "bg-nf-accent/80 border-white/20 text-white/90"
            )}
          >
            {blockedCount > 0 ? (
              <>
                <ShieldCheck className="w-3 h-3 fill-white/20" />
                <span className="tabular-nums">{blockedCount} BLOCKED</span>
              </>
            ) : (
              <>
                <Shield className="w-3 h-3 fill-white/20" />
                <span>PROTECTED</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Fullscreen toggle button */}
      {/* Position: top-right corner, always visible, no AVKit handoff */}
      {!isLoading && !isError && (
        <button
          onClick={toggleFullscreen}
          aria-label={isCSSFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className={cn(
            "absolute z-20 flex items-center justify-center",
            "w-8 h-8 rounded-lg",
            "bg-black/60 backdrop-blur-sm border border-white/10",
            "text-white hover:bg-black/80 active:scale-95",
            "transition-all duration-150",
            // Position: top-right, below shield badge if armed
            "top-3 right-3"
          )}
        >
          {isCSSFullscreen
            ? <Minimize2 className="w-4 h-4" />
            : <Maximize2 className="w-4 h-4" />
          }
        </button>
      )}

      {/* Error overlay */}
      {isError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/90"
        >
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <AlertTriangle className="w-12 h-12 text-nf-accent" />
            <div className="space-y-1">
              <p className="text-white font-medium text-lg">Failed to load stream</p>
              <p className="text-nf-text-muted text-sm max-w-xs">
                The source might be offline or blocked by your network. Try switching sources.
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-nf-accent hover:bg-nf-accent-hover text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-nf-accent/20"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Source
            </button>
          </div>
        </motion.div>
      )}

      {/* The iframe itself */}
      <iframe
        ref={iframeRef}
        key={iframeKey}
        src={src}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="no-referrer"
        scrolling="no"
        frameBorder={0}
        className="w-full h-full border-0 absolute inset-0"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
