import React from "react";

export default function Marquee({ items = [], speed = 40, className = "" }) {
  const doubled = [...items, ...items];
  return (
    <div className={`overflow-hidden py-5 md:py-6 border-y border-[#17171A] bg-[#0A0A0C] ${className}`}>
      <div className="flex items-center animate-marquee" style={{ animationDuration: `${speed}s` }}>
        {doubled.map((t, i) => (
          <span key={i} className="flex items-center gap-6 md:gap-10 px-6 md:px-10 whitespace-nowrap">
            <span className="font-editorial italic text-2xl md:text-3xl text-[#D9D3C6]">{t}</span>
            <span className="marq-dot" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}
