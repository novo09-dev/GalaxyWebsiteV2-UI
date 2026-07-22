import { useEffect, useState } from "react";
import { adminBusiness, adminUpdateBusiness, adminCalendarStatus, adminCalendarDisconnect, adminCalendarConnectUrl, adminCalendarTest } from "../../lib/api";
import { toast } from "sonner";
import { Save, CalendarCheck2, Link2Off, Check, Zap } from "lucide-react";

const FIELDS = [
  ["name", "Business Name"],
  ["tagline", "Tagline"],
  ["address", "Address"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["whatsapp", "WhatsApp"],
  ["instagram", "Instagram URL"],
  ["facebook", "Facebook URL"],
  ["maps_url", "Google Maps URL"],
  ["working_hours_text", "Working Hours"],
  ["about", "About"],
];

export default function AdminSettings() {
  const [data, setData] = useState(null);
  const [cal, setCal] = useState(null);
  useEffect(() => {
    adminBusiness().then(setData);
    adminCalendarStatus().then(setCal).catch(() => setCal({ env_configured: false, connected: false }));
  }, []);
  if (!data) return <p className="text-[#8F8F8F]">Loading…</p>;

  const save = async () => {
    await adminUpdateBusiness(data);
    toast.success("Saved");
  };

  const connectGoogle = () => { window.location.href = adminCalendarConnectUrl(); };
  const disconnectGoogle = async () => {
    if (!window.confirm("Disconnect Google Calendar? New bookings will stop syncing.")) return;
    await adminCalendarDisconnect();
    toast.success("Disconnected");
    adminCalendarStatus().then(setCal);
  };
  const testCal = async () => {
    try {
      const r = await adminCalendarTest("primary");
      toast.success(`Connected · ${r.upcoming.length} upcoming events on primary`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Test failed"); }
  };

  return (
    <div data-testid="admin-settings">
      <div className="mb-8"><p className="eyebrow mb-2">Settings</p><h1 className="font-editorial text-4xl">Business & Integrations.</h1></div>

      <div className="gx-card p-6 mb-6" data-testid="calendar-panel">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CalendarCheck2 size={18} className="text-[#B91C1C]" />
            <div>
              <p className="font-display text-lg">Google Calendar</p>
              <p className="text-xs text-[#8F8F8F]">Confirmed bookings automatically appear on stylist calendars.</p>
            </div>
          </div>
          {cal?.connected ? (
            <span className="inline-flex items-center gap-2 text-xs text-[#B91C1C] border border-[#B91C1C] px-3 py-1"><Check size={12} /> Connected as {cal.email}</span>
          ) : (
            <span className="text-xs text-[#8F8F8F] border border-[#232323] px-3 py-1 uppercase tracking-widest">Not connected</span>
          )}
        </div>
        {!cal?.env_configured && (
          <p className="text-xs text-[#B91C1C] mb-3">Set <code className="text-white">GOOGLE_CLIENT_ID</code> and <code className="text-white">GOOGLE_CLIENT_SECRET</code> in <code className="text-white">backend/.env</code> and restart the backend to enable this integration.</p>
        )}
        <div className="flex gap-3 flex-wrap">
          {!cal?.connected ? (
            <button onClick={connectGoogle} disabled={!cal?.env_configured} className="btn-red disabled:opacity-40" data-testid="cal-connect">
              <Zap size={14} /> Connect Google Calendar
            </button>
          ) : (
            <>
              <button onClick={testCal} className="btn-ghost" data-testid="cal-test">Test Connection</button>
              <button onClick={disconnectGoogle} className="btn-ghost" data-testid="cal-disconnect"><Link2Off size={14} /> Disconnect</button>
            </>
          )}
        </div>
        <p className="text-xs text-[#8F8F8F] mt-4">Assign a specific calendar per stylist under <span className="text-white">Employees → Google Calendar ID</span>. Empty = your primary calendar.</p>
      </div>

      <div className="gx-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(([k, l]) => (
          <div key={k} className={k === "about" || k === "address" ? "md:col-span-2" : ""}>
            <label className="eyebrow block mb-1">{l}</label>
            {k === "about" || k === "address" ? (
              <textarea rows={3} value={data[k] || ""} onChange={(e) => setData({ ...data, [k]: e.target.value })} className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" />
            ) : (
              <input value={data[k] || ""} onChange={(e) => setData({ ...data, [k]: e.target.value })} className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" />
            )}
          </div>
        ))}
      </div>
      <button onClick={save} className="btn-red mt-6" data-testid="settings-save"><Save size={14} /> Save Changes</button>
    </div>
  );
}
