import React from "react";
import { Expand } from "lucide-react";

export default function GalleryTile({ item, index, span = "", onClick, aspectClass = "aspect-square" }) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden bg-[#151517] border border-[#17171A] ${span} ${aspectClass}`}
      data-testid={`gallery-item-${index}`}
      aria-label={item.caption || `Gallery image ${index + 1}`}
    >
      <img
        src={item.image}
        alt={item.caption || ""}
        className="absolute inset-0 w-full h-full object-cover img-zoom"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <span className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[#F2EDE4] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Expand size={13} />
      </span>
    </button>
  );
}
