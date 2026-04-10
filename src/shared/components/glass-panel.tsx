"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  intensity?: "light" | "medium" | "heavy";
}

const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, intensity = "medium", children, ...props }, ref) => {
    const intensityClasses = {
      light: "bg-white/[0.03] backdrop-blur-sm border-white/[0.06]",
      medium: "bg-white/[0.05] backdrop-blur-md border-white/[0.1]",
      heavy: "bg-white/[0.08] backdrop-blur-xl border-white/[0.12]",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl border",
          intensityClasses[intensity],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export { GlassPanel };
