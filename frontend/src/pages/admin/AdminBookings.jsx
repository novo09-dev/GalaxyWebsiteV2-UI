import { useEffect, useState } from "react";
import { adminBookings, adminUpdateBooking } from "../../lib/api";
import { toast } from "sonner";
import { Search } from "lucide-react";

const STATUSES = ["all", "pending", "confirmed", "completed", "cancelled", "no_show"];

export default function AdminBookings() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (status !== "all") params.status = status;
    if (q) params.q = q;
    const r = await adminBookings(params);
    setRows(r); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

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
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-[#181818]" data-testid={`booking-row-${b.id}`}>
                  <td className="px-4 py-3 tracking-widest">{b.booking_code}</td>
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
                </tr>
              ))}
              {rows.length === 0 && !loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-[#8F8F8F]">No bookings.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
