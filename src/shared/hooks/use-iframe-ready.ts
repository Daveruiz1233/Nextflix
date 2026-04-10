"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface IframeReadyState {
  isLoading: boolean;
  isError: boolean;
  iframeKey: number;
  retry: () => void;
}

export function useIframeReady(src: string): IframeReadyState {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const retry = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    setIframeKey((prev) => prev + 1);
  }, []);

  // Reset state when src changes
  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    setIframeKey((prev) => prev + 1);
  }, [src]);

  // Set a timeout for loading
  useEffect(() => {
    if (isLoading) {
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        // Don't set error on timeout — iframe may still be loading content
        // within its own frame context that we can't detect
      }, 15000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, iframeKey]);

  return { isLoading, isError, iframeKey, retry };
}

export function handleIframeLoad(setIsLoading: (v: boolean) => void) {
  return () => setIsLoading(false);
}

export function handleIframeError(
  setIsLoading: (v: boolean) => void,
  setIsError: (v: boolean) => void
) {
  return () => {
    setIsLoading(false);
    setIsError(true);
  };
}
