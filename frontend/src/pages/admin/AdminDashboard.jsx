import { useEffect, useState } from "react";
import { adminStats, adminBookings } from "../../lib/api";
import { CalendarCheck, IndianRupee, Users, Clock, TrendingUp } from "lucide-react";

const Stat = ({ label, value, sub, icon: Icon }) => (
  <div className="gx-card p-6" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="flex items-center justify-between mb-4">
      <p className="eyebrow">{label}</p>
      <Icon size={16} className="text-[#B91C1C]" />
    </div>
    <p className="font-editorial text-4xl">{value}</p>
    {sub && <p className="text-xs text-[#8F8F8F] mt-2">{sub}</p>}
  </div>
);

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

  if (!stats) return <p className="text-[#8F8F8F]">Loading…</p>;

  return (
    <div data-testid="admin-dashboard">
      <div className="mb-10">
        <p className="eyebrow mb-2">Overview</p>
        <h1 className="font-editorial text-4xl">Today at Galaxy.</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Today's Bookings" value={stats.today_bookings} sub={`${stats.pending} pending`} icon={CalendarCheck} />
        <Stat label="Today's Revenue" value={`₹${stats.today_revenue.toLocaleString()}`} sub="Deposits captured" icon={IndianRupee} />
        <Stat label="Total Customers" value={stats.customers} sub="Unique profiles" icon={Users} />
        <Stat label="Total Bookings" value={stats.total_bookings} sub={`${stats.completed} completed`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gx-card p-6">
          <p className="eyebrow mb-4">Recent Bookings</p>
          <div className="divide-y divide-[#1e1e1e]">
            {recent.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="text-white">{b.customer_name} <span className="text-[#8F8F8F]">· {b.service_name}</span></p>
                  <p className="text-xs text-[#8F8F8F] mt-1">{b.date} · {b.start_time} · with {b.employee_name}</p>
                </div>
                <span className={`text-[10px] tracking-widest uppercase px-2 py-1 border ${b.status === 'confirmed' ? 'border-[#B91C1C] text-[#B91C1C]' : 'border-[#2a2a2a] text-[#8F8F8F]'}`}>{b.status}</span>
              </div>
            ))}
            {recent.length === 0 && <p className="text-[#8F8F8F] text-sm py-6">No bookings yet.</p>}
          </div>
        </div>
        <div className="gx-card p-6">
          <p className="eyebrow mb-4">Popular Services</p>
          <ul className="space-y-3 text-sm">
            {stats.popular_services.map((p, i) => (
              <li key={i} className="flex justify-between border-b border-[#181818] pb-2">
                <span>{p.name}</span>
                <span className="text-[#B91C1C]">{p.count}</span>
              </li>
            ))}
            {stats.popular_services.length === 0 && <p className="text-[#8F8F8F]">Not enough data yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
