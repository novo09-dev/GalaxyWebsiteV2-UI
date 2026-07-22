import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Nav from "../components/galaxy/Nav";
import Footer from "../components/galaxy/Footer";
import {
  getCategories, getServices, getEmployees, getAvailability, createBooking, verifyPayment, getBusiness,
} from "../lib/api";
import { ArrowLeft, ArrowRight, Check, Clock, ChevronLeft, ChevronRight, Sparkles, User, CalendarDays, IndianRupee, ShieldCheck } from "lucide-react";

const STEPS = [
  { key: "category", label: "Category" },
  { key: "service", label: "Service" },
  { key: "employee", label: "Professional" },
  { key: "date", label: "Date" },
  { key: "time", label: "Time" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
  { key: "payment", label: "Payment" },
];

function StepBar({ current }) {
  const pct = ((current + 1) / STEPS.length) * 100;
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow" data-testid="booking-step-label">Step {current + 1} of {STEPS.length} · {STEPS[current].label}</p>
        <p className="text-xs text-[#8F8F8F]">{Math.round(pct)}%</p>
      </div>
      <div className="progress-line"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Summary({ svc, emp, date, time, endTime }) {
  if (!svc) return null;
  return (
    <aside className="gx-card p-6 sticky top-28" data-testid="booking-summary">
      <p className="eyebrow mb-4">Booking Summary</p>
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-[#8F8F8F] text-xs mb-1">Service</p>
          <p className="font-display text-base">{svc.name}</p>
          <p className="text-[#8F8F8F] text-xs mt-1">{svc.duration} min · ₹{svc.price.toLocaleString()}</p>
        </div>
        {emp && (
          <div>
            <p className="text-[#8F8F8F] text-xs mb-1">Professional</p>
            <p>{emp.name}</p>
          </div>
        )}
        {date && (
          <div>
            <p className="text-[#8F8F8F] text-xs mb-1">Date & Time</p>
            <p>{date}{time ? ` · ${time}${endTime ? ` – ${endTime}` : ""}` : ""}</p>
          </div>
        )}
        <div className="border-t border-[#1e1e1e] pt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#8F8F8F]">Total</span><span>₹{svc.price.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-[#8F8F8F]">Booking Deposit</span><span className="text-[#B91C1C] font-medium">₹{svc.deposit.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-[#8F8F8F]">Balance at salon</span><span>₹{(svc.price - svc.deposit).toLocaleString()}</span></div>
        </div>
      </div>
    </aside>
  );
}

function DatePicker({ value, onChange }) {
  const [ref, setRef] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const today = new Date(); today.setHours(0,0,0,0);
  const days = useMemo(() => {
    const y = ref.getFullYear(), m = ref.getMonth();
    const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    return cells;
  }, [ref]);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))} className="p-2 border border-[#2A2A2A] hover:border-[#B91C1C]" data-testid="cal-prev"><ChevronLeft size={14} /></button>
        <p className="font-display tracking-wide">{ref.toLocaleString("en", { month: "long", year: "numeric" })}</p>
        <button onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))} className="p-2 border border-[#2A2A2A] hover:border-[#B91C1C]" data-testid="cal-next"><ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-[#8F8F8F] mb-2">
        {["S","M","T","W","T","F","S"].map((d,i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          if (!d) return <span key={i} />;
          const disabled = d < today;
          const iso = fmt(d);
          const active = value === iso;
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={`aspect-square text-sm border transition-colors ${active ? "bg-[#B91C1C] border-[#B91C1C] text-white" : disabled ? "border-[#181818] text-[#3A3A3A] cursor-not-allowed" : "border-[#232323] hover:border-[#B91C1C] text-[#DADADA]"}`}
              data-testid={`cal-day-${iso}`}
            >{d.getDate()}</button>
          );
        })}
      </div>
    </div>
  );
}

export default function Booking() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ categoryId: null, serviceId: null, employeeId: null, date: null, time: null, name: "", phone: "", email: "", notes: "", accepted: false });
  const [cats, setCats] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [slots, setSlots] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, s, e, b] = await Promise.all([getCategories(), getServices(), getEmployees(), getBusiness()]);
      setCats(c); setServices(s); setEmployees(e); setBusiness(b);
      const preService = sp.get("service");
      if (preService) {
        const svc = s.find((x) => x.id === preService);
        if (svc) { setData((d) => ({ ...d, categoryId: svc.category_id, serviceId: svc.id })); setStep(2); }
      }
    })();
  }, [sp]);

  const svc = services.find((s) => s.id === data.serviceId);
  const emp = employees.find((e) => e.id === data.employeeId);
  const endTime = svc && data.time ? (() => {
    const [h, m] = data.time.split(":").map(Number);
    const total = h * 60 + m + svc.duration;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  })() : null;

  useEffect(() => {
    (async () => {
      if (step === 4 && data.employeeId && data.serviceId && data.date) {
        try {
          const r = await getAvailability({ employee_id: data.employeeId, service_id: data.serviceId, date: data.date });
          setSlots(r.slots || []);
        } catch { setSlots([]); }
      }
    })();
  }, [step, data.employeeId, data.serviceId, data.date]);

  const canNext = () => {
    switch (step) {
      case 0: return !!data.categoryId;
      case 1: return !!data.serviceId;
      case 2: return !!data.employeeId;
      case 3: return !!data.date;
      case 4: return !!data.time;
      case 5: return data.name.trim().length > 1 && /^[+\d\s-]{8,}$/.test(data.phone);
      case 6: return data.accepted;
      default: return true;
    }
  };

  const next = () => { if (canNext()) setStep((s) => Math.min(STEPS.length - 1, s + 1)); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submitBooking = async () => {
    setLoading(true);
    try {
      const { booking, order } = await createBooking({
        service_id: data.serviceId, employee_id: data.employeeId, date: data.date, start_time: data.time,
        customer_name: data.name, customer_phone: data.phone, customer_email: data.email, notes: data.notes,
      });
      // Simulate a payment step (mock mode): 900ms delay + verify
      toast.loading("Processing payment...", { id: "pay" });
      await new Promise((r) => setTimeout(r, 1200));
      const res = await verifyPayment({ booking_id: booking.id, razorpay_order_id: order.id });
      toast.success("Payment verified · Booking confirmed", { id: "pay" });
      nav(`/booking/${res.booking.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Booking failed. Please try again.", { id: "pay" });
    } finally { setLoading(false); }
  };

  const catServices = services.filter((s) => s.category_id === data.categoryId);
  const grouped = useMemo(() => {
    const g = {};
    catServices.forEach((s) => { const k = s.group || "Services"; (g[k] = g[k] || []).push(s); });
    return g;
  }, [catServices]);

  return (
    <>
      <Nav />
      <main className="pt-32 pb-24 min-h-screen bg-[#0A0A0A]" data-testid="booking-page">
        <div className="gx-container">
          <div className="mb-10">
            <p className="eyebrow mb-3">Book an Appointment</p>
            <h1 className="font-editorial text-4xl md:text-5xl">Reserve your <span className="text-[#B91C1C]">chair.</span></h1>
          </div>

          <StepBar current={step} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              {step === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="step-category">
                  {cats.map((c) => (
                    <button key={c.id} onClick={() => setData({ ...data, categoryId: c.id, serviceId: null })}
                      className={`gx-card overflow-hidden text-left ${data.categoryId === c.id ? "border-[#B91C1C]" : ""}`}
                      data-testid={`cat-${c.slug}`}>
                      <div className="aspect-[16/9] bg-[#161616]"><img src={c.image} alt="" className="w-full h-full object-cover opacity-90" /></div>
                      <div className="p-5">
                        <p className="font-display text-xl">{c.name}</p>
                        <p className="text-[#8F8F8F] text-sm mt-1">{c.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6" data-testid="step-service">
                  {Object.entries(grouped).map(([g, arr]) => (
                    <div key={g}>
                      <p className="eyebrow mb-3">{g}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {arr.map((s) => (
                          <button key={s.id} onClick={() => setData({ ...data, serviceId: s.id })}
                            className={`gx-card p-4 text-left flex items-center justify-between ${data.serviceId === s.id ? "border-[#B91C1C]" : ""}`}
                            data-testid={`svc-${s.id}`}>
                            <div>
                              <p className="font-display">{s.name}</p>
                              <p className="text-xs text-[#8F8F8F] mt-1 flex items-center gap-3"><span className="flex items-center gap-1"><Clock size={12}/> {s.duration} min</span><span>₹{s.price}</span></p>
                            </div>
                            <p className="text-[#B91C1C] text-xs">₹{s.deposit}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="step-employee">
                  <button onClick={() => setData({ ...data, employeeId: employees[0]?.id })}
                    className={`gx-card p-5 text-left ${employees[0] && data.employeeId === employees[0].id ? "border-[#B91C1C]" : ""}`} data-testid="emp-any">
                    <p className="font-display flex items-center gap-2"><Sparkles size={14} className="text-[#B91C1C]" /> First Available</p>
                    <p className="text-xs text-[#8F8F8F] mt-1">Fastest confirmation</p>
                  </button>
                  {employees.map((e) => (
                    <button key={e.id} onClick={() => setData({ ...data, employeeId: e.id })}
                      className={`gx-card p-3 text-left flex items-center gap-4 ${data.employeeId === e.id ? "border-[#B91C1C]" : ""}`}
                      data-testid={`emp-${e.id}`}>
                      <img src={e.photo} alt="" className="w-14 h-14 object-cover" />
                      <div>
                        <p className="font-display">{e.name}</p>
                        <p className="text-xs text-[#8F8F8F]">{e.position}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="gx-card p-6" data-testid="step-date">
                  <DatePicker value={data.date} onChange={(iso) => setData({ ...data, date: iso, time: null })} />
                </div>
              )}

              {step === 4 && (
                <div data-testid="step-time">
                  {slots.length === 0 ? (
                    <p className="text-[#8F8F8F] text-sm gx-card p-6">No slots available for this date. Please pick another day.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {slots.map((t) => (
                        <button key={t} onClick={() => setData({ ...data, time: t })}
                          className={`py-3 text-sm border transition-colors ${data.time === t ? "bg-[#B91C1C] border-[#B91C1C] text-white" : "border-[#232323] hover:border-[#B91C1C] text-[#DADADA]"}`}
                          data-testid={`slot-${t}`}>{t}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="gx-card p-6 space-y-4" data-testid="step-details">
                  <div>
                    <label className="eyebrow block mb-2">Full Name</label>
                    <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })}
                      className="w-full bg-[#0F0F0F] border border-[#232323] px-4 py-3 focus:border-[#B91C1C] outline-none"
                      data-testid="input-name" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="eyebrow block mb-2">Phone Number</label>
                      <input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="+91"
                        className="w-full bg-[#0F0F0F] border border-[#232323] px-4 py-3 focus:border-[#B91C1C] outline-none"
                        data-testid="input-phone" />
                    </div>
                    <div>
                      <label className="eyebrow block mb-2">Email (optional)</label>
                      <input value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })}
                        className="w-full bg-[#0F0F0F] border border-[#232323] px-4 py-3 focus:border-[#B91C1C] outline-none"
                        data-testid="input-email" />
                    </div>
                  </div>
                  <div>
                    <label className="eyebrow block mb-2">Notes (optional)</label>
                    <textarea rows={3} value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })}
                      className="w-full bg-[#0F0F0F] border border-[#232323] px-4 py-3 focus:border-[#B91C1C] outline-none resize-none"
                      data-testid="input-notes" />
                  </div>
                </div>
              )}

              {step === 6 && svc && (
                <div className="gx-card p-8 space-y-6" data-testid="step-review">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Service</p><p>{svc.name}</p></div>
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Professional</p><p>{emp?.name}</p></div>
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Duration</p><p>{svc.duration} min</p></div>
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Date</p><p>{data.date}</p></div>
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Time</p><p>{data.time} – {endTime}</p></div>
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Name</p><p>{data.name}</p></div>
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Phone</p><p>{data.phone}</p></div>
                    {data.email && <div><p className="text-[#8F8F8F] text-xs mb-1">Email</p><p>{data.email}</p></div>}
                  </div>
                  <div className="border-t border-[#1e1e1e] pt-4 grid grid-cols-3 gap-6 text-sm">
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Total</p><p className="font-display text-lg">₹{svc.price.toLocaleString()}</p></div>
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Deposit today</p><p className="font-display text-lg text-[#B91C1C]">₹{svc.deposit.toLocaleString()}</p></div>
                    <div><p className="text-[#8F8F8F] text-xs mb-1">Pay at salon</p><p className="font-display text-lg">₹{(svc.price - svc.deposit).toLocaleString()}</p></div>
                  </div>
                  <label className="flex items-start gap-3 text-sm text-[#B9B9B9]" data-testid="accept-terms">
                    <input type="checkbox" checked={data.accepted} onChange={(e) => setData({ ...data, accepted: e.target.checked })} className="mt-1 accent-[#B91C1C]" />
                    <span>I agree to the <a href="/terms" className="text-white underline">Terms & Conditions</a>, deposit and cancellation policy. Deposits are adjusted against the final bill.</span>
                  </label>
                </div>
              )}

              {step === 7 && svc && (
                <div className="gx-card p-8 text-center" data-testid="step-payment">
                  <ShieldCheck size={40} className="mx-auto text-[#B91C1C] mb-4" />
                  <p className="font-display text-2xl">Confirm & Pay Deposit</p>
                  <p className="text-[#8F8F8F] text-sm mt-2 max-w-md mx-auto">
                    A small booking deposit of <span className="text-white">₹{svc.deposit.toLocaleString()}</span> secures your appointment. The rest is paid at the salon.
                  </p>
                  <button onClick={submitBooking} disabled={loading} className="btn-red mt-8 mx-auto" data-testid="pay-now">
                    {loading ? "Processing…" : (<>Pay ₹{svc.deposit.toLocaleString()} <ArrowRight size={14} /></>)}
                  </button>
                  <p className="text-[10px] text-[#6F6F6F] mt-6 tracking-widest uppercase">Powered by Razorpay · 256-bit secure</p>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button onClick={back} disabled={step === 0} className="btn-ghost disabled:opacity-40" data-testid="btn-back">
                  <ArrowLeft size={14} /> Back
                </button>
                {step < 7 && (
                  <button onClick={next} disabled={!canNext()} className="btn-red disabled:opacity-40" data-testid="btn-next">
                    {step === 6 ? "Proceed to Payment" : "Continue"} <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-4">
              <Summary svc={svc} emp={emp} date={data.date} time={data.time} endTime={endTime} />
            </div>
          </div>
        </div>
      </main>
      <Footer business={business} />
    </>
  );
}
