import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, CalendarCheck, ScissorsSquare, UsersRound, UserCircle2,
  ImageIcon, Settings, LogOut, ExternalLink, Menu,
} from "lucide-react";
import BrandMark from "../../components/galaxy/primitives/BrandMark";

const ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/services", label: "Services", icon: ScissorsSquare },
  { to: "/admin/employees", label: "Employees", icon: UsersRound },
  { to: "/admin/customers", label: "Customers", icon: UserCircle2 },
  { to: "/admin/content", label: "Content", icon: ImageIcon },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ onNavigate, onLogout }) {
  return (
    <div className="h-full flex flex-col justify-between p-6 lg:p-7">
      <div>
        <Link to="/" className="flex items-center gap-3 mb-10" aria-label="Galaxy home">
          <BrandMark variant="logo" size="md" />
        </Link>

        <p className="eyebrow mb-4">Manage</p>
        <nav className="space-y-1">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                onClick={onNavigate}
                className={({ isActive }) => `relative flex items-center gap-3 pl-4 pr-3 py-2.5 text-sm rounded-md transition-all duration-200 ${
                  isActive
                    ? "bg-[#150A0A] text-[#F2EDE4]"
                    : "text-[#8C8880] hover:text-[#F2EDE4] hover:bg-[#111113]"
                }`}
                data-testid={`admin-nav-${it.label.toLowerCase()}`}
              >
                {({ isActive }) => (
                  <>
                    <span aria-hidden className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-all ${isActive ? "bg-[#C21A1A]" : "bg-transparent"}`} />
                    <Icon size={15} className={isActive ? "text-[#C21A1A]" : "text-[#6E6A62]"} />
                    <span className="tracking-[0.06em]">{it.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3">
        <Link to="/" target="_blank" rel="noreferrer" className="pill-link w-full justify-center">
          View site <ExternalLink size={11} />
        </Link>
        <button onClick={onLogout} className="flex items-center gap-2 text-xs text-[#8C8880] hover:text-[#F2EDE4] transition-colors px-1" data-testid="admin-logout">
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("galaxy_admin_token");
    if (!t) nav("/admin/login");
  }, [nav]);

  const logout = () => {
    localStorage.removeItem("galaxy_admin_token");
    localStorage.removeItem("galaxy_admin_user");
    nav("/admin/login");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-[#08080A] flex" data-testid="admin-layout">
      {/* Desktop sidebar */}
      <aside className="w-72 shrink-0 border-r border-[#17171A] hidden lg:block">
        <SidebarContent onNavigate={closeMobile} onLogout={logout} />
      </aside>

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#08080A] border-r border-[#17171A] transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent onNavigate={closeMobile} onLogout={logout} />
      </aside>
      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={closeMobile} />}

      <main className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-[#08080A]/95 backdrop-blur-md border-b border-[#17171A] px-5 py-4 flex justify-between items-center">
          <button onClick={() => setMobileOpen(true)} className="w-10 h-10 rounded-full border border-[#26262A] flex items-center justify-center text-[#F2EDE4]" aria-label="Open menu">
            <Menu size={16} />
          </button>
          <BrandMark variant="logo" size="sm" />
          <button onClick={logout} className="w-10 h-10 rounded-full border border-[#26262A] flex items-center justify-center text-[#F2EDE4]" aria-label="Sign out">
            <LogOut size={14} />
          </button>
        </header>
        <div className="p-5 md:p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
