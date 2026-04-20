"use client";

/**
 * ShieldedPlayer: A secure, ad-blocking wrapper for streaming iframes.
 * Implements native-level redirect protection and stealth engine monitoring.
 */

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@/shared/components";
import { AlertTriangle, RefreshCw, Shield, ShieldCheck } from "lucide-react";
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setIsError(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setIsError(false);
  };

  const incrementBlocked = useCallback(() => {
    setBlockedCount((c) => c + 1);
  }, []);

  useEffect(() => {
    // 1) Check initial armed state
    if (navigator.serviceWorker?.controller) {
      setIsShieldArmed(true);
    }
    
    // Check if main engine is active
    import("@/shared/lib/adblock-engine").then(({ adblockEngine }) => {
      if (adblockEngine) setIsShieldArmed(true);
    });

    // 2) Listen for signals (Both SW and Main Thread)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "AD_BLOCKED") {
        incrementBlocked();
        setIsShieldArmed(true);
      }
    };

    const handleMainThreadBlock = (event: any) => {
      incrementBlocked();
      setIsShieldArmed(true);
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    window.addEventListener("AD_BLOCKED", handleMainThreadBlock);

    // 3) Kill external legacy link click redirects
    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (anchor && anchor.target === "_blank") {
        const href = anchor.href || "";
        if (!href.startsWith(window.location.origin)) {
          e.preventDefault();
          e.stopPropagation();
          console.warn("[Shield] Blocked redirect link:", href);
          incrementBlocked();
        }
      }
    };

    document.addEventListener("click", handleLinkClick, true);

    // 4) Top-Level Navigation Guard
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If we are on a watch page, confirm before leaving to prevent malicious redirects
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
      window.removeEventListener("AD_BLOCKED", handleMainThreadBlock);
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [iframeKey, incrementBlocked]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10",
        layoutMode === "stacked"
          ? "h-[45dvh]"
          : "aspect-video max-w-[1100px] mx-auto",
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

      {/* Persistent Shield Badge */}
      <AnimatePresence>
        {isShieldArmed && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold shadow-xl transition-colors duration-500",
              blockedCount > 0
                ? "bg-green-600/90 border-green-400/30 text-white"
                : "bg-nf-accent/80 border-white/20 text-white/90"
            )}
          >
            {blockedCount > 0 ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 fill-white/20" />
                <span className="tabular-nums animate-pulse">{blockedCount} ADS BLOCKED</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 fill-white/20" />
                <span>SHIELD PROTECTED</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
