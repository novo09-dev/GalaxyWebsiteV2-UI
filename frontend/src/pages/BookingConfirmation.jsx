import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Nav from "../components/galaxy/Nav";
import Footer from "../components/galaxy/Footer";
import Eyebrow from "../components/galaxy/primitives/Eyebrow";
import EditorialHeading from "../components/galaxy/primitives/EditorialHeading";
import Reveal from "../components/galaxy/primitives/Reveal";
import Badge from "../components/galaxy/primitives/Badge";
import { getBooking, getBusiness } from "../lib/api";
import {
  CheckCircle2, CalendarDays, Clock, MapPin, Phone, ArrowUpRight, MessageCircle, Copy, Check,
} from "lucide-react";

export default function BookingConfirmation() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  const [biz, setBiz] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [bk, business] = await Promise.all([getBooking(id), getBusiness()]);
        setB(bk); setBiz(business);
      } catch (e) {
        // Fail silently — booking may not exist yet
      }
    })();
  }, [id]);

  const copyCode = async () => {
    if (!b?.booking_code) return;
    try {
      await navigator.clipboard.writeText(b.booking_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      // clipboard unavailable — silent fallback
    }
  };

  const wa = (biz?.whatsapp || biz?.phone || "").replace(/\D/g, "");

  return (
    <>
      <Nav />
      <main className="pt-32 md:pt-40 pb-24 md:pb-32 min-h-screen bg-[#08080A]" data-testid="confirmation-page">
        <div className="gx-container max-w-4xl">
          {b ? (
            <>
              <Reveal className="text-center mb-14 md:mb-20">
                <div className="w-14 h-14 mx-auto rounded-full border border-[#C21A1A] flex items-center justify-center mb-8">
                  <CheckCircle2 size={22} className="text-[#C21A1A]" />
                </div>
                <Eyebrow className="justify-center">Booking Confirmed</Eyebrow>
                <EditorialHeading as="h1" size="lg" className="mt-6">
                  See you soon,<br />
                  <span className="italic-accent text-[#C21A1A]">{b.customer_name.split(" ")[0]}.</span>
                </EditorialHeading>

                <div className="mt-10 inline-flex items-center gap-3 border border-[#1D1D20] bg-[#0F0F11] px-5 py-3 rounded-full">
                  <span className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880]">Booking code</span>
                  <span className="font-editorial text-lg tracking-[0.24em] text-[#F2EDE4]">{b.booking_code}</span>
                  <button
                    onClick={copyCode}
                    className="w-7 h-7 rounded-full border border-[#26262A] hover:border-[#C21A1A] flex items-center justify-center text-[#D9D3C6] hover:text-white transition-colors"
                    aria-label="Copy booking code"
                  >
                    {copied ? <Check size={12} className="text-[#C21A1A]" /> : <Copy size={12} />}
                  </button>
                </div>
              </Reveal>

              <Reveal className="gx-panel p-6 md:p-10 space-y-8" data-testid="confirmation-details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="Service" value={b.service_name} />
                  <Field label="Professional" value={b.employee_name} />
                  <Field label="Date" value={b.date} Icon={CalendarDays} />
                  <Field label="Time" value={`${b.start_time} – ${b.end_time}`} Icon={Clock} />
                </div>
                <div className="border-t border-[#1D1D20] pt-6 grid grid-cols-3 gap-6">
                  <Amount label="Total" value={b.price} />
                  <Amount label="Deposit paid" value={b.deposit} accent />
                  <Amount label="Pay at salon" value={b.balance} muted />
                </div>
                {b.payment_status === "paid" && (
                  <div className="flex items-center gap-2">
                    <Badge>Payment received</Badge>
                    <span className="text-[11px] text-[#8C8880]">A confirmation has been logged in our system.</span>
                  </div>
                )}
              </Reveal>

              {biz && (
                <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="gx-panel p-6">
                    <Eyebrow>Visit us</Eyebrow>
                    <ul className="mt-4 space-y-4 text-sm">
                      {biz.address && (
                        <li className="flex gap-3">
                          <MapPin size={14} className="text-[#C21A1A] mt-0.5 shrink-0" />
                          <span className="text-[#F2EDE4] leading-relaxed">{biz.address}</span>
                        </li>
                      )}
                      {biz.phone && (
                        <li className="flex gap-3">
                          <Phone size={14} className="text-[#C21A1A] mt-0.5 shrink-0" />
                          <a href={`tel:${biz.phone}`} className="text-[#F2EDE4] hover:text-white">{biz.phone}</a>
                        </li>
                      )}
                      {biz.working_hours_text && (
                        <li className="flex gap-3">
                          <Clock size={14} className="text-[#C21A1A] mt-0.5 shrink-0" />
                          <span className="text-[#F2EDE4]">{biz.working_hours_text}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="gx-panel p-6">
                    <Eyebrow>Next steps</Eyebrow>
                    <ul className="mt-4 space-y-3 text-sm text-[#D9D3C6]">
                      <li className="flex gap-3"><span className="num-tag">01</span><span>Arrive 5 minutes before your slot.</span></li>
                      <li className="flex gap-3"><span className="num-tag">02</span><span>Show your booking code at reception.</span></li>
                      <li className="flex gap-3"><span className="num-tag">03</span><span>Free rescheduling up to 4 hours before.</span></li>
                    </ul>
                    {wa && (
                      <a
                        href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi Galaxy, this is regarding my booking ${b.booking_code}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost mt-6 w-full justify-center"
                      >
                        <MessageCircle size={13} /> Message us on WhatsApp
                      </a>
                    )}
                  </div>
                </Reveal>
              )}

              <div className="mt-14 flex flex-wrap gap-3 justify-center">
                <Link to="/" className="btn-ghost">Back to Home</Link>
                <Link to="/book" className="btn-red">Book Another <ArrowUpRight size={14} /></Link>
              </div>
            </>
          ) : (
            <div className="text-center pt-40">
              <div className="inline-block w-8 h-8 border-2 border-[#26262A] border-t-[#C21A1A] rounded-full animate-spin mb-4" />
              <p className="text-[#8C8880] text-sm tracking-widest uppercase">Loading booking…</p>
            </div>
          )}
        </div>
      </main>
      <Footer business={biz} />
    </>
  );
}

function Field({ label, value, Icon }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon size={15} className="text-[#C21A1A] mt-1 shrink-0" />}
      <div>
        <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-1">{label}</p>
        <p className="font-editorial text-lg text-[#F2EDE4] leading-tight">{value}</p>
      </div>
    </div>
  );
}

function Amount({ label, value, accent, muted }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-2">{label}</p>
      <p className={`font-editorial text-2xl ${accent ? "text-[#C21A1A]" : muted ? "text-[#D9D3C6]" : "text-[#F2EDE4]"}`}>₹{value.toLocaleString()}</p>
    </div>
  );
}
