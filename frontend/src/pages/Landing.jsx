import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Nav from "../components/galaxy/Nav";
import Footer from "../components/galaxy/Footer";
import Eyebrow from "../components/galaxy/primitives/Eyebrow";
import EditorialHeading from "../components/galaxy/primitives/EditorialHeading";
import Reveal from "../components/galaxy/primitives/Reveal";
import Marquee from "../components/galaxy/primitives/Marquee";
import ServiceCard from "../components/galaxy/cards/ServiceCard";
import TeamCard from "../components/galaxy/cards/TeamCard";
import TestimonialCard from "../components/galaxy/cards/TestimonialCard";
import FeatureItem from "../components/galaxy/cards/FeatureItem";
import GalleryTile from "../components/galaxy/cards/GalleryTile";
import {
  getBusiness, getHeroSlides, getServices, getEmployees,
  getGallery, getTestimonials, getFAQs, getCategories,
} from "../lib/api";
import {
  ArrowUpRight, ArrowRight, Star, Sparkles, Shield, ScissorsSquare, Clock,
  ChevronDown, MapPin, Phone, MessageCircle, X as XIcon, Award, Leaf, HandHeart,
} from "lucide-react";

/* ==================================================================
 * HERO — cinematic split with slide rail + editorial typography
 * ================================================================== */
function Hero({ slides }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!slides?.length) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides]);
  if (!slides?.length) {
    return (
      <section id="top" className="relative h-[100vh] min-h-[720px] bg-[#08080A]" data-testid="hero-section" />
    );
  }
  const slide = slides[i];

  return (
    <section
      id="top"
      className="relative h-[100vh] min-h-[720px] overflow-hidden bg-black flex flex-col"
      data-testid="hero-section"
    >
      {/* Background slides */}
      {slides.map((s, idx) => (
        <div key={s.id || idx} className={`hero-slide ${idx === i ? "active" : ""}`} aria-hidden={idx !== i}>
          <img
            src={s.image}
            alt=""
            className="hero-kb w-full h-full object-cover"
            loading={idx === 0 ? "eager" : "lazy"}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
      ))}

      {/* Masthead strip — pinned below fixed nav, cannot collide with content */}
      <div className="relative z-10 pt-28 md:pt-32">
        <div className="gx-container">
          <div className="flex items-center justify-between pb-4 md:pb-5 border-b border-white/10">
            <span className="flex items-center gap-3 text-[10px] md:text-[11px] tracking-[0.32em] uppercase text-[#D9D3C6]/80">
              <span className="red-rule" />
              <span className="hidden sm:inline">Hair · Beauty · Style</span>
              <span className="sm:hidden">Agartala · Since 2015</span>
            </span>
            <span className="text-[10px] md:text-[11px] tracking-[0.32em] uppercase text-[#D9D3C6]/70 tabular-nums">
              {String(i + 1).padStart(2, "0")} <span className="opacity-40 mx-1">/</span> {String(slides.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom-anchored content */}
      <div className="relative z-10 flex-1 flex items-end pb-16 md:pb-24">
        <div className="gx-container w-full grid grid-cols-12 gap-6 md:gap-10 items-end">
          <div className="col-span-12 lg:col-span-8">
            <p className="eyebrow-lg mb-5 md:mb-6" data-testid="hero-chapter">
              <span className="red-rule-lg mr-4" />
              {slide?.chapter}
            </p>
            <h1
              className="font-editorial text-[2.75rem] sm:text-6xl md:text-7xl lg:text-8xl xl:text-[8.5rem] leading-[0.95] tracking-[-0.02em] text-[#F2EDE4] max-w-[18ch]"
              data-testid="hero-headline"
            >
              {slide?.headline}
            </h1>
            <p className="mt-6 md:mt-8 text-[#D9D3C6] max-w-xl leading-relaxed text-base md:text-lg">
              {slide?.description}
            </p>
            <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-3 md:gap-4">
              <Link to="/book" className="btn-red" data-testid="hero-book-cta">
                Book an Appointment <ArrowUpRight size={14} />
              </Link>
              <a href="#services" className="btn-ghost">Our Services</a>
            </div>
          </div>

          {/* Slide rail (desktop) */}
          <div className="hidden lg:flex col-span-4 justify-end items-end">
            <div className="flex flex-col gap-4 w-56">
              {slides.map((s, idx) => (
                <button
                  key={s.id || idx}
                  onClick={() => setI(idx)}
                  className={`group text-left transition-all duration-500 ${idx === i ? "opacity-100" : "opacity-45 hover:opacity-80"}`}
                  data-testid={`hero-dot-${idx}`}
                  aria-label={`Slide ${idx + 1}: ${s.chapter}`}
                >
                  <span className={`rail-dot block ${idx === i ? "w-full active" : "w-8"}`} style={{ height: 1 }} />
                  <span className="mt-3 block text-[10px] tracking-[0.28em] uppercase text-[#F2EDE4]">{s.chapter}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile dots */}
          <div className="lg:hidden col-span-12 flex items-center gap-3 mt-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-[2px] transition-all duration-300 ${idx === i ? "w-12 bg-[#C21A1A]" : "w-6 bg-white/25"}`}
                data-testid={`hero-dot-${idx}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll cue (large screens only, safely off content) */}
      <div className="hidden xl:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-2 text-[#F2EDE4]/60 pointer-events-none">
        <span className="text-[10px] tracking-[0.32em] uppercase">Scroll</span>
        <span className="w-px h-8 bg-[#F2EDE4]/30" />
      </div>
    </section>
  );
}

/* ==================================================================
 * WHY GALAXY — asymmetric feature grid + editorial stats
 * ================================================================== */
function WhyGalaxy({ business }) {
  const items = [
    { icon: ScissorsSquare, title: "Expert stylists", copy: "Trained, certified, obsessed with detail. Every hand at Galaxy has been chosen for craft." },
    { icon: Sparkles, title: "Premium products", copy: "Trusted global brands, safe for every skin & scalp — nothing generic, nothing rushed." },
    { icon: HandHeart, title: "Personalised care", copy: "Every service tailored around your hair, your skin, your day. A consult before every cut." },
    { icon: Shield, title: "Hygiene first", copy: "Sterilised tools, single-use where it matters, and a studio you would happily bring family into." },
  ];
  const stats = [
    { n: "11+", l: "Years of experience" },
    { n: "20K+", l: "Happy clients" },
    { n: "20+", l: "Trained stylists" },
    { n: "4.4", l: "Average rating", sup: "★" },
  ];
  return (
    <section id="about" className="section bg-[#0A0A0C]" data-testid="why-section">
      <div className="gx-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-end mb-14 md:mb-20">
          <Reveal className="col-span-12 md:col-span-7">
            <Eyebrow>Why Galaxy</Eyebrow>
            <EditorialHeading as="h2" size="lg" className="mt-6">
              More than a salon.<br />
              <span className="italic-accent text-[#C21A1A]">An experience.</span>
            </EditorialHeading>
          </Reveal>
          <Reveal delay={0.1} className="col-span-12 md:col-span-5">
            <p className="text-[#B9B5AB] leading-relaxed text-base md:text-lg max-w-md">
              {business?.about || "At Galaxy we combine expertise, behaviour and genuine care to create results that last. Your comfort, your trust and your satisfaction are what drive us — every single day."}
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {items.map((it, idx) => (
            <Reveal key={it.title} delay={idx * 0.08} data-testid={`why-item-${idx}`}>
              <FeatureItem Icon={it.icon} title={it.title} copy={it.copy} index={idx} />
            </Reveal>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 mt-20 md:mt-28 border-t border-[#17171A] pt-10 md:pt-14">
          {stats.map((s, idx) => (
            <Reveal key={s.l} delay={idx * 0.06}>
              <div>
                <p className="font-editorial text-5xl md:text-6xl lg:text-7xl text-[#F2EDE4] leading-none">
                  {s.n}{s.sup && <span className="italic-accent text-[#C21A1A] text-3xl md:text-4xl">{s.sup}</span>}
                </p>
                <p className="eyebrow mt-3">{s.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
 * FEATURED SERVICES — bento (large + supporting cards)
 * ================================================================== */
function FeaturedServices({ services, categories }) {
  const featured = services.filter((s) => s.featured);
  const catMap = Object.fromEntries((categories || []).map((c) => [c.id, c.name]));
  const [hero, ...rest] = featured;
  const shown = rest.slice(0, 7);

  if (!hero) {
    return null;
  }

  return (
    <section id="services" className="section bg-[#08080A]" data-testid="services-section">
      <div className="gx-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-end mb-14 md:mb-20">
          <Reveal className="col-span-12 md:col-span-8">
            <Eyebrow>Our Services</Eyebrow>
            <EditorialHeading as="h2" size="lg" className="mt-6">
              Services that <span className="italic-accent text-[#C21A1A]">define you.</span>
            </EditorialHeading>
          </Reveal>
          <Reveal delay={0.1} className="col-span-12 md:col-span-4">
            <p className="text-[#B9B5AB] leading-relaxed max-w-md md:text-right md:ml-auto">
              From a quiet trim to a full transformation — considered, honest, and shaped around your hair, your skin, and the life you actually live.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 lg:col-span-7">
            <Reveal>
              <ServiceCard
                service={hero}
                categoryName={catMap[hero.category_id]}
                testid={`featured-service-${hero.id}`}
                size="lg"
              />
            </Reveal>
          </div>
          <div className="col-span-12 lg:col-span-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
            {shown.slice(0, 2).map((s, i) => (
              <Reveal key={s.id} delay={0.05 + i * 0.05}>
                <ServiceCard service={s} categoryName={catMap[s.category_id]} testid={`featured-service-${s.id}`} />
              </Reveal>
            ))}
          </div>
        </div>

        {shown.length > 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6">
            {shown.slice(2, 8).map((s, i) => (
              <Reveal key={s.id} delay={i * 0.05}>
                <ServiceCard service={s} categoryName={catMap[s.category_id]} testid={`featured-service-${s.id}`} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-14 md:mt-20 flex flex-col md:flex-row items-center justify-center gap-4">
          <Link to="/book" className="btn-red" data-testid="services-view-all">
            See Full Menu <ArrowUpRight size={14} />
          </Link>
          <p className="text-xs text-[#8C8880] tracking-widest uppercase">{services.length} services · Two studios in one</p>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
 * TEAM — 4-up grid with grayscale-to-color hover
 * ================================================================== */
function Team({ team }) {
  if (!team?.length) return null;
  return (
    <section id="team" className="section bg-[#0A0A0C]" data-testid="team-section">
      <div className="gx-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-end mb-14 md:mb-20">
          <Reveal className="col-span-12 md:col-span-7">
            <Eyebrow>Meet the Team</Eyebrow>
            <EditorialHeading as="h2" size="lg" className="mt-6">
              Hands you can <span className="italic-accent text-[#C21A1A]">trust.</span>
            </EditorialHeading>
          </Reveal>
          <Reveal delay={0.1} className="col-span-12 md:col-span-5">
            <p className="text-[#B9B5AB] leading-relaxed max-w-md md:text-right md:ml-auto">
              A hand-picked studio of stylists, colourists and treatment specialists — each chosen for craft, temperament and hygiene discipline.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {team.map((e, i) => (
            <Reveal key={e.id} delay={i * 0.06}>
              <TeamCard employee={e} index={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
 * EDITORIAL CTA BANNER
 * ================================================================== */
function BookingBanner() {
  return (
    <section className="relative bg-[#C21A1A] overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-black/40 via-transparent to-black/40" />
      <div className="grain-overlay relative gx-container py-16 md:py-24 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-white/70">Reserve your chair</p>
          <p className="font-editorial text-4xl md:text-6xl lg:text-7xl leading-[0.95] text-white mt-4">
            Book your slot.<br />
            <span className="italic-accent">We&apos;ll take it from there.</span>
          </p>
          <p className="text-white/85 mt-5 text-sm md:text-base max-w-md">
            60 seconds to book. A small deposit secures your appointment — the rest is settled at the salon.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <Link
            to="/book"
            className="inline-flex items-center gap-3 bg-black text-white uppercase tracking-[0.14em] text-xs font-semibold px-8 py-5 rounded-full border border-black hover:bg-[#111] transition-colors"
          >
            Book Appointment <ArrowUpRight size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ==================================================================
 * GALLERY — bento with lightbox
 * ================================================================== */
function Gallery({ items }) {
  const [lb, setLb] = useState(null);
  const [lbIdx, setLbIdx] = useState(0);
  if (!items?.length) return null;

  const open = (idx) => { setLbIdx(idx); setLb(items[idx].image); };
  const close = () => setLb(null);
  const nav = (dir) => {
    const n = (lbIdx + dir + items.length) % items.length;
    setLbIdx(n); setLb(items[n].image);
  };

  // Pattern: (2 col x 1 row) (1 col x 2 row tall) (1 col x 1) (1 col x 1) (1 col x 1) (2 col x 1)
  // Simplified responsive pattern with span classes.
  const patterns = [
    { span: "md:col-span-2 md:row-span-1", aspect: "aspect-[16/10]" },
    { span: "md:col-span-1 md:row-span-2", aspect: "aspect-[3/4] md:aspect-auto md:h-full" },
    { span: "md:col-span-1 md:row-span-1", aspect: "aspect-square" },
    { span: "md:col-span-1 md:row-span-1", aspect: "aspect-square" },
    { span: "md:col-span-2 md:row-span-1", aspect: "aspect-[16/10]" },
    { span: "md:col-span-1 md:row-span-1", aspect: "aspect-square" },
    { span: "md:col-span-2 md:row-span-1", aspect: "aspect-[16/9]" },
    { span: "md:col-span-1 md:row-span-1", aspect: "aspect-square" },
  ];

  return (
    <section id="gallery" className="section bg-[#08080A]" data-testid="gallery-section">
      <div className="gx-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-end mb-14 md:mb-20">
          <Reveal className="col-span-12 md:col-span-7">
            <Eyebrow>Gallery</Eyebrow>
            <EditorialHeading as="h2" size="lg" className="mt-6">
              Small moments, <span className="italic-accent text-[#C21A1A]">big smiles.</span>
            </EditorialHeading>
          </Reveal>
          <Reveal delay={0.1} className="col-span-12 md:col-span-5">
            <p className="text-[#B9B5AB] leading-relaxed max-w-md md:text-right md:ml-auto">
              A typical greatest-hits from the studio — the seats, the transformations, and those blowdry moments you never want to end.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 md:grid-flow-row-dense gap-3 md:gap-4 auto-rows-[180px] sm:auto-rows-[220px] md:auto-rows-[260px] lg:auto-rows-[300px] xl:auto-rows-[340px]">
          {items.slice(0, 8).map((g, idx) => {
            const p = patterns[idx] || patterns[patterns.length - 1];
            return (
              <GalleryTile
                key={g.id}
                item={g}
                index={idx}
                span={p.span}
                aspectClass={""}
                onClick={() => open(idx)}
              />
            );
          })}
        </div>
      </div>

      {lb && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-6"
          onClick={close}
          data-testid="lightbox"
        >
          <button
            className="absolute top-6 right-6 w-11 h-11 rounded-full border border-white/25 flex items-center justify-center text-white hover:border-white transition-colors"
            onClick={(e) => { e.stopPropagation(); close(); }}
            aria-label="Close"
          >
            <XIcon size={16} />
          </button>
          <img src={lb} alt="" className="max-h-[86vh] max-w-[92vw] object-contain" onClick={(e) => e.stopPropagation()} />
          <button
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-white/25 flex items-center justify-center text-white hover:border-white transition-colors"
            onClick={(e) => { e.stopPropagation(); nav(-1); }}
            aria-label="Previous"
          >
            <ChevronDown className="rotate-90" size={16} />
          </button>
          <button
            className="absolute right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-white/25 flex items-center justify-center text-white hover:border-white transition-colors"
            onClick={(e) => { e.stopPropagation(); nav(1); }}
            aria-label="Next"
          >
            <ChevronDown className="-rotate-90" size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

/* ==================================================================
 * TESTIMONIALS
 * ================================================================== */
function Testimonials({ items }) {
  if (!items?.length) return null;
  const [feature, ...rest] = items;
  return (
    <section className="section bg-[#0A0A0C]" data-testid="testimonials-section">
      <div className="gx-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-end mb-14 md:mb-20">
          <Reveal className="col-span-12 md:col-span-7">
            <Eyebrow>Testimonials</Eyebrow>
            <EditorialHeading as="h2" size="lg" className="mt-6">
              Kind words from <span className="italic-accent text-[#C21A1A]">our chairs.</span>
            </EditorialHeading>
          </Reveal>
          <Reveal delay={0.1} className="col-span-12 md:col-span-5">
            <p className="text-[#B9B5AB] leading-relaxed max-w-md md:text-right md:ml-auto">
              Unedited notes from clients who trust us with cuts, colour and treatments — sometimes on their happiest days.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
          <div className="lg:col-span-3">
            <Reveal>
              <TestimonialCard item={feature} size="lg" />
            </Reveal>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
            {rest.map((t, i) => (
              <Reveal key={t.id} delay={0.05 + i * 0.05}>
                <TestimonialCard item={t} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
 * FAQ — numbered accordion
 * ================================================================== */
function FAQSection({ items }) {
  const [open, setOpen] = useState(0);
  if (!items?.length) return null;
  return (
    <section className="section bg-[#08080A]" data-testid="faq-section">
      <div className="gx-container grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
        <Reveal className="md:col-span-4">
          <Eyebrow>FAQ</Eyebrow>
          <EditorialHeading as="h2" size="lg" className="mt-6">
            Questions, <span className="italic-accent text-[#C21A1A]">answered.</span>
          </EditorialHeading>
          <p className="text-[#8C8880] text-sm mt-6 max-w-xs leading-relaxed">
            Still curious? Drop us a message on WhatsApp or call the studio directly.
          </p>
        </Reveal>

        <div className="md:col-span-8">
          {items.map((f, idx) => {
            const active = open === idx;
            return (
              <div key={f.id} className="border-b border-[#17171A]" data-testid={`faq-${idx}`}>
                <button
                  onClick={() => setOpen(active ? -1 : idx)}
                  className="w-full flex items-start gap-6 py-6 md:py-7 text-left group"
                  aria-expanded={active}
                >
                  <span className="num-tag mt-1 shrink-0">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-editorial text-xl md:text-2xl text-[#F2EDE4] group-hover:text-white transition-colors leading-snug">
                    {f.question}
                  </span>
                  <span className={`shrink-0 w-9 h-9 rounded-full border border-[#26262A] flex items-center justify-center text-[#F2EDE4] transition-all ${active ? "bg-[#C21A1A] border-[#C21A1A] rotate-180" : "group-hover:border-[#C21A1A]"}`}>
                    <ChevronDown size={14} />
                  </span>
                </button>
                <div className={`grid transition-all duration-500 ease-out ${active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="pb-6 md:pb-8 pl-12 pr-4 text-[#B9B5AB] leading-relaxed text-[15px] max-w-3xl">{f.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
 * CONTACT — two-column with dynamic map query
 * ================================================================== */
function Contact({ business }) {
  const b = business || {};
  const wa = (b.whatsapp || b.phone || "").replace(/\D/g, "");
  const mapQuery = encodeURIComponent(b.address || "Dhaleswar Agartala Tripura");
  return (
    <section id="contact" className="section bg-[#0A0A0C]" data-testid="contact-section">
      <div className="gx-container grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
        <Reveal className="md:col-span-5">
          <Eyebrow>Contact</Eyebrow>
          <EditorialHeading as="h2" size="lg" className="mt-6">
            Come say <span className="italic-accent text-[#C21A1A]">hello.</span>
          </EditorialHeading>
          <p className="text-[#B9B5AB] mt-6 leading-relaxed max-w-md">
            Walk-ins welcome. For a guaranteed slot with your preferred stylist, book online in under two minutes.
          </p>

          <ul className="mt-10 space-y-6 text-sm">
            {b.address && (
              <li className="flex gap-4">
                <MapPin size={16} className="text-[#C21A1A] mt-0.5 shrink-0" />
                <div>
                  <p className="eyebrow mb-1">Visit</p>
                  <p className="text-[#F2EDE4] leading-relaxed">{b.address}</p>
                </div>
              </li>
            )}
            {b.phone && (
              <li className="flex gap-4">
                <Phone size={16} className="text-[#C21A1A] mt-0.5 shrink-0" />
                <div>
                  <p className="eyebrow mb-1">Call</p>
                  <a href={`tel:${b.phone}`} className="text-[#F2EDE4] hover:text-white">{b.phone}</a>
                </div>
              </li>
            )}
            {b.working_hours_text && (
              <li className="flex gap-4">
                <Clock size={16} className="text-[#C21A1A] mt-0.5 shrink-0" />
                <div>
                  <p className="eyebrow mb-1">Open</p>
                  <p className="text-[#F2EDE4]">{b.working_hours_text}</p>
                </div>
              </li>
            )}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/book" className="btn-red">Book Appointment <ArrowUpRight size={14} /></Link>
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn-ghost">
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="md:col-span-7">
          <div className="relative aspect-[16/12] w-full bg-[#111113] border border-[#17171A] overflow-hidden">
            <iframe
              title="Galaxy Salon Location"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              className="w-full h-full grayscale contrast-125 opacity-90"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#26262A]" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ==================================================================
 * LANDING PAGE — composition
 * ================================================================== */
export default function Landing() {
  const [state, setState] = useState({
    slides: [], services: [], employees: [], gallery: [],
    testimonials: [], faqs: [], categories: [], business: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const [slides, services, employees, gallery, testimonials, faqs, categories, business] = await Promise.all([
          getHeroSlides(), getServices(), getEmployees(), getGallery(),
          getTestimonials(), getFAQs(), getCategories(), getBusiness(),
        ]);
        setState({ slides, services, employees, gallery, testimonials, faqs, categories, business });
      } catch (e) {
        // Fail quietly — sections gracefully hide when empty.
      }
    })();
  }, []);

  const marqueeItems = useMemo(() => ([
    "Signature Cuts", "Colour & Highlights", "Keratin & Treatments",
    "Beard Craft", "Facials", "Since 2015", "Agartala", "Unisex Studio",
  ]), []);

  return (
    <>
      <Nav />
      <main>
        <Hero slides={state.slides} />
        <Marquee items={marqueeItems} />
        <WhyGalaxy business={state.business} />
        <FeaturedServices services={state.services} categories={state.categories} />
        <BookingBanner />
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
