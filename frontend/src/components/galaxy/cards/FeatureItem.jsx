import React from "react";

export default function FeatureItem({ Icon, title, copy, index = 0 }) {
  return (
    <div className="group relative flex flex-col">
      <div className="flex items-start justify-between">
        <span className="num-tag">{String(index + 1).padStart(2, "0")}</span>
        <span className="text-[10px] tracking-[0.28em] uppercase text-[#6E6A62]">Galaxy · Craft</span>
      </div>
      <div className="w-12 h-12 border border-[#26262A] mt-8 mb-6 flex items-center justify-center group-hover:border-[#C21A1A] group-hover:bg-[#C21A1A]/5 transition-colors duration-300">
        {Icon && <Icon size={17} className="text-[#C21A1A]" strokeWidth={1.5} />}
      </div>
      <p className="font-display text-lg text-[#F2EDE4]">{title}</p>
      <p className="text-[#8C8880] text-sm mt-2 leading-relaxed">{copy}</p>
    </div>
  );
}
