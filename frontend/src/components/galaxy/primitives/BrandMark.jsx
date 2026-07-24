import React from "react";

const LOGO_URL = "https://customer-assets-v7afamib.emergentagent.net/job_appointment-hub-969/artifacts/9d3zwini_Brand%20logo.png";

/**
 * BrandMark — either the full logo image, or an editorial wordmark.
 * variant: 'logo' | 'wordmark' | 'mono'
 */
export default function BrandMark({ variant = "logo", size = "md", className = "" }) {
  const heights = { sm: "h-9 md:h-10", md: "h-12 md:h-14", lg: "h-16 md:h-20", xl: "h-24 md:h-28" };

  if (variant === "logo") {
    return (
      <img
        src={LOGO_URL}
        alt="Galaxy — Hair · Beauty · Style"
        className={`${heights[size] || heights.md} w-auto ${className}`}
      />
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={`inline-flex items-baseline gap-1 font-display font-black text-[#F2EDE4] tracking-[0.18em] ${size === "lg" ? "text-3xl md:text-5xl" : "text-xl md:text-2xl"} ${className}`}>
        <span>G</span>
        <span>A</span>
        <span className="text-[#C21A1A]">L</span>
        <span>A</span>
        <span>X</span>
        <span>Y</span>
      </span>
    );
  }

  return (
    <span className={`inline-block font-display font-black text-[#F2EDE4] tracking-[0.2em] text-lg ${className}`}>GALAXY</span>
  );
}
