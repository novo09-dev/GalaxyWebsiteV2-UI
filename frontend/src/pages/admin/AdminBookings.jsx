import { useEffect, useState, useCallback } from "react";
import { adminBookings, adminUpdateBooking, adminRescheduleBooking, adminList, getAvailability } from "../../lib/api";
import { toast } from "sonner";
import { Search, CalendarClock, X, CheckCircle2 } from "lucide-react";

const STATUSES = ["all", "pending", "confirmed", "completed", "cancelled", "no_show"];

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
        // include current slot as available if same employee+date to allow "no change" or minor tweaks
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
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose} data-testid="reschedule-modal">
      <div className="gx-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="eyebrow mb-1">Reschedule Booking</p>
            <p className="font-display text-lg">{booking.booking_code} · {booking.customer_name}</p>
            <p className="text-xs text-[#8F8F8F] mt-1">{booking.service_name} · {booking.duration} min</p>
          </div>
          <button onClick={onClose} className="text-[#8F8F8F] hover:text-white" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="eyebrow block mb-2">Stylist</label>
            <select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setTime(""); }} className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" data-testid="resched-employee">
              {employees.filter((e) => e.active).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="eyebrow block mb-2">Date</label>
            <input type="date" value={date} min={new Date().toISOString().slice(0,10)} onChange={(e) => { setDate(e.target.value); setTime(""); }} className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" data-testid="resched-date" />
          </div>
          <div>
            <label className="eyebrow block mb-2">Available Times</label>
            {loading ? (
              <p className="text-[#8F8F8F] text-xs">Checking availability…</p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-[#B91C1C]">No slots available for this stylist and date.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto no-scrollbar">
                {slots.map((s) => (
                  <button key={s} onClick={() => setTime(s)} className={`py-2 text-xs border ${time === s ? "bg-[#B91C1C] border-[#B91C1C] text-white" : "border-[#232323] hover:border-[#B91C1C]"}`} data-testid={`resched-slot-${s}`}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={save} disabled={!time || saving} className="btn-red disabled:opacity-40" data-testid="resched-save">
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
  useEffect(() => {
  load();
}, [load]);

  const changeStatus = async (id, s) => {
    await adminUpdateBooking(id, { status: s });
    toast.success("Updated");
    load();
  };

  return (
    <div data-testid="admin-bookings">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-2">Bookings</p>
          <h1 className="font-editorial text-4xl">All appointments.</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0F0F0F] border border-[#232323] px-3 py-2">
            <Search size={14} className="text-[#8F8F8F]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search name, phone, code" className="bg-transparent outline-none text-sm w-48 md:w-64" data-testid="booking-search" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[#0F0F0F] border border-[#232323] px-3 py-2 text-sm" data-testid="booking-status-filter">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="gx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0F0F0F] text-[#8F8F8F]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Service</th>
                <th className="text-left px-4 py-3 font-medium">Professional</th>
                <th className="text-left px-4 py-3 font-medium">Date/Time</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-[#181818]" data-testid={`booking-row-${b.id}`}>
                  <td className="px-4 py-3 tracking-widest">
                    {b.booking_code}
                    {b.google_event_id && <span className="ml-2 text-[10px] text-[#B91C1C]" title="Synced to Google Calendar">●</span>}
                  </td>
                  <td className="px-4 py-3">{b.customer_name}<div className="text-xs text-[#8F8F8F]">{b.customer_phone}</div></td>
                  <td className="px-4 py-3">{b.service_name}</td>
                  <td className="px-4 py-3">{b.employee_name}</td>
                  <td className="px-4 py-3">{b.date}<div className="text-xs text-[#8F8F8F]">{b.start_time} – {b.end_time}</div></td>
                  <td className="px-4 py-3 text-right">₹{b.price.toLocaleString()}<div className="text-xs text-[#B91C1C]">-₹{b.deposit.toLocaleString()}</div></td>
                  <td className="px-4 py-3">
                    <select value={b.status} onChange={(e) => changeStatus(b.id, e.target.value)} className="bg-[#0F0F0F] border border-[#232323] px-2 py-1 text-xs">
                      {["pending","confirmed","completed","cancelled","no_show"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setReschedule(b)}
                      disabled={b.status === "cancelled" || b.status === "completed"}
                      className="inline-flex items-center gap-1 text-xs text-[#DADADA] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      data-testid={`btn-reschedule-${b.id}`}
                      title="Reschedule"
                    >
                      <CalendarClock size={12} /> Reschedule
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-[#8F8F8F]">No bookings.</td></tr>}
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
