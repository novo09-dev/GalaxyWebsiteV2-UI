import React from "react";
import { Star } from "lucide-react";

export default function TestimonialCard({ item, size = "md" }) {
  const textSize = size === "lg" ? "text-2xl md:text-3xl lg:text-4xl" : "text-lg md:text-xl lg:text-2xl";
  return (
    <figure
      className="relative p-8 md:p-10 border border-[#1B1B1E] bg-[#0F0F11] h-full flex flex-col"
      data-testid={`testimonial-${item.id}`}
    >
      <span aria-hidden className="absolute -top-4 left-8 font-editorial text-7xl text-[#C21A1A] leading-none">&ldquo;</span>
      <blockquote className={`font-editorial ${textSize} leading-[1.25] text-[#F2EDE4] mt-6`}>
        {item.review}
      </blockquote>
      <div className="mt-auto pt-8">
        <div className="flex items-center gap-1 mb-3">
          {[...Array(item.rating || 5)].map((_, i) => (
            <Star key={i} size={12} className="text-[#C21A1A]" fill="#C21A1A" />
          ))}
        </div>
        <figcaption className="text-[11px] tracking-[0.28em] uppercase text-[#8C8880]">
          <span className="red-rule mr-3" />
          {item.name}
        </figcaption>
      </div>
    </figure>
  );
}
