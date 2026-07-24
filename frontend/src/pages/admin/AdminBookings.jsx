import { useEffect, useState, useCallback } from "react";
import { adminBookings, adminUpdateBooking, adminRescheduleBooking, adminList, getAvailability } from "../../lib/api";
import { toast } from "sonner";
import { Search, CalendarClock, X, CheckCircle2, Circle } from "lucide-react";

const STATUSES = ["all", "pending", "confirmed", "completed", "cancelled", "no_show"];

function StatusSelect({ value, onChange, testid }) {
  return (
    <select value={value} onChange={onChange} className="gx-input py-1.5 px-2.5 text-xs w-32" data-testid={testid}>
      {["pending","confirmed","completed","cancelled","no_show"].map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

function RescheduleModal({ booking, onClose, onSaved }) {
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.start_time);
  const [employeeId, setEmployeeId] = useState(booking.employee_id);
  const [employees, setEmployees] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { adminList("employees").then(setEmployees); }, []);

  useEffect(() => {
    (async () => {
      if (!employeeId || !date) return;
      setLoading(true);
      try {
        const r = await getAvailability({ employee_id: employeeId, service_id: booking.service_id, date });
        const s = new Set(r.slots || []);
        if (employeeId === booking.employee_id && date === booking.date) s.add(booking.start_time);
        setSlots(Array.from(s).sort());
      } catch { setSlots([]); }
      setLoading(false);
    })();
  }, [employeeId, date, booking.service_id, booking.employee_id, booking.date, booking.start_time]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminRescheduleBooking(booking.id, { date, start_time: time, employee_id: employeeId });
      toast.success(res.calendar_synced ? "Rescheduled · Calendar updated" : "Rescheduled");
      onSaved(res.booking);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to reschedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} data-testid="reschedule-modal">
      <div className="gx-panel w-full max-w-lg p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="eyebrow mb-2">Reschedule Booking</p>
            <p className="font-editorial text-2xl text-[#F2EDE4] tracking-[0.06em]">{booking.booking_code}</p>
            <p className="text-sm text-[#D9D3C6] mt-1">{booking.customer_name}</p>
            <p className="text-xs text-[#8C8880] mt-1">{booking.service_name} · {booking.duration} min</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-[#26262A] hover:border-[#C21A1A] flex items-center justify-center text-[#D9D3C6] hover:text-white transition-colors" aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="eyebrow block mb-2">Stylist</label>
            <select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setTime(""); }} className="gx-input" data-testid="resched-employee">
              {employees.filter((e) => e.active).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="eyebrow block mb-2">Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => { setDate(e.target.value); setTime(""); }}
              className="gx-input"
              data-testid="resched-date"
            />
          </div>
          <div>
            <label className="eyebrow block mb-2">Available Times</label>
            {loading ? (
              <div className="flex items-center gap-2 text-[#8C8880] text-xs py-2">
                <span className="w-3 h-3 border border-[#26262A] border-t-[#C21A1A] rounded-full animate-spin" />
                <span className="eyebrow">Checking availability</span>
              </div>
            ) : slots.length === 0 ? (
              <p className="text-xs text-[#C21A1A]">No slots available for this stylist and date.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto no-scrollbar pr-1">
                {slots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setTime(s)}
                    className={`py-2.5 text-xs border rounded transition-all ${
                      time === s
                        ? "bg-[#C21A1A] border-[#C21A1A] text-white font-medium"
                        : "border-[#232327] hover:border-[#C21A1A] hover:bg-[#C21A1A]/10 text-[#D9D3C6]"
                    }`}
                    data-testid={`resched-slot-${s}`}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={save} disabled={!time || saving} className="btn-red disabled:opacity-40 disabled:cursor-not-allowed" data-testid="resched-save">
            <CheckCircle2 size={14} /> {saving ? "Saving…" : "Confirm Reschedule"}
          </button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBookings() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [reschedule, setReschedule] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (status !== "all") params.status = status;
    if (q) params.q = q;
    const r = await adminBookings(params);
    setRows(r);
    setLoading(false);
  }, [status, q]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id, s) => {
    await adminUpdateBooking(id, { status: s });
    toast.success("Updated");
    load();
  };

  return (
    <div data-testid="admin-bookings">
      <div className="mb-10 md:mb-12 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="eyebrow mb-3">Bookings</p>
          <h1 className="font-editorial text-4xl md:text-5xl text-[#F2EDE4]">
            All <span className="italic-accent text-[#C21A1A]">appointments.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#0E0E10] border border-[#232327] rounded px-3.5 py-2.5 focus-within:border-[#C21A1A] transition-colors">
            <Search size={13} className="text-[#8C8880]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search name, phone, code"
              className="bg-transparent outline-none text-sm w-48 md:w-64 text-[#F2EDE4] placeholder:text-[#6E6A62]"
              data-testid="booking-search"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="gx-input py-2.5 w-36 text-sm" data-testid="booking-status-filter">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="gx-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0E0E10] border-b border-[#1B1B1E]">
                {["Code","Customer","Service","Professional","Date / Time","Amount","Status",""].map((h, i) => (
                  <th key={i} className={`px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880] ${i === 5 ? "text-right" : i === 7 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-[#1B1B1E] hover:bg-[#0E0E10] transition-colors" data-testid={`booking-row-${b.id}`}>
                  <td className="px-5 py-4 font-editorial text-[#F2EDE4] tracking-[0.14em]">
                    <span className="inline-flex items-center gap-2">
                      {b.booking_code}
                      {b.google_event_id && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-[#C21A1A] tracking-widest uppercase" title="Synced to Google Calendar">
                          <Circle size={6} fill="#C21A1A" className="text-[#C21A1A]" /> Cal
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[#F2EDE4]">{b.customer_name}</p>
                    <p className="text-[11px] text-[#8C8880] mt-0.5">{b.customer_phone}</p>
                  </td>
                  <td className="px-5 py-4 text-[#D9D3C6]">{b.service_name}</td>
                  <td className="px-5 py-4 text-[#D9D3C6]">{b.employee_name}</td>
                  <td className="px-5 py-4">
                    <p className="text-[#F2EDE4]">{b.date}</p>
                    <p className="text-[11px] text-[#8C8880] mt-0.5">{b.start_time} – {b.end_time}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-[#F2EDE4]">₹{b.price.toLocaleString()}</p>
                    <p className="text-[11px] text-[#C21A1A] mt-0.5">-₹{b.deposit.toLocaleString()}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusSelect value={b.status} onChange={(e) => changeStatus(b.id, e.target.value)} testid={`booking-status-${b.id}`} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setReschedule(b)}
                      disabled={b.status === "cancelled" || b.status === "completed"}
                      className="inline-flex items-center gap-1.5 text-xs text-[#D9D3C6] hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      data-testid={`btn-reschedule-${b.id}`}
                      title="Reschedule"
                    >
                      <CalendarClock size={12} /> Reschedule
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-[#8C8880] text-sm">No bookings match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reschedule && (
        <RescheduleModal
          booking={reschedule}
          onClose={() => setReschedule(null)}
          onSaved={() => { setReschedule(null); load(); }}
        />
      )}
    </div>
  );
}
