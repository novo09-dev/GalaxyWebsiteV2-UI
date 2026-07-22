import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Nav from "../components/galaxy/Nav";
import Footer from "../components/galaxy/Footer";
import { getBooking, getBusiness } from "../lib/api";
import { CheckCircle2, CalendarDays, Clock, User, Phone, MapPin, ArrowRight } from "lucide-react";

export default function BookingConfirmation() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  const [biz, setBiz] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [bk, business] = await Promise.all([getBooking(id), getBusiness()]);
        setB(bk); setBiz(business);
      } catch {}
    })();
  }, [id]);

  return (
    <>
      <Nav />
      <main className="pt-32 pb-24 min-h-screen" data-testid="confirmation-page">
        <div className="gx-container max-w-3xl">
          {b ? (
            <>
              <div className="text-center mb-10">
                <div className="w-14 h-14 mx-auto border border-[#B91C1C] flex items-center justify-center mb-6">
                  <CheckCircle2 size={26} className="text-[#B91C1C]" />
                </div>
                <p className="eyebrow mb-3">Booking Confirmed</p>
                <h1 className="font-editorial text-4xl md:text-5xl">See you soon, {b.customer_name.split(" ")[0]}.</h1>
                <p className="text-[#8F8F8F] mt-4">Your booking ID is <span className="text-white tracking-widest">{b.booking_code}</span></p>
              </div>

              <div className="gx-card p-8 space-y-6" data-testid="confirmation-details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div><p className="text-[#8F8F8F] text-xs mb-1">Service</p><p className="font-display">{b.service_name}</p></div>
                  <div><p className="text-[#8F8F8F] text-xs mb-1">Professional</p><p className="font-display">{b.employee_name}</p></div>
                  <div className="flex gap-3"><CalendarDays size={16} className="text-[#B91C1C] mt-0.5" /><div><p className="text-[#8F8F8F] text-xs">Date</p><p>{b.date}</p></div></div>
                  <div className="flex gap-3"><Clock size={16} className="text-[#B91C1C] mt-0.5" /><div><p className="text-[#8F8F8F] text-xs">Time</p><p>{b.start_time} – {b.end_time}</p></div></div>
                </div>
                <div className="border-t border-[#1e1e1e] pt-6 grid grid-cols-3 gap-6 text-sm">
                  <div><p className="text-[#8F8F8F] text-xs mb-1">Total</p><p>₹{b.price.toLocaleString()}</p></div>
                  <div><p className="text-[#8F8F8F] text-xs mb-1">Deposit Paid</p><p className="text-[#B91C1C]">₹{b.deposit.toLocaleString()}</p></div>
                  <div><p className="text-[#8F8F8F] text-xs mb-1">Pay at Salon</p><p>₹{b.balance.toLocaleString()}</p></div>
                </div>
              </div>

              {biz && (
                <div className="mt-8 gx-card p-6 text-sm text-[#B9B9B9]">
                  <p className="eyebrow mb-4">Visit us</p>
                  <div className="space-y-3">
                    <p className="flex gap-3"><MapPin size={14} className="text-[#B91C1C] mt-0.5" /> {biz.address}</p>
                    <p className="flex gap-3"><Phone size={14} className="text-[#B91C1C] mt-0.5" /> <a href={`tel:${biz.phone}`} className="hover:text-white">{biz.phone}</a></p>
                  </div>
                </div>
              )}

              <div className="mt-10 flex flex-wrap gap-3 justify-center">
                <Link to="/" className="btn-ghost">Back to Home</Link>
                <Link to="/book" className="btn-red">Book Another <ArrowRight size={14} /></Link>
              </div>
            </>
          ) : (
            <p className="text-center text-[#8F8F8F] mt-40">Loading booking…</p>
          )}
        </div>
      </main>
      <Footer business={biz} />
    </>
  );
}
