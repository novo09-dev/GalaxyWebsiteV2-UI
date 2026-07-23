import { useEffect, useState } from "react";
import {
  adminBusiness, adminUpdateBusiness,
  adminCalendarStatus, adminCalendarDisconnect, adminCalendarTest, adminSaveServiceAccount,
  adminChangeCredentials,
} from "../../lib/api";
import { toast } from "sonner";
import { Save, CalendarCheck2, Link2Off, Check, Zap, KeyRound, ChevronDown, ChevronUp, Info } from "lucide-react";

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

function GoogleCalendarPanel() {
  const [cal, setCal] = useState(null);
  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const load = () => adminCalendarStatus().then(setCal).catch(() => setCal({ env_configured: false, connected: false }));
  useEffect(() => { load(); }, []);

  const connect = async () => {
    setSaving(true);
    let creds;
    try {
      creds = JSON.parse(json);
    } catch {
      setSaving(false);
      toast.error("Not valid JSON — please paste the complete service account key.");
      return;
    }
    try {
      const r = await adminSaveServiceAccount(creds);
      toast.success(`Connected · Share your calendars with ${r.client_email}`);
      setJson("");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not save the service account.");
    } finally { setSaving(false); }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect Google Calendar? New bookings will stop syncing.")) return;
    await adminCalendarDisconnect();
    toast.success("Disconnected");
    load();
  };

  const test = async () => {
    try {
      const r = await adminCalendarTest("primary");
      toast.success(`Connected · ${r.upcoming.length} upcoming events found`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Test failed — did you share the calendar with the service account?"); }
  };

  return (
    <div className="gx-card p-6 mb-6" data-testid="calendar-panel">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarCheck2 size={18} className="text-[#B91C1C]" />
          <div>
            <p className="font-display text-lg">Google Calendar</p>
            <p className="text-xs text-[#8F8F8F]">Auto-sync bookings and block busy times.</p>
          </div>
        </div>
        {cal?.connected ? (
          <span className="inline-flex items-center gap-2 text-xs text-[#B91C1C] border border-[#B91C1C] px-3 py-1" data-testid="calendar-connected-badge">
            <Check size={12} /> Connected {cal.mode === "service_account" ? "· Service Account" : "· OAuth"}
          </span>
        ) : (
          <span className="text-xs text-[#8F8F8F] border border-[#232323] px-3 py-1 uppercase tracking-widest" data-testid="calendar-notconnected-badge">Not connected</span>
        )}
      </div>

      {cal?.connected ? (
        <div className="space-y-4">
          <div className="text-sm">
            <p className="text-[#8F8F8F]">Service Account email:</p>
            <p className="font-mono text-[#DADADA] mt-1 break-all" data-testid="calendar-connected-email">{cal.email}</p>
          </div>
          <p className="text-xs text-[#8F8F8F] leading-relaxed">
            Add this email as a guest with "Make changes to events" permission on every stylist's calendar. Then set each stylist's <span className="text-white">Google Calendar ID</span> under <span className="text-white">Employees</span>. Busy events on connected calendars will automatically hide overlapping time slots on the public booking page.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={test} className="btn-ghost" data-testid="cal-test">Test Connection</button>
            <button onClick={disconnect} className="btn-ghost" data-testid="cal-disconnect"><Link2Off size={14} /> Disconnect</button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={() => setHelpOpen((o) => !o)} className="w-full flex items-center justify-between text-xs text-[#DADADA] border border-[#232323] px-3 py-2 mb-4" data-testid="calendar-help-toggle">
            <span className="flex items-center gap-2"><Info size={12} /> How to get your Service Account JSON</span>
            {helpOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {helpOpen && (
            <ol className="text-xs text-[#B9B9B9] leading-relaxed space-y-2 mb-4 pl-4 list-decimal">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-white underline">Google Cloud Console</a> and create (or pick) a project.</li>
              <li>Enable the <span className="text-white">Google Calendar API</span> in <em>APIs &amp; Services → Library</em>.</li>
              <li>Go to <em>IAM &amp; Admin → Service Accounts</em> → <span className="text-white">Create Service Account</span>. No roles needed.</li>
              <li>Open the account, tab <em>Keys → Add key → JSON</em>. A JSON file will download.</li>
              <li>Open the file and paste its entire contents below, then click <span className="text-white">Connect</span>.</li>
              <li>Finally, open each stylist's Google Calendar → <em>Settings and sharing → Share with specific people</em> and add the service account's email (shown after connection) with "Make changes to events". Copy the calendar's ID into the stylist's profile under <em>Employees</em>.</li>
            </ol>
          )}

          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder='Paste the full service account JSON here — starts with {"type": "service_account", ...}'
            className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C] font-mono text-xs"
            data-testid="cal-sa-textarea"
          />
          <div className="mt-4 flex gap-3 flex-wrap">
            <button onClick={connect} disabled={!json.trim() || saving} className="btn-red disabled:opacity-40" data-testid="cal-sa-save">
              <Zap size={14} /> {saving ? "Saving…" : "Connect Google Calendar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChangeCredentialsPanel() {
  const [current, setCurrent] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!current) return toast.error("Enter your current password to make any changes.");
    if (!newEmail && !newPassword) return toast.error("Enter a new email or a new password.");
    if (newPassword && newPassword !== confirmPw) return toast.error("New password and confirmation do not match.");
    if (newPassword && newPassword.length < 8) return toast.error("Password must be at least 8 characters.");
    setSaving(true);
    try {
      const body = { current_password: current };
      if (newEmail) body.new_email = newEmail;
      if (newPassword) body.new_password = newPassword;
      const r = await adminChangeCredentials(body);
      toast.success("Credentials updated");
      // If email changed, refresh stored user
      const stored = JSON.parse(localStorage.getItem("galaxy_admin_user") || "{}");
      stored.email = r.email;
      localStorage.setItem("galaxy_admin_user", JSON.stringify(stored));
      setCurrent(""); setNewEmail(""); setNewPassword(""); setConfirmPw("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not update credentials.");
    } finally { setSaving(false); }
  };

  return (
    <div className="gx-card p-6 mb-6" data-testid="credentials-panel">
      <div className="flex items-center gap-3 mb-5">
        <KeyRound size={18} className="text-[#B91C1C]" />
        <div>
          <p className="font-display text-lg">Login Credentials</p>
          <p className="text-xs text-[#8F8F8F]">Change your admin email or password. Both fields are optional — fill only what you want to update.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="eyebrow block mb-2">Current password (required)</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" data-testid="creds-current" autoComplete="current-password" />
        </div>
        <div>
          <label className="eyebrow block mb-2">New email (optional)</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new-admin@galaxy.salon" className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" data-testid="creds-new-email" autoComplete="email" />
        </div>
        <div />
        <div>
          <label className="eyebrow block mb-2">New password (optional)</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" data-testid="creds-new-password" autoComplete="new-password" />
        </div>
        <div>
          <label className="eyebrow block mb-2">Confirm new password</label>
          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" data-testid="creds-confirm-password" autoComplete="new-password" />
        </div>
      </div>
      <button onClick={submit} disabled={saving} className="btn-red mt-6" data-testid="creds-save">
        <Save size={14} /> {saving ? "Saving…" : "Update Credentials"}
      </button>
    </div>
  );
}

export default function AdminSettings() {
  const [data, setData] = useState(null);
  useEffect(() => { adminBusiness().then(setData); }, []);
  if (!data) return <p className="text-[#8F8F8F]">Loading…</p>;

  const save = async () => {
    await adminUpdateBusiness(data);
    toast.success("Saved");
  };

  return (
    <div data-testid="admin-settings">
      <div className="mb-8"><p className="eyebrow mb-2">Settings</p><h1 className="font-editorial text-4xl">Business & Integrations.</h1></div>

      <GoogleCalendarPanel />
      <ChangeCredentialsPanel />

      <div className="mb-3 flex items-center gap-3">
        <Save size={16} className="text-[#B91C1C]" />
        <p className="font-display text-lg">Business Information</p>
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
      <button onClick={save} className="btn-red mt-6" data-testid="settings-save"><Save size={14} /> Save Business Info</button>
    </div>
  );
}
