import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { LayoutDashboard, CalendarCheck, ScissorsSquare, UsersRound, UserCircle2, ImageIcon, Settings, LogOut } from "lucide-react";

const ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/services", label: "Services", icon: ScissorsSquare },
  { to: "/admin/employees", label: "Employees", icon: UsersRound },
  { to: "/admin/customers", label: "Customers", icon: UserCircle2 },
  { to: "/admin/content", label: "Content", icon: ImageIcon },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const nav = useNavigate();
  useEffect(() => {
    const t = localStorage.getItem("galaxy_admin_token");
    if (!t) nav("/admin/login");
  }, [nav]);

  const logout = () => {
    localStorage.removeItem("galaxy_admin_token");
    localStorage.removeItem("galaxy_admin_user");
    nav("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex" data-testid="admin-layout">
      <aside className="w-64 border-r border-[#1a1a1a] p-6 hidden md:flex flex-col justify-between">
        <div>
          <Link to="/" className="flex items-center mb-10">
            <img
              src="https://customer-assets-v7afamib.emergentagent.net/job_appointment-hub-969/artifacts/9d3zwini_Brand%20logo.png"
              alt="Galaxy"
              className="h-14 w-auto"
            />
          </Link>
          <nav className="space-y-1">
            {ITEMS.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm border-l-2 transition-colors ${isActive ? "border-[#B91C1C] text-white bg-[#141414]" : "border-transparent text-[#8F8F8F] hover:text-white"}`}
                data-testid={`admin-nav-${it.label.toLowerCase()}`}>
                <it.icon size={16} /> {it.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-xs text-[#8F8F8F] hover:text-white" data-testid="admin-logout">
          <LogOut size={14} /> Sign out
        </button>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="border-b border-[#1a1a1a] px-8 py-5 flex justify-between items-center md:hidden">
          <span className="font-display tracking-[0.32em] text-sm">GALAXY · ADMIN</span>
          <button onClick={logout} className="text-xs text-[#8F8F8F]"><LogOut size={14} /></button>
        </div>
        <div className="p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
