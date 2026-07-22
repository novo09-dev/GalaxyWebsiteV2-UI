import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Nav from "../components/galaxy/Nav";
import Footer from "../components/galaxy/Footer";
import {
  getBusiness, getHeroSlides, getServices, getEmployees,
  getGallery, getTestimonials, getFAQs, getCategories,
} from "../lib/api";
import { ArrowRight, Star, Sparkles, Shield, ScissorsSquare, Clock, ChevronDown, MapPin, Phone, MessageCircle } from "lucide-react";

function Hero({ slides }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!slides?.length) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides]);
  if (!slides?.length) return null;

  return (
    <section id="top" className="relative h-[100vh] min-h-[640px] overflow-hidden bg-black" data-testid="hero-section">
      {slides.map((s, idx) => (
        <div key={s.id || idx} className={`hero-slide ${idx === i ? "active" : ""}`} aria-hidden={idx !== i}>
          <img src={s.image} alt="" className="w-full h-full object-cover opacity-80" loading={idx === 0 ? "eager" : "lazy"} />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
      ))}

      <div className="relative z-10 h-full flex items-end pb-24 md:pb-32">
        <div className="gx-container w-full">
          <p className="eyebrow mb-6" data-testid="hero-chapter">
            <span className="inline-block w-8 h-px bg-[#B91C1C] align-middle mr-3" />
            {slides[i]?.chapter}
          </p>
          <h1 className="font-editorial text-5xl md:text-7xl lg:text-8xl max-w-4xl leading-[1.05] text-white" data-testid="hero-headline">
            {slides[i]?.headline}
          </h1>
          <p className="mt-6 text-[#C9C9C9] max-w-xl leading-relaxed text-base md:text-lg font-body">
            {slides[i]?.description}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/book" className="btn-red" data-testid="hero-book-cta">
              Book an Appointment <ArrowRight size={16} />
            </Link>
            <a href="#services" className="btn-ghost">Our Services</a>
          </div>

          <div className="mt-16 flex items-center gap-3">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-[2px] transition-all duration-300 ${idx === i ? "w-14 bg-[#B91C1C]" : "w-8 bg-white/25 hover:bg-white/50"}`}
                data-testid={`hero-dot-${idx}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyChoose() {
  const items = [
    { icon: ScissorsSquare, title: "Expert Stylists", copy: "Trained, certified, obsessed with detail." },
    { icon: Sparkles, title: "Premium Products", copy: "Trusted brands, safe for every skin & scalp." },
    { icon: Star, title: "Personalised Care", copy: "Every service tailored around you." },
    { icon: Shield, title: "Hygiene First", copy: "Sterilised tools, single-use where it matters." },
  ];
  return (
    <section id="about" className="section bg-[#0A0A0A]" data-testid="why-section">
      <div className="gx-container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end mb-14">
          <div className="md:col-span-6">
            <p className="eyebrow mb-4">Why Galaxy</p>
            <h2 className="font-editorial text-4xl md:text-5xl leading-[1.05]">More than a salon.<br /><span className="text-[#B91C1C]">An experience.</span></h2>
          </div>
          <p className="md:col-span-6 text-[#B9B9B9] leading-relaxed">
            At Galaxy we combine expertise, behaviour and genuine care to create results that last. Your comfort, your trust and your satisfaction are what drive us — every single day.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((it, idx) => (
            <div key={idx} className="gx-card p-6 md:p-8" data-testid={`why-item-${idx}`}>
              <div className="w-10 h-10 border border-[#2A2A2A] flex items-center justify-center mb-6">
                <it.icon size={16} className="text-[#B91C1C]" />
              </div>
              <p className="font-display text-lg tracking-tight">{it.title}</p>
              <p className="text-[#8F8F8F] text-sm mt-2 leading-relaxed">{it.copy}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 border-t border-[#1a1a1a] pt-10">
          {[["7+","Years of experience"],["10K+","Happy clients"],["20+","Trained stylists"],["4.9★","Average rating"]].map(([n, l]) => (
            <div key={l}>
              <p className="font-editorial text-4xl md:text-5xl">{n}</p>
              <p className="eyebrow mt-2">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedServices({ services, categories }) {
  const featured = services.filter((s) => s.featured).slice(0, 8);
  const catMap = Object.fromEntries((categories || []).map((c) => [c.id, c]));
  return (
    <section id="services" className="section bg-[#0d0d0d]" data-testid="services-section">
      <div className="gx-container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <p className="eyebrow mb-4">Our Services</p>
            <h2 className="font-editorial text-4xl md:text-5xl leading-[1.05]">Services that <span className="text-[#B91C1C]">define you.</span></h2>
          </div>
          <p className="max-w-md text-[#B9B9B9]">From classic cuts to advanced treatments — we bring out the best in you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featured.map((s) => (
            <div key={s.id} className="gx-card p-6 md:p-8 flex items-center gap-6" data-testid={`featured-service-${s.id}`}>
              <img src={s.image} alt="" className="w-24 h-24 md:w-28 md:h-28 object-cover" loading="lazy" />
              <div className="flex-1 min-w-0">
                <p className="eyebrow text-[10px] mb-1">{catMap[s.category_id]?.name || s.group}</p>
                <p className="font-display text-xl">{s.name}</p>
                <div className="flex items-center gap-4 text-xs text-[#8F8F8F] mt-2">
                  <span className="flex items-center gap-1"><Clock size={12} /> {s.duration} min</span>
                  <span>₹{s.price.toLocaleString()}</span>
                  <span className="text-[#B91C1C]">Booking ₹{s.deposit.toLocaleString()}</span>
                </div>
              </div>
              <Link to={`/book?service=${s.id}`} className="btn-ghost hidden sm:inline-flex">Book</Link>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link to="/book" className="btn-red inline-flex" data-testid="services-view-all">See Full Menu <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}

function Team({ team }) {
  return (
    <section id="team" className="section bg-[#0A0A0A]" data-testid="team-section">
      <div className="gx-container">
        <div className="mb-14 max-w-2xl">
          <p className="eyebrow mb-4">Meet the Team</p>
          <h2 className="font-editorial text-4xl md:text-5xl leading-[1.05]">Hands you can <span className="text-[#B91C1C]">trust.</span></h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {team.map((e) => (
            <div key={e.id} className="gx-card overflow-hidden" data-testid={`team-member-${e.id}`}>
              <div className="aspect-[4/5] overflow-hidden bg-[#1a1a1a]">
                <img src={e.photo} alt={e.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-5">
                <p className="font-display text-lg">{e.name}</p>
                <p className="text-[#8F8F8F] text-xs mt-1">{e.position}</p>
                <p className="text-[#B9B9B9] text-sm mt-3 leading-relaxed line-clamp-2">{e.specialty}</p>
                <div className="flex items-center gap-1 mt-4 text-xs text-[#B91C1C]"><Star size={12} fill="#B91C1C" /> {e.rating}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery({ items }) {
  const [lb, setLb] = useState(null);
  return (
    <section id="gallery" className="section bg-[#0d0d0d]" data-testid="gallery-section">
      <div className="gx-container">
        <div className="mb-14 flex justify-between items-end flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-4">Gallery</p>
            <h2 className="font-editorial text-4xl md:text-5xl leading-[1.05]">Inside the studio.</h2>
          </div>
          <p className="max-w-sm text-[#B9B9B9] text-sm">Every space, every chair, every detail — designed for calm and quality.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((g, idx) => (
            <button
              key={g.id}
              onClick={() => setLb(g.image)}
              className={`overflow-hidden aspect-square bg-[#1a1a1a] ${idx % 5 === 0 ? "md:row-span-2 md:aspect-auto md:h-full" : ""}`}
              data-testid={`gallery-item-${idx}`}
            >
              <img src={g.image} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
      {lb && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-6" onClick={() => setLb(null)} data-testid="lightbox">
          <img src={lb} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </section>
  );
}

function Testimonials({ items }) {
  return (
    <section className="section bg-[#0A0A0A]" data-testid="testimonials-section">
      <div className="gx-container">
        <div className="mb-14 max-w-2xl">
          <p className="eyebrow mb-4">Testimonials</p>
          <h2 className="font-editorial text-4xl md:text-5xl leading-[1.05]">Kind words from our <span className="text-[#B91C1C]">chairs.</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((t) => (
            <div key={t.id} className="gx-card p-8" data-testid={`testimonial-${t.id}`}>
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => <Star key={i} size={14} className="text-[#B91C1C]" fill="#B91C1C" />)}
              </div>
              <p className="font-editorial text-xl md:text-2xl leading-snug">"{t.review}"</p>
              <p className="mt-6 eyebrow">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="section bg-[#0d0d0d]" data-testid="faq-section">
      <div className="gx-container grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <p className="eyebrow mb-4">FAQ</p>
          <h2 className="font-editorial text-4xl md:text-5xl leading-[1.05]">Questions, answered.</h2>
        </div>
        <div className="md:col-span-8 space-y-3">
          {items.map((f, idx) => (
            <div key={f.id} className="border-b border-[#1e1e1e]" data-testid={`faq-${idx}`}>
              <button onClick={() => setOpen(open === idx ? -1 : idx)} className="w-full flex items-center justify-between py-5 text-left">
                <span className="font-display text-lg">{f.question}</span>
                <ChevronDown size={18} className={`transition-transform ${open === idx ? "rotate-180 text-[#B91C1C]" : "text-[#8F8F8F]"}`} />
              </button>
              {open === idx && <p className="pb-6 text-[#B9B9B9] leading-relaxed max-w-3xl">{f.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ business }) {
  const b = business || {};
  const wa = (b.whatsapp || b.phone || "").replace(/\D/g, "");
  return (
    <section id="contact" className="section bg-[#0A0A0A]" data-testid="contact-section">
      <div className="gx-container grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <p className="eyebrow mb-4">Contact</p>
          <h2 className="font-editorial text-4xl md:text-5xl leading-[1.05]">Come say hello.</h2>
          <p className="text-[#B9B9B9] mt-6 leading-relaxed max-w-md">Walk-ins welcome. For a guaranteed slot with your preferred stylist, book online in under 2 minutes.</p>

          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex gap-3"><MapPin size={16} className="text-[#B91C1C] mt-0.5" /><span className="text-[#DADADA]">{b.address}</span></li>
            <li className="flex gap-3"><Phone size={16} className="text-[#B91C1C] mt-0.5" /><a href={`tel:${b.phone}`} className="text-[#DADADA] hover:text-white">{b.phone}</a></li>
            <li className="flex gap-3"><Clock size={16} className="text-[#B91C1C] mt-0.5" /><span className="text-[#DADADA]">{b.working_hours_text}</span></li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/book" className="btn-red">Book Appointment</Link>
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn-ghost"><MessageCircle size={14} /> WhatsApp</a>}
          </div>
        </div>

        <div className="md:col-span-7">
          <div className="aspect-[16/12] w-full bg-[#111] border border-[#1e1e1e] overflow-hidden">
            <iframe
              title="Galaxy Salon Location"
              src="https://www.google.com/maps?q=Jail+Ashram+Road+Dhaleswar+Agartala+Tripura&output=embed"
              className="w-full h-full grayscale contrast-125 opacity-90"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const [state, setState] = useState({ slides: [], services: [], employees: [], gallery: [], testimonials: [], faqs: [], categories: [], business: null });

  useEffect(() => {
    (async () => {
      const [slides, services, employees, gallery, testimonials, faqs, categories, business] = await Promise.all([
        getHeroSlides(), getServices(), getEmployees(), getGallery(), getTestimonials(), getFAQs(), getCategories(), getBusiness(),
      ]);
      setState({ slides, services, employees, gallery, testimonials, faqs, categories, business });
    })();
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Hero slides={state.slides} />
        <WhyChoose />
        <FeaturedServices services={state.services} categories={state.categories} />
        <Team team={state.employees} />
        <Gallery items={state.gallery} />
        <Testimonials items={state.testimonials} />
        <FAQSection items={state.faqs} />
        <Contact business={state.business} />
      </main>
      <Footer business={state.business} />
    </>
  );
}
