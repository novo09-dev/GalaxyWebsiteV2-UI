import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import Nav from "../components/galaxy/Nav";
import Footer from "../components/galaxy/Footer";
import Eyebrow from "../components/galaxy/primitives/Eyebrow";
import EditorialHeading from "../components/galaxy/primitives/EditorialHeading";
import Badge from "../components/galaxy/primitives/Badge";
import {
  getCategories, getServices, getEmployees, getAvailability, createBooking, verifyPayment, getBusiness,
} from "../lib/api";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, Clock, ChevronLeft, ChevronRight,
  Sparkles, User, CalendarDays, ShieldCheck, IndianRupee, Info,
} from "lucide-react";

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

/* ---------------- Step Rail ---------------- */
function StepRail({ current, onJump, allowJump }) {
  const pct = ((current + 1) / STEPS.length) * 100;
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <p className="eyebrow" data-testid="booking-step-label">
          Step {current + 1} of {STEPS.length} · <span className="text-[#F2EDE4]">{STEPS[current].label}</span>
        </p>
        <p className="text-[10px] tracking-widest uppercase text-[#8C8880]">{Math.round(pct)}% complete</p>
      </div>
      <div className="progress-line"><span style={{ width: `${pct}%` }} /></div>
      <ol className="hidden md:flex items-center justify-between mt-6 gap-2">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const clickable = allowJump && (done || active);
          return (
            <li key={s.key} className="flex-1">
              <button
                type="button"
                onClick={() => clickable && onJump(i)}
                disabled={!clickable}
                className={`w-full text-left group ${clickable ? "cursor-pointer" : "cursor-default"}`}
                aria-current={active ? "step" : undefined}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`step-dot w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-medium ${
                      done ? "bg-[#C21A1A] border-[#C21A1A] text-white"
                      : active ? "border-[#C21A1A] text-[#C21A1A] bg-[#C21A1A]/10"
                      : "border-[#26262A] text-[#6E6A62]"
                    }`}
                  >
                    {done ? <Check size={11} /> : i + 1}
                  </span>
                  <span className={`text-[10px] tracking-[0.22em] uppercase ${active ? "text-[#F2EDE4]" : done ? "text-[#D9D3C6]" : "text-[#6E6A62]"}`}>
                    {s.label}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------- Summary sidebar ---------------- */
function Summary({
  selectedServices,
  emp,
  date,
  time,
  endTime,
  category,
  totalDuration,
  totalPrice,
  totalDeposit,
  totalBalance,
}) {
  const hasServices = selectedServices.length > 0;

  return (
    <aside className="gx-panel p-6 md:p-7 sticky top-28" data-testid="booking-summary">
      <div className="flex items-center justify-between mb-6">
        <Eyebrow>Your booking</Eyebrow>
        {hasServices && <Badge>Draft</Badge>}
      </div>

      {!hasServices ? (
        <div className="py-6">
          <p className="font-editorial text-2xl text-[#F2EDE4] leading-tight">Pick a service to begin.</p>
          <p className="text-[#8C8880] text-sm mt-3">Your summary appears here as you choose. Nothing is confirmed until you complete payment.</p>
        </div>
      ) : (
        <div className="space-y-5 text-sm">
          {category && (
            <div>
              <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-1">Category</p>
              <p className="text-[#F2EDE4]">{category}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-2">Services</p>
            <div className="space-y-2">
              {selectedServices.map((service) => (
                <div key={service.id}>
                  <p className="font-editorial text-xl leading-tight text-[#F2EDE4]">{service.name}</p>
                  <p className="text-[#8C8880] text-xs mt-1">{service.duration} min · ₹{service.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <p className="text-[#8C8880] text-xs mt-3">{totalDuration} min total</p>
          </div>

          {emp && (
            <div>
              <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-1">Professional</p>
              <p className="text-[#F2EDE4]">{emp.name}</p>
            </div>
          )}

          {date && (
            <div>
              <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-1">Date &amp; time</p>
              <p className="text-[#F2EDE4]">{date}{time ? ` · ${time}${endTime ? ` – ${endTime}` : ""}` : ""}</p>
            </div>
          )}

          <div className="border-t border-[#1D1D20] pt-5 space-y-3">
            <Row label="Total" value={`₹${totalPrice.toLocaleString()}`} accent />
            <Row label="Deposit today" value={`₹${totalDeposit.toLocaleString()}`} />
            <Row label="Pay at salon" value={`₹${totalBalance.toLocaleString()}`} muted />
          </div>

          <p className="text-[11px] leading-relaxed text-[#8C8880] pt-1">
            The deposit is adjusted against your final bill. Reschedule free up to 4 hours before.
          </p>
        </div>
      )}
    </aside>
  );
}

function Row({ label, value, accent, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#8C8880] text-xs uppercase tracking-widest">{label}</span>
      <span className={`font-editorial text-lg ${accent ? "text-[#C21A1A]" : muted ? "text-[#D9D3C6]" : "text-[#F2EDE4]"}`}>{value}</span>
    </div>
  );
}

/* ---------------- Date picker (custom calendar) ---------------- */
function DatePicker({ value, onChange }) {
  const [ref, setRef] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const days = useMemo(() => {
    const y = ref.getFullYear(), m = ref.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    return cells;
  }, [ref]);

  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}
          className="w-10 h-10 rounded-full border border-[#26262A] hover:border-[#C21A1A] flex items-center justify-center text-[#F2EDE4] transition-colors"
          data-testid="cal-prev"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </button>
        <p className="font-editorial text-xl md:text-2xl tracking-tight text-[#F2EDE4]">
          {ref.toLocaleString("en", { month: "long" })}{" "}
          <span className="italic-accent text-[#8C8880]">{ref.getFullYear()}</span>
        </p>
        <button
          onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}
          className="w-10 h-10 rounded-full border border-[#26262A] hover:border-[#C21A1A] flex items-center justify-center text-[#F2EDE4] transition-colors"
          data-testid="cal-next"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[10px] tracking-[0.2em] uppercase text-[#6E6A62] mb-3">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <span key={d}>{d.slice(0, 1)}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          if (!d) return <span key={i} />;
          const disabled = d < today;
          const iso = fmt(d);
          const active = value === iso;
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={`relative aspect-square text-sm border rounded transition-all ${
                active
                  ? "bg-[#C21A1A] border-[#C21A1A] text-white font-medium"
                  : disabled
                    ? "border-[#141416] text-[#33333A] cursor-not-allowed"
                    : "border-[#232327] hover:border-[#C21A1A] hover:bg-[#C21A1A]/10 text-[#D9D3C6]"
              }`}
              data-testid={`cal-day-${iso}`}
            >
              {d.getDate()}
              {isToday && !active && <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#C21A1A]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Booking (state machine preserved) ---------------- */
export default function Booking() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [step, setStep] = useState(0);
  const bookingTopRef = useRef(null);
  const [data, setData] = useState({
    categoryId: null, serviceIds: [], employeeId: null, date: null, time: null,
    name: "", phone: "", email: "", notes: "", accepted: false,
  });
  const [cats, setCats] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [slots, setSlots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [business, setBusiness] = useState(null);
  const [availabilityReason, setAvailabilityReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);

  useEffect(() => {
    (async () => {
      const [c, s, e, b] = await Promise.all([
        getCategories(), getServices(), getEmployees(), getBusiness(),
      ]);
      setCats(c); setServices(s); setEmployees(e); setBusiness(b);
      const preService = sp.get("service");
      if (preService) {
        const svc = s.find((x) => x.id === preService);
        if (svc) {
          setData((d) => ({ ...d, categoryId: svc.category_id, serviceIds: [svc.id] }));
          setStep(2);
        }
      }
    })();
  }, [sp]);

  const selectedServices = services.filter((s) => data.serviceIds.includes(s.id));
  const emp = employees.find((e) => e.id === data.employeeId);
  const category = cats.find((c) => c.id === data.categoryId);

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDeposit = selectedServices.reduce((sum, s) => sum + s.deposit, 0);
  const totalBalance = totalPrice - totalDeposit;

  const endTime = selectedServices.length > 0 && data.time ? (() => {
    const [h, m] = data.time.split(":").map(Number);
    const total = h * 60 + m + totalDuration;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  })() : null;

  useEffect(() => {
    (async () => {
      if (step === 4 && data.employeeId && data.serviceIds.length > 0 && data.date) {
        try {
          const r = await getAvailability({
            employee_id: data.employeeId,
            service_ids: data.serviceIds,
            date: data.date,
          });

          setSlots(r.slots || []);
          setAllSlots(r.all_slots || []);
          setAvailabilityReason(r.reason || null);
        } catch {
          setSlots([]);
          setAllSlots([]);
          setAvailabilityReason(null);
        }
      }
    })();
  }, [step, data.employeeId, data.serviceIds, data.date]);

  useEffect(() => {
    bookingTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [step]);

  const canNext = () => {
    switch (step) {
      case 0: return !!data.categoryId;
      case 1: return data.serviceIds.length > 0;
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
  const jumpTo = (i) => setStep(i);

   const submitBooking = async () => {
    setLoading(true);

    try {
      let booking;
      let order;

      // If this customer already started payment for this slot,
      // reuse the same booking and Razorpay order.
      if (pendingPayment) {
        booking = pendingPayment.booking;
        order = pendingPayment.order;
      } else {
        // First payment attempt:
        // create the temporary booking hold and Razorpay order.
        const created = await createBooking({
          service_ids: data.serviceIds,
          employee_id: data.employeeId,
          date: data.date,
          start_time: data.time,
          customer_name: data.name,
          customer_phone: data.phone,
          customer_email: data.email,
          notes: data.notes,
        });

        booking = created.booking;
        order = created.order;

        // Remember this booking/order so payment can be retried
        // without trying to book the same slot again.
        setPendingPayment({
          booking,
          order,
        });
      }

      // Make sure Razorpay Checkout has loaded.
      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout could not load. Please refresh and try again."
        );
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Galaxy Salon & Spa",
        description: `Booking deposit · ${selectedServices.map((s) => s.name).join(", ") || "Salon Services"}`,
        order_id: order.id,

        prefill: {
          name: data.name,
          email: data.email || "",
          contact: data.phone,
        },

        notes: {
          booking_id: booking.id,
        },

        theme: {
          color: "#C21A1A",
        },

        // Razorpay calls this after successful payment.
        handler: async function (response) {
          try {
            toast.loading("Verifying payment...", { id: "pay" });

            const res = await verifyPayment({
              booking_id: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Payment succeeded, so we no longer need the pending retry.
            setPendingPayment(null);

            toast.success("Payment verified · Booking confirmed", {
              id: "pay",
            });

            nav(`/booking/${res.booking.id}`);
          } catch (error) {
            toast.error(
              error?.response?.data?.detail ||
                "Payment could not be verified. Your appointment was not confirmed.",
              { id: "pay" }
            );
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: function () {
            setLoading(false);

            // IMPORTANT:
            // Do not clear pendingPayment here.
            // The customer can press Pay again and retry.
            toast.error(
              "Payment was not completed. You can try the payment again.",
              { id: "pay" }
            );
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function () {
        setLoading(false);

        // IMPORTANT:
        // Keep pendingPayment so Pay can retry the same booking/order.
        toast.error(
          "Payment failed. You can try the payment again.",
          { id: "pay" }
        );
      });

      razorpay.open();
    } catch (error) {
      setLoading(false);

      toast.error(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to start payment. Please try again.",
        { id: "pay" }
      );
    }
  };

  const catServices = services.filter((s) => s.category_id === data.categoryId);
  const grouped = useMemo(() => {
    const g = {};
    catServices.forEach((s) => {
      const k = s.group || "Services";
      (g[k] = g[k] || []).push(s);
    });
    return g;
  }, [catServices]);

  const stepAnim = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <>
      <Nav />
      <main className="pt-32 md:pt-36 pb-24 md:pb-32 min-h-screen bg-[#08080A]" data-testid="booking-page">
        <div className="gx-container">
          <div ref={bookingTopRef} className="mb-10 md:mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <Eyebrow>Book an Appointment</Eyebrow>
              <EditorialHeading as="h1" size="md" className="mt-5">
                Reserve your <span className="italic-accent text-[#C21A1A]">chair.</span>
              </EditorialHeading>
            </div>
            <p className="text-[#8C8880] text-sm max-w-sm leading-relaxed">
              Eight quick steps. A small deposit secures your slot — the rest is settled at the salon.
            </p>
          </div>

          <StepRail current={step} onJump={jumpTo} allowJump />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                <motion.div key={step} {...stepAnim}>
                  {step === 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-testid="step-category">
                      {cats.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setPendingPayment(null);
                            setData({
                              ...data,
                              categoryId: c.id,
                              serviceIds: [],
                              employeeId: null,
                              date: null,
                              time: null,
                            });
                          }}
                          className={`group relative overflow-hidden border text-left gx-card-hover ${data.categoryId === c.id ? "border-[#C21A1A]" : "border-[#1B1B1E]"} bg-[#111113]`}
                          data-testid={`cat-${c.slug}`}
                        >
                          <div className="aspect-[16/10] bg-[#151517] overflow-hidden relative">
                            <img src={c.image} alt="" className="w-full h-full object-cover img-zoom opacity-90" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                            <span className="absolute top-4 left-4"><Badge>{c.slug === "men" ? "Him" : "Her"}</Badge></span>
                          </div>
                          <div className="p-6">
                            <p className="font-editorial text-3xl text-[#F2EDE4] leading-tight">{c.name}</p>
                            <p className="text-[#8C8880] text-sm mt-2 leading-relaxed">{c.description}</p>
                            <span className="mt-4 inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-[#C21A1A]">
                              Choose {c.slug === "men" ? "men" : "women"} <ArrowUpRight size={12} />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-8" data-testid="step-service">
                      {Object.entries(grouped).map(([g, arr]) => (
                        <div key={g}>
                          <div className="flex items-center gap-3 mb-4">
                            <span className="red-rule" />
                            <p className="eyebrow text-[#D9D3C6]">{g}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {arr.map((s) => {
                              const selected = data.serviceIds.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setPendingPayment(null);
                                    setData((d) => ({
                                      ...d,
                                      serviceIds: d.serviceIds.includes(s.id)
                                        ? d.serviceIds.filter((id) => id !== s.id)
                                        : [...d.serviceIds, s.id],
                                      employeeId: null,
                                      date: null,
                                      time: null,
                                    }));
                                  }}
                                  className={`group relative overflow-hidden text-left flex items-stretch gap-0 border transition-all duration-300 ${selected ? "border-[#C21A1A] bg-[#150A0A] shadow-[0_10px_40px_-20px_rgba(194,26,26,0.4)]" : "border-[#1B1B1E] bg-[#111113] hover:border-[#2E2E33]"}`}
                                  data-testid={`svc-${s.id}`}
                                  aria-pressed={selected}
                                >
                                  {s.image ? (
                                    <div className="relative w-24 md:w-28 shrink-0 overflow-hidden bg-[#151517]">
                                      <img
                                        src={s.image}
                                        alt=""
                                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${selected ? "scale-[1.05]" : "opacity-90 group-hover:opacity-100 group-hover:scale-[1.04]"}`}
                                        loading="lazy"
                                      />
                                      <div className={`absolute inset-0 transition-opacity duration-300 ${selected ? "bg-gradient-to-r from-[#C21A1A]/40 to-transparent" : "bg-gradient-to-r from-black/40 to-transparent"}`} />
                                    </div>
                                  ) : (
                                    <div className="w-24 md:w-28 shrink-0 bg-[#151517] flex items-center justify-center">
                                      <Sparkles size={16} className="text-[#26262A]" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0 flex items-start justify-between gap-3 p-4 md:p-5">
                                    <div className="min-w-0">
                                      <p className={`font-editorial text-lg md:text-xl leading-tight transition-colors ${selected ? "text-[#F2EDE4]" : "text-[#F2EDE4]"}`}>
                                        {s.name}
                                      </p>
                                      <p className="text-[11px] text-[#8C8880] mt-2 flex items-center gap-2 md:gap-3 tracking-widest uppercase flex-wrap">
                                        <span className="flex items-center gap-1"><Clock size={11} />{s.duration}m</span>
                                        <span className="opacity-40">/</span>
                                        <span>Deposit ₹{s.deposit.toLocaleString()}</span>
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-[9px] uppercase tracking-widest text-[#8C8880]">Total</p>
                                      <p className="font-editorial text-xl md:text-2xl text-[#C21A1A] mt-1 leading-none">₹{s.price.toLocaleString()}</p>
                                      {selected && (
                                        <span className="inline-flex items-center gap-1 mt-2 text-[10px] tracking-widest uppercase text-[#C21A1A]">
                                          <Check size={11} /> Selected
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="step-employee">
                      <button
                        onClick={() => {
                          setPendingPayment(null);
                          setData({ ...data, employeeId: employees[0]?.id });
                        }}
                        className={`gx-card p-6 text-left transition-all duration-300 ${
                          employees[0] && data.employeeId === employees[0].id
                            ? "border-[#C21A1A] bg-gradient-to-r from-[#C21A1A]/40 via-[#150A0A] to-[#150A0A] shadow-[0_10px_40px_-20px_rgba(194,26,26,0.4)]"
                            : "border-[#1B1B1E] bg-[#111113] hover:border-[#2E2E33]"
                        }`}
                        data-testid="emp-any"
                      >
                        <div className="w-10 h-10 rounded-full border border-[#C21A1A] flex items-center justify-center mb-4">
                          <Sparkles size={14} className="text-[#C21A1A]" />
                        </div>
                        <p className="font-editorial text-xl text-[#F2EDE4]">First Available</p>
                        <p className="text-xs text-[#8C8880] mt-2">Fastest confirmation · any expert.</p>
                      </button>
                      {employees.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => {
                            setPendingPayment(null);
                            setData({ ...data, employeeId: e.id });
                          }}
                          className={`group gx-card p-3 text-left flex items-center gap-4 transition-all duration-300 ${
                            data.employeeId === e.id
                              ? "border-[#C21A1A] bg-gradient-to-r from-[#C21A1A]/40 via-[#150A0A] to-[#150A0A] shadow-[0_10px_40px_-20px_rgba(194,26,26,0.4)]"
                              : "border-[#1B1B1E] bg-[#111113] hover:border-[#2E2E33]"
                          }`}
                          data-testid={`emp-${e.id}`}
                        >
                          <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-sm">
                            <img
                              src={e.photo}
                              alt=""
                              className={`w-full h-full object-cover transition-all duration-700 ${
                                data.employeeId === e.id
                                  ? "scale-[1.05]"
                                  : "opacity-90 group-hover:opacity-100 group-hover:scale-[1.04]"
                              }`}
                            />
                            <div
                              className={`absolute inset-0 transition-opacity duration-300 ${
                                data.employeeId === e.id
                                  ? "bg-gradient-to-r from-[#C21A1A]/40 to-transparent"
                                  : "bg-gradient-to-r from-black/40 to-transparent"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-editorial text-lg text-[#F2EDE4] leading-tight">{e.name}</p>
                            <p className="text-[11px] text-[#8C8880] tracking-widest uppercase mt-1">{e.position}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="gx-panel p-6 md:p-8" data-testid="step-date">
                      <DatePicker
                        value={data.date}
                        onChange={(iso) => {
                          setPendingPayment(null);
                          setData({ ...data, date: iso, time: null });
                        }}
                      />
                    </div>
                  )}

                  {step === 4 && (
                    <div data-testid="step-time">
                      <div className="flex items-center gap-3 mb-5">
                        <span className="red-rule" />
                        <p className="eyebrow text-[#D9D3C6]">Available slots · {data.date}</p>
                      </div>
                      {slots.length === 0 && (
                        <div className="gx-panel p-8 text-center mb-6">
                          <Info size={20} className="mx-auto text-[#C21A1A] mb-3" />

                          {availabilityReason === "too_long_for_day" ? (
                            <>
                              <p className="font-editorial text-xl text-[#F2EDE4]">
                                Selected services exceed the available booking time
                              </p>
                              <p className="text-[#8C8880] text-sm mt-2">
                                The combined duration of your selected services is longer than a single booking day allows. Please remove one or more services to continue.
                              </p>
                            </>
                          ) : availabilityReason === "no_continuous_slot" ? (
                            <>
                              <p className="font-editorial text-xl text-[#F2EDE4]">
                                Not enough time available on this date
                              </p>
                              <p className="text-[#8C8880] text-sm mt-2">
                                Your selected services require a longer continuous time slot than is available on this date. Please choose another date or remove one or more services.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-editorial text-xl text-[#F2EDE4]">
                                No slots available.
                              </p>
                              <p className="text-[#8C8880] text-sm mt-2">
                                Please choose another date.
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {allSlots.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                          {allSlots.map((slot) => (
                            <button
                              key={slot.time}
                              disabled={!slot.available}
                              onClick={() => {
                                if (!slot.available) return;
                                setPendingPayment(null);
                                setData({ ...data, time: slot.time });
                              }}
                              className={`py-3.5 text-sm border rounded transition-all ${
                                !slot.available
                                  ? "border-[#1A1A1D] bg-[#101012] text-[#4A4A50] cursor-not-allowed opacity-60"
                                  : data.time === slot.time
                                    ? "bg-[#C21A1A] border-[#C21A1A] text-white font-medium"
                                    : "border-[#232327] hover:border-[#C21A1A] hover:bg-[#C21A1A]/10 text-[#D9D3C6]"
                              }`}
                              data-testid={`slot-${slot.time}`}
                              aria-label={`${slot.time} ${slot.available ? "available" : "unavailable"}`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 5 && (
                    <div className="gx-panel p-6 md:p-8 space-y-5" data-testid="step-details">
                      <div>
                        <label className="eyebrow block mb-3">Full Name</label>
                        <input
                          value={data.name}
                          onChange={(e) => setData({ ...data, name: e.target.value })}
                          placeholder="Your name"
                          className="gx-input"
                          data-testid="input-name"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="eyebrow block mb-3">Phone Number</label>
                          <input
                            value={data.phone}
                            onChange={(e) => setData({ ...data, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            className="gx-input"
                            data-testid="input-phone"
                          />
                        </div>
                        <div>
                          <label className="eyebrow block mb-3">Email <span className="text-[#6E6A62] normal-case tracking-normal">(optional)</span></label>
                          <input
                            value={data.email}
                            onChange={(e) => setData({ ...data, email: e.target.value })}
                            placeholder="you@example.com"
                            className="gx-input"
                            data-testid="input-email"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="eyebrow block mb-3">Notes <span className="text-[#6E6A62] normal-case tracking-normal">(optional)</span></label>
                        <textarea
                          rows={3}
                          value={data.notes}
                          onChange={(e) => setData({ ...data, notes: e.target.value })}
                          placeholder="Any preferences, allergies or requests"
                          className="gx-input resize-none"
                          data-testid="input-notes"
                        />
                      </div>
                    </div>
                  )}

                  {step === 6 && selectedServices.length > 0 && (
                    <div className="gx-panel p-6 md:p-10 space-y-8" data-testid="step-review">
                      <div>
                        <Eyebrow>Review</Eyebrow>
                        <p className="font-editorial text-3xl md:text-4xl text-[#F2EDE4] mt-3">One last look before we confirm.</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                        <ReviewField
                          label="Services"
                          value={selectedServices.map((s) => s.name).join(", ")}
                        />
                        <ReviewField label="Professional" value={emp?.name} />
                        <ReviewField label="Duration" value={`${totalDuration} min`} />
                        <ReviewField label="Date" value={data.date} />
                        <ReviewField label="Time" value={`${data.time} – ${endTime}`} />
                        <ReviewField label="Name" value={data.name} />
                        <ReviewField label="Phone" value={data.phone} />
                        {data.email && <ReviewField label="Email" value={data.email} />}
                      </div>

                      <div className="border-t border-[#1D1D20] pt-6 grid grid-cols-3 gap-6 text-sm">
                        <div>
                          <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-2">Total</p>
                          <p className="font-editorial text-2xl text-[#F2EDE4]">₹{totalPrice.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-2">Deposit today</p>
                          <p className="font-editorial text-2xl text-[#C21A1A]">₹{totalDeposit.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-2">Pay at salon</p>
                          <p className="font-editorial text-2xl text-[#D9D3C6]">₹{totalBalance.toLocaleString()}</p>
                        </div>
                      </div>

                      <label className="flex items-start gap-3 text-sm text-[#B9B5AB] cursor-pointer" data-testid="accept-terms">
                        <input
                          type="checkbox"
                          checked={data.accepted}
                          onChange={(e) => setData({ ...data, accepted: e.target.checked })}
                          className="mt-1 accent-[#C21A1A] w-4 h-4"
                        />
                        <span>I agree to the <a href="/terms" className="text-[#F2EDE4] underline underline-offset-4 decoration-[#C21A1A]">Terms &amp; Conditions</a>, deposit and cancellation policy. Deposits are adjusted against the final bill.</span>
                      </label>
                    </div>
                  )}

                  {step === 7 && selectedServices.length > 0 && (
                    <div className="gx-panel p-8 md:p-12 text-center" data-testid="step-payment">
                      <div className="w-14 h-14 mx-auto rounded-full border border-[#C21A1A] flex items-center justify-center mb-6">
                        <ShieldCheck size={22} className="text-[#C21A1A]" />
                      </div>

                      <Eyebrow className="justify-center">Confirm &amp; Pay</Eyebrow>

                      <p className="font-editorial text-3xl md:text-4xl text-[#F2EDE4] mt-4">
                        A small deposit secures your slot.
                      </p>

                      <p className="text-[#8C8880] text-sm mt-4 max-w-md mx-auto leading-relaxed">
                        You&apos;ll pay{" "}
                        <span className="text-[#F2EDE4]">
                          ₹{totalDeposit.toLocaleString()}
                        </span>{" "}
                        today. The remaining{" "}
                        <span className="text-[#F2EDE4]">
                          ₹{totalBalance.toLocaleString()}
                        </span>{" "}
                        is settled at the salon after your services.
                      </p>

                      <button
                        onClick={submitBooking}
                        disabled={loading}
                        className="btn-red mt-10 mx-auto disabled:opacity-60"
                        data-testid="pay-now"
                      >
                        {loading ? (
                          <>
                            Processing
                            <span className="inline-block ml-1 animate-pulse">…</span>
                          </>
                        ) : (
                          <>
                            Pay ₹{totalDeposit.toLocaleString()} <ArrowRight size={14} />
                          </>
                        )}
                      </button>

                      <p className="text-[10px] text-[#6E6A62] mt-8 tracking-[0.28em] uppercase">
                        Powered by Razorpay · 256-bit secure
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-10 flex items-center justify-between">
                <button
                  onClick={back}
                  disabled={step === 0}
                  className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid="btn-back"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                {step < 7 && (
                  <button
                    onClick={next}
                    disabled={!canNext()}
                    className="btn-red disabled:opacity-30 disabled:cursor-not-allowed"
                    data-testid="btn-next"
                  >
                    {step === 6 ? "Proceed to Payment" : "Continue"} <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-4">
              <Summary
                selectedServices={selectedServices}
                emp={emp}
                date={data.date}
                time={data.time}
                endTime={endTime}
                category={category?.name}
                totalDuration={totalDuration}
                totalPrice={totalPrice}
                totalDeposit={totalDeposit}
                totalBalance={totalBalance}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer business={business} />
    </>
  );
}

function ReviewField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.28em] uppercase text-[#8C8880] mb-2">{label}</p>
      <p className="text-[#F2EDE4]">{value}</p>
    </div>
  );
}
