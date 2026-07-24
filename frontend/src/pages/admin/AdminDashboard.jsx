import { useEffect, useState } from "react";
import { adminStats, adminBookings } from "../../lib/api";
import { CalendarCheck, IndianRupee, Users, TrendingUp } from "lucide-react";

function PageHeader({ eyebrow, title, accent, action }) {
  return (
    <div className="mb-10 md:mb-12 flex items-end justify-between gap-6 flex-wrap">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="font-editorial text-4xl md:text-5xl text-[#F2EDE4] leading-tight">
          {title}{accent && <> <span className="italic-accent text-[#C21A1A]">{accent}</span></>}
        </h1>
      </div>
      {action}
    </div>
  );
}

const Stat = ({ label, value, sub, Icon }) => (
  <div
    className="gx-panel p-6 md:p-7 hover:border-[#26262A] transition-colors"
    data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div className="flex items-start justify-between mb-6">
      <p className="eyebrow">{label}</p>
      <span className="w-9 h-9 rounded-full border border-[#26262A] flex items-center justify-center">
        <Icon size={14} className="text-[#C21A1A]" strokeWidth={1.5} />
      </span>
    </div>
    <p className="font-editorial text-4xl md:text-5xl text-[#F2EDE4] leading-none">{value}</p>
    {sub && <p className="text-xs text-[#8C8880] mt-3">{sub}</p>}
  </div>
);

function StatusPill({ status }) {
  const map = {
    confirmed: "border-[#C21A1A]/50 text-[#F0BEBE] bg-[#C21A1A]/10",
    completed: "border-[#2A2A2E] text-[#D9D3C6] bg-[#111113]",
    pending: "border-[#2A2A2E] text-[#8C8880] bg-transparent",
    cancelled: "border-[#2A2A2E] text-[#6E6A62] bg-transparent",
    no_show: "border-[#2A2A2E] text-[#6E6A62] bg-transparent",
  };
  return (
    <span className={`inline-flex items-center text-[10px] tracking-[0.22em] uppercase px-2.5 py-1 border rounded-full ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, r] = await Promise.all([adminStats(), adminBookings()]);
      setStats(s);
      setRecent(r.slice(0, 6));
    })();
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center gap-3 text-[#8C8880]">
        <span className="w-4 h-4 border border-[#26262A] border-t-[#C21A1A] rounded-full animate-spin" />
        <span className="eyebrow">Loading dashboard</span>
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard">
      <PageHeader eyebrow="Overview" title="Today at" accent="Galaxy." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-10">
        <Stat label="Today's Bookings" value={stats.today_bookings} sub={`${stats.pending} pending`} Icon={CalendarCheck} />
        <Stat label="Today's Revenue" value={`₹${stats.today_revenue.toLocaleString()}`} sub="Deposits captured" Icon={IndianRupee} />
        <Stat label="Total Customers" value={stats.customers} sub="Unique profiles" Icon={Users} />
        <Stat label="Total Bookings" value={stats.total_bookings} sub={`${stats.completed} completed`} Icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2 gx-panel p-6 md:p-7">
          <div className="flex items-center justify-between mb-6">
            <p className="eyebrow">Recent Bookings</p>
            <span className="text-[10px] tracking-widest uppercase text-[#6E6A62]">Live</span>
          </div>
          <div className="divide-y divide-[#1B1B1E]">
            {recent.map((b) => (
              <div key={b.id} className="py-4 flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="text-[#F2EDE4] font-medium">
                    {b.customer_name}
                    <span className="text-[#6E6A62] font-normal"> · {b.service_name}</span>
                  </p>
                  <p className="text-[11px] text-[#8C8880] mt-1 tracking-wide">
                    {b.date} · {b.start_time} · with {b.employee_name}
                  </p>
                </div>
                <StatusPill status={b.status} />
              </div>
            ))}
            {recent.length === 0 && <p className="text-[#8C8880] text-sm py-8 text-center">No bookings yet.</p>}
          </div>
        </div>

        <div className="gx-panel p-6 md:p-7">
          <p className="eyebrow mb-6">Popular Services</p>
          <ul className="space-y-3 text-sm">
            {stats.popular_services.map((p, i) => (
              <li key={i} className="flex justify-between items-center border-b border-[#1B1B1E] pb-3 last:border-0">
                <span className="flex items-center gap-3">
                  <span className="num-tag">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[#F2EDE4]">{p.name}</span>
                </span>
                <span className="font-editorial text-lg text-[#C21A1A]">{p.count}</span>
              </li>
            ))}
            {stats.popular_services.length === 0 && <p className="text-[#8C8880] text-sm py-4">Not enough data yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
