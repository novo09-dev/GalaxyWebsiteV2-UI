import React from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowUpRight } from "lucide-react";
import Badge from "../primitives/Badge";

/**
 * ServiceCard — used on Landing (Featured) and referenced from booking flows.
 * Every card is a link into /book?service={id}.
 */
export default function ServiceCard({ service, categoryName, testid, size = "md" }) {
  const aspect = size === "lg" ? "aspect-[4/3] md:aspect-[16/10]" : "aspect-[4/3]";
  return (
    <Link
      to={`/book?service=${service.id}`}
      className="group relative block overflow-hidden border border-[#1B1B1E] bg-[#111113] gx-card-hover"
      data-testid={testid}
    >
      <div className={`relative overflow-hidden bg-[#151517] ${aspect}`}>
        <img
          src={service.image}
          alt=""
          className="w-full h-full object-cover opacity-90 img-zoom"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        {service.featured && (
          <span className="absolute top-4 left-4">
            <Badge>Popular</Badge>
          </span>
        )}
        <span className="absolute top-4 right-4 w-9 h-9 rounded-full border border-white/25 flex items-center justify-center bg-black/30 backdrop-blur-sm text-[#F2EDE4] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ArrowUpRight size={14} />
        </span>
        <div className="absolute bottom-0 inset-x-0 p-5 md:p-6">
          <p className="text-[10px] tracking-[0.28em] uppercase text-[#F0BEBE]">{categoryName || service.group}</p>
          <p className="font-editorial text-2xl md:text-3xl leading-tight text-[#F2EDE4] mt-1">{service.name}</p>
        </div>
      </div>
      <div className="px-5 md:px-6 py-4 md:py-5 flex items-center justify-between gap-4 border-t border-[#1B1B1E]">
        <div className="flex items-center gap-3 text-[11px] text-[#8C8880] tracking-widest uppercase">
          <span className="flex items-center gap-1.5"><Clock size={12} className="text-[#C21A1A]" />{service.duration} min</span>
          <span className="opacity-40">/</span>
          <span>Deposit ₹{service.deposit.toLocaleString()}</span>
        </div>
        <div className="text-right shrink-0">
          <p className="font-editorial text-2xl leading-none text-[#C21A1A]">₹{service.price.toLocaleString()}</p>
        </div>
      </div>
    </Link>
  );
}
