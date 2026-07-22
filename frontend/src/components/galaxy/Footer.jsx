import { Link } from "react-router-dom";
import { Phone, MapPin, Instagram, Facebook } from "lucide-react";

export default function Footer({ business }) {
  const b = business || {};
  return (
    <footer className="border-t border-[#1a1a1a] bg-[#0A0A0A]" data-testid="site-footer">
      <div className="gx-container py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="mb-4">
            <img
              src="https://customer-assets-v7afamib.emergentagent.net/job_appointment-hub-969/artifacts/9d3zwini_Brand%20logo.png"
              alt="Galaxy — Hair · Beauty · Style"
              className="h-16 w-auto"
            />
          </div>
          <p className="text-[#8F8F8F] max-w-md leading-relaxed text-sm">
            {b.about || "A unisex Hair, Beauty & Style studio. Expertise, hygiene and genuine care — always."}
          </p>
        </div>

        <div>
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-3 text-sm">
            <li><a href="/#services" className="hover:text-white text-[#B9B9B9]">Services</a></li>
            <li><a href="/#team" className="hover:text-white text-[#B9B9B9]">Team</a></li>
            <li><a href="/#gallery" className="hover:text-white text-[#B9B9B9]">Gallery</a></li>
            <li><Link to="/book" className="hover:text-white text-[#B9B9B9]">Book Appointment</Link></li>
            <li><Link to="/privacy" className="hover:text-white text-[#B9B9B9]">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white text-[#B9B9B9]">Terms & Conditions</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-4">Visit</p>
          <ul className="space-y-3 text-sm text-[#B9B9B9]">
            <li className="flex items-start gap-2"><MapPin size={14} className="mt-1 text-[#B91C1C]" /><span>{b.address}</span></li>
            <li className="flex items-center gap-2"><Phone size={14} className="text-[#B91C1C]" /><a href={`tel:${b.phone}`} className="hover:text-white">{b.phone}</a></li>
            <li className="text-[#8F8F8F]">{b.working_hours_text}</li>
          </ul>
          <div className="flex gap-3 mt-5">
            {b.instagram && <a href={b.instagram} className="p-2 border border-[#2A2A2A] hover:border-[#B91C1C]" aria-label="Instagram"><Instagram size={14} /></a>}
            {b.facebook && <a href={b.facebook} className="p-2 border border-[#2A2A2A] hover:border-[#B91C1C]" aria-label="Facebook"><Facebook size={14} /></a>}
          </div>
        </div>
      </div>

      <div className="border-t border-[#1a1a1a]">
        <div className="gx-container py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#6F6F6F]">
          <p>© {new Date().getFullYear()} Galaxy · Hair · Beauty · Style. All rights reserved.</p>
          <p>Crafted with care in Agartala.</p>
        </div>
      </div>
    </footer>
  );
}
