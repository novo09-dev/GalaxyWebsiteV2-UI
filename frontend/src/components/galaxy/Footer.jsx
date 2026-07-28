import { Link } from "react-router-dom";
import { Phone, MapPin, Instagram, Facebook, Mail, ArrowUpRight, Clock, Globe } from "lucide-react";
import BrandMark from "./primitives/BrandMark";

export default function Footer({ business }) {
  const b = business || {};
  const year = new Date().getFullYear();

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative border-t border-[#17171A] bg-[#08080A]" data-testid="site-footer">
      {/* Big editorial wordmark strip */}
      <div className="border-b border-[#17171A]">
        <div className="gx-container py-14 md:py-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <p className="eyebrow mb-5">Hair · Beauty · Style</p>
            <p className="font-editorial text-5xl md:text-7xl lg:text-8xl leading-[0.95] text-[#F2EDE4]">
              Come see us <span className="italic-accent text-[#C21A1A]">soon.</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/book" className="btn-red">Book Appointment <ArrowUpRight size={14} /></Link>
            {b.phone && <a href={`tel:${b.phone}`} className="btn-ghost">Call {b.phone}</a>}
          </div>
        </div>
      </div>

      <div className="gx-container py-14 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <div className="mb-5"><BrandMark variant="logo" size="lg" /></div>
          <p className="text-[#8C8880] max-w-md leading-relaxed text-sm">
            {b.about || "A unisex Hair, Beauty & Style studio. Expertise, hygiene and genuine care — always."}
          </p>
          <div className="flex gap-3 mt-6">
            {b.instagram && (
              <a href={b.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-[#26262A] hover:border-[#C21A1A] flex items-center justify-center text-[#D9D3C6] hover:text-white transition-colors" aria-label="Instagram">
                <Instagram size={14} />
              </a>
            )}
            {b.facebook && (
              <a href={b.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-[#26262A] hover:border-[#C21A1A] flex items-center justify-center text-[#D9D3C6] hover:text-white transition-colors" aria-label="Facebook">
                <Facebook size={14} />
              </a>
            )}
            {b.email && (
              <a href={`mailto:${b.email}`} className="w-10 h-10 rounded-full border border-[#26262A] hover:border-[#C21A1A] flex items-center justify-center text-[#D9D3C6] hover:text-white transition-colors" aria-label="Email">
                <Mail size={14} />
              </a>
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          <p className="eyebrow mb-5">Explore</p>
          <ul className="space-y-3 text-sm">
            <li><a href="/#services" className="text-[#D9D3C6] hover:text-white">Services</a></li>
            <li><a href="/#team" className="text-[#D9D3C6] hover:text-white">Team</a></li>
            <li><a href="/#gallery" className="text-[#D9D3C6] hover:text-white">Gallery</a></li>
            <li><a href="/#contact" className="text-[#D9D3C6] hover:text-white">Contact</a></li>
            <li><Link to="/book" className="text-[#D9D3C6] hover:text-white">Book Appointment</Link></li>
            <li><Link to="/privacy" className="text-[#8C8880] hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/terms" className="text-[#8C8880] hover:text-white">Terms & Conditions</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <p className="eyebrow mb-5">Visit</p>
          <ul className="space-y-4 text-sm text-[#D9D3C6]">
            {b.address && (
              <li className="flex items-start gap-3">
                <MapPin size={14} className="mt-1 text-[#C21A1A] shrink-0" />
                <span className="leading-relaxed">{b.address}</span>
              </li>
            )}
            {b.phone && (
              <li className="flex items-center gap-3">
                <Phone size={14} className="text-[#C21A1A]" />
                <a href={`tel:${b.phone}`} className="hover:text-white">{b.phone}</a>
              </li>
            )}
            {b.working_hours_text && (
              <li className="flex items-start gap-3">
                <Clock size={14} className="mt-1 text-[#C21A1A] shrink-0" />
                <span>{b.working_hours_text}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-[#17171A]">
        <div className="gx-container py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6E6A62]">
          <p>© {year} Galaxy · Hair · Beauty · Style. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <p className="tracking-widest uppercase text-[10px]">Crafted with care in Agartala</p>
            <button onClick={scrollTop} className="pill-link" aria-label="Back to top">
              Back to top <ArrowUpRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Creator attribution */}
      <div className="border-t border-[#17171A]">
        <div className="gx-container py-8">
          <div className="max-w-xl">
            <p className="tracking-[0.18em] uppercase text-[10px] text-[#6E6A62] mb-2">
              Website by
            </p>

            <p className="text-sm font-medium text-[#F2EDE4] mb-2">
              Novohjyoti Sinha
            </p>

            <p className="text-xs text-[#8C8880] leading-relaxed mb-4">
              Building practical systems that{" "}
              <span className="text-[#60A5FA] font-medium">help</span>{" "}
              people and businesses{" "}
              <span className="text-[#2DD4BF] font-medium">do</span>{" "}
              their best work.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <a
                href="mailto:itsnovohjyoti@gmail.com"
                className="inline-flex items-center gap-2 text-xs text-[#8C8880] hover:text-[#C21A1A] transition-colors duration-200"
              >
                <Mail size={12} />
                itsnovohjyoti@gmail.com
              </a>

              <a
                href="https://novohjyoti-systems.preview.emergentagent.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#8C8880] hover:text-[#C21A1A] transition-colors duration-200"
              >
                <Globe size={12} />
                Portfolio
                <ArrowUpRight size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
