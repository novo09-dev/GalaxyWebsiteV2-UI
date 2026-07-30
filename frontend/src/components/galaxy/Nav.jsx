import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import BrandMark from "./primitives/BrandMark";

const NAV = [
  { label: "Home", to: "/#top" },
  { label: "Services", to: "/#services" },
  { label: "Team", to: "/#team" },
  { label: "Gallery", to: "/#gallery" },
  { label: "About", to: "/#about" },
  { label: "Contact", to: "/#contact" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [loc.pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header
      data-testid="site-nav"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#08080A]/85 backdrop-blur-md border-b border-[#17171A]" : "bg-gradient-to-b from-black/60 to-transparent"}`}
    >
      <div className={`gx-container flex items-center justify-between transition-[height] duration-500 ${scrolled ? "h-20 md:h-24" : "h-24 md:h-28"}`}>
        <Link
          to="/"
          data-testid="nav-logo"
          className="group flex items-center gap-4 -ml-1"
          aria-label="Galaxy — Home"
        >
          <BrandMark variant="logo" size={scrolled ? "md" : "lg"} className="transition-all duration-500" />
          <span
            aria-hidden
            className={`hidden md:block w-px bg-[#26262A] transition-all duration-500 ${scrolled ? "h-8 opacity-100" : "h-0 opacity-0"}`}
          />
          <span className={`hidden md:inline-block text-[10px] tracking-[0.32em] uppercase text-[#8C8880] transition-all duration-500 ${scrolled ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none absolute"}`}>
            Hair · Beauty · Style
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-9" aria-label="Primary">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.to}
              className="gx-nav-link"
              data-testid={`nav-${n.label.toLowerCase()}`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/book" className="btn-red" data-testid="nav-book-cta">
            Book Appointment <ArrowUpRight size={14} />
          </Link>
        </div>

        <button
          className="lg:hidden text-[#F2EDE4] w-11 h-11 flex items-center justify-center border border-[#26262A] rounded-full"
          onClick={() => setOpen((o) => !o)}
          data-testid="nav-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile full-screen editorial overlay */}
      <div
        className={`lg:hidden fixed inset-0 top-24 bg-[#08080A]/90 backdrop-blur-md transition-all duration-500 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        data-testid="nav-mobile"
        aria-hidden={!open}
      >
        <div className="gx-container py-12 flex flex-col gap-2 h-full">
          <p className="eyebrow mb-6">Navigate</p>
          {NAV.map((n, i) => (
            <a
              key={n.label}
              href={n.to}
              onClick={() => setOpen(false)}
              className="group flex items-center justify-between border-b border-[#17171A] py-6"
            >
              <span className="font-editorial text-3xl text-[#F2EDE4] group-hover:text-white transition-colors">
                <span className="num-tag mr-4">{String(i + 1).padStart(2, "0")}</span>
                {n.label}
              </span>
              <ArrowUpRight size={20} className="text-[#C21A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
          <Link to="/book" onClick={() => setOpen(false)} className="btn-red w-full justify-center mt-10" data-testid="nav-mobile-book">
            Book Appointment <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}
