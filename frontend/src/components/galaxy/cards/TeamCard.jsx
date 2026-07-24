import React from "react";
import { Star } from "lucide-react";

export default function TeamCard({ employee, index = 0 }) {
  return (
    <div className="group relative" data-testid={`team-member-${employee.id}`}>
      <div className="relative overflow-hidden aspect-[4/5] bg-[#151517] border border-[#1B1B1E]">
        <img
          src={employee.photo}
          alt={employee.name}
          className="w-full h-full object-cover img-grayscale img-zoom"
          loading="lazy"
        />
        <span className="absolute top-4 left-4 num-tag">{String(index + 1).padStart(2, "0")}</span>
        <span className="absolute top-4 right-4 flex items-center gap-1 text-[11px] text-[#F2EDE4]/85">
          <Star size={11} className="text-[#C21A1A]" fill="#C21A1A" /> {employee.rating?.toFixed?.(1) || employee.rating}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 bg-gradient-to-t from-black/95 via-black/40 to-transparent">
          <p className="font-editorial text-2xl md:text-3xl text-[#F2EDE4] leading-tight">{employee.name}</p>
          <p className="text-[11px] tracking-[0.24em] uppercase text-[#F0BEBE] mt-2">{employee.position}</p>
        </div>
      </div>
      <p className="text-[#8C8880] text-sm mt-4 leading-relaxed line-clamp-2">{employee.specialty}</p>
    </div>
  );
}
