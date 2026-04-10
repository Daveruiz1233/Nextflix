"use client";

import { useState, useEffect } from "react";

type Orientation = "portrait" | "landscape";

export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  useEffect(() => {
    function getOrientation(): Orientation {
      // Use screen.orientation API when available
      if (typeof screen !== "undefined" && screen.orientation) {
        return screen.orientation.type.startsWith("landscape") ? "landscape" : "portrait";
      }
      // Fallback to window dimensions
      return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
    }

    setOrientation(getOrientation());

    function handleChange() {
      setOrientation(getOrientation());
    }

    // Listen to both resize and orientation change
    window.addEventListener("resize", handleChange);
    if (typeof screen !== "undefined" && screen.orientation) {
      screen.orientation.addEventListener("change", handleChange);
    }

    return () => {
      window.removeEventListener("resize", handleChange);
      if (typeof screen !== "undefined" && screen.orientation) {
        screen.orientation.removeEventListener("change", handleChange);
      }
    };
  }, []);

  return orientation;
}
