import React from "react";

/**
 * Editorial heading with optional italic serif accent word.
 * <EditorialHeading as="h1" accent="style.">Where skill meets</EditorialHeading>
 * Or pass children directly for full control (use <em> or <span className="italic-accent"> inline).
 */
export default function EditorialHeading({
  as: Tag = "h2",
  size = "lg",
  accent,
  accentTone = "red",
  className = "",
  children,
}) {
  const sizes = {
    xl: "text-5xl md:text-7xl lg:text-8xl xl:text-[7.5rem]",
    lg: "text-4xl md:text-6xl lg:text-7xl",
    md: "text-3xl md:text-5xl lg:text-6xl",
    sm: "text-2xl md:text-4xl lg:text-5xl",
  };
  const accentColor = accentTone === "red" ? "text-[#C21A1A]" : "text-[#F2EDE4]";
  return (
    <Tag className={`font-editorial leading-[0.98] tracking-[-0.02em] text-[#F2EDE4] ${sizes[size] || sizes.lg} ${className}`}>
      {children}
      {accent && (
        <span className={`italic-accent ${accentColor} ml-1`}>{accent}</span>
      )}
    </Tag>
  );
}
