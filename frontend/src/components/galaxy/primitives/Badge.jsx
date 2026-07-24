import React from "react";

export default function Badge({ children, variant = "red", className = "" }) {
  const styles = variant === "red"
    ? "bg-[#C21A1A]/15 text-[#F0BEBE] border-[#C21A1A]/45"
    : variant === "outline"
      ? "bg-transparent text-[#D9D3C6] border-[#2A2A2E]"
      : "bg-white/5 text-[#B9B9B9] border-white/10";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] tracking-[0.24em] uppercase font-medium px-2.5 py-1 border rounded-full ${styles} ${className}`}>{children}</span>
  );
}
