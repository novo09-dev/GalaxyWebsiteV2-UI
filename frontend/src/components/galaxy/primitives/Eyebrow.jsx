import React from "react";

/**
 * Small-caps editorial label with a thin red rule prefix.
 * <Eyebrow>Our Services</Eyebrow>
 */
export default function Eyebrow({ children, className = "", tone = "muted" }) {
  const color = tone === "cream" ? "text-[#D9D3C6]" : "text-[#8C8880]";
  return (
    <p className={`flex items-center gap-3 text-[11px] tracking-[0.32em] uppercase font-medium ${color} ${className}`}>
      <span className="inline-block w-6 h-px bg-[#C21A1A]" />
      <span>{children}</span>
    </p>
  );
}
