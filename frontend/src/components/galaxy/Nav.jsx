import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

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
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <header
      data-testid="site-nav"
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${scrolled ? "bg-[#0A0A0A]/95 border-b border-[#1e1e1e]" : "bg-transparent"}`}
    >
      <div className="gx-container flex items-center justify-between h-20">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-[#B91C1C] flex items-center justify-center font-display text-white text-lg">G</span>
          <span className="font-display tracking-[0.35em] text-sm">GALAXY</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8" aria-label="Primary">
          {NAV.map((n) => (
            <a key={n.label} href={n.to} className="gx-nav-link" data-testid={`nav-${n.label.toLowerCase()}`}>
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex">
          <Link to="/book" className="btn-red" data-testid="nav-book-cta">Book Appointment</Link>
        </div>

        <button className="lg:hidden text-white" onClick={() => setOpen((o) => !o)} data-testid="nav-toggle" aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-[#0A0A0A] border-t border-[#1e1e1e]" data-testid="nav-mobile">
          <div className="gx-container py-6 flex flex-col gap-5">
            {NAV.map((n) => (
              <a key={n.label} href={n.to} className="text-sm tracking-[0.14em] uppercase text-[#DADADA]">{n.label}</a>
            ))}
            <Link to="/book" className="btn-red w-full justify-center" data-testid="nav-mobile-book">Book Appointment</Link>
          </div>
        </div>
      )}
    </header>
  );
}
