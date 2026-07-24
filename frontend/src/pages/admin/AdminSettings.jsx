import { useEffect, useState } from "react";
import {
  adminBusiness, adminUpdateBusiness,
  adminCalendarStatus, adminCalendarDisconnect, adminCalendarTest, adminSaveServiceAccount,
  adminChangeCredentials,
} from "../../lib/api";
import { toast } from "sonner";
import { Save, CalendarCheck2, Link2Off, Check, Zap, KeyRound, ChevronDown, ChevronUp, Info, Building2 } from "lucide-react";

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

function PanelHeader({ Icon, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div className="flex items-start gap-4">
        <span className="w-11 h-11 rounded-full border border-[#26262A] bg-[#111113] flex items-center justify-center shrink-0">
          <Icon size={16} className="text-[#C21A1A]" strokeWidth={1.5} />
        </span>
        <div>
          <p className="font-editorial text-2xl text-[#F2EDE4] leading-tight">{title}</p>
          <p className="text-xs text-[#8C8880] mt-1 max-w-md leading-relaxed">{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

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
    } finally {
      setSaving(false);
    }
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
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Test failed — did you share the calendar with the service account?");
    }
  };

  const connectedBadge = cal?.connected ? (
    <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.24em] uppercase text-[#F0BEBE] border border-[#C21A1A]/40 bg-[#C21A1A]/10 px-3 py-1.5 rounded-full" data-testid="calendar-connected-badge">
      <Check size={11} /> Connected {cal.mode === "service_account" ? "· Service Account" : "· OAuth"}
    </span>
  ) : (
    <span className="text-[10px] tracking-[0.24em] uppercase text-[#8C8880] border border-[#26262A] px-3 py-1.5 rounded-full" data-testid="calendar-notconnected-badge">
      Not connected
    </span>
  );

  return (
    <div className="gx-panel p-6 md:p-8 mb-6" data-testid="calendar-panel">
      <PanelHeader
        Icon={CalendarCheck2}
        title="Google Calendar"
        subtitle="Auto-sync bookings to your stylists' calendars and block out busy times."
        right={connectedBadge}
      />

      {cal?.connected ? (
        <div className="space-y-5">
          <div className="text-sm gx-input py-3">
            <p className="text-[10px] tracking-[0.24em] uppercase text-[#8C8880] mb-1">Service Account Email</p>
            <p className="font-mono text-[#F2EDE4] break-all" data-testid="calendar-connected-email">{cal.email}</p>
          </div>
          <p className="text-xs text-[#8C8880] leading-relaxed">
            Add this email as a guest with &ldquo;Make changes to events&rdquo; permission on every stylist&apos;s calendar. Then set each stylist&apos;s <span className="text-[#F2EDE4]">Google Calendar ID</span> under <span className="text-[#F2EDE4]">Employees</span>. Busy events on connected calendars will automatically hide overlapping time slots on the public booking page.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={test} className="btn-ghost" data-testid="cal-test">Test Connection</button>
            <button onClick={disconnect} className="btn-ghost" data-testid="cal-disconnect"><Link2Off size={13} /> Disconnect</button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={() => setHelpOpen((o) => !o)} className="w-full flex items-center justify-between text-xs text-[#D9D3C6] border border-[#232327] rounded px-3.5 py-3 mb-4 hover:border-[#3A3A3E] transition-colors" data-testid="calendar-help-toggle">
            <span className="flex items-center gap-2"><Info size={12} /> How to get your Service Account JSON</span>
            {helpOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {helpOpen && (
            <ol className="text-xs text-[#B9B5AB] leading-relaxed space-y-2 mb-5 pl-5 list-decimal marker:text-[#C21A1A]">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-[#F2EDE4] underline underline-offset-4 decoration-[#C21A1A]">Google Cloud Console</a> and create (or pick) a project.</li>
              <li>Enable the <span className="text-[#F2EDE4]">Google Calendar API</span> in <em>APIs &amp; Services → Library</em>.</li>
              <li>Go to <em>IAM &amp; Admin → Service Accounts</em> → <span className="text-[#F2EDE4]">Create Service Account</span>. No roles needed.</li>
              <li>Open the account, tab <em>Keys → Add key → JSON</em>. A JSON file will download.</li>
              <li>Open the file and paste its entire contents below, then click <span className="text-[#F2EDE4]">Connect</span>.</li>
              <li>Finally, open each stylist&apos;s Google Calendar → <em>Settings and sharing → Share with specific people</em> and add the service account&apos;s email (shown after connection) with &ldquo;Make changes to events&rdquo;. Copy the calendar&apos;s ID into the stylist&apos;s profile under <em>Employees</em>.</li>
            </ol>
          )}

          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder='Paste the full service account JSON here — starts with {"type": "service_account", ...}'
            className="gx-input resize-none font-mono text-xs"
            data-testid="cal-sa-textarea"
          />
          <div className="mt-4 flex gap-3 flex-wrap">
            <button onClick={connect} disabled={!json.trim() || saving} className="btn-red disabled:opacity-40 disabled:cursor-not-allowed" data-testid="cal-sa-save">
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
      const stored = JSON.parse(localStorage.getItem("galaxy_admin_user") || "{}");
      stored.email = r.email;
      localStorage.setItem("galaxy_admin_user", JSON.stringify(stored));
      setCurrent(""); setNewEmail(""); setNewPassword(""); setConfirmPw("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not update credentials.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gx-panel p-6 md:p-8 mb-6" data-testid="credentials-panel">
      <PanelHeader
        Icon={KeyRound}
        title="Login Credentials"
        subtitle="Change your admin email or password. Both fields are optional — fill only what you want to update."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="eyebrow block mb-2">Current password (required)</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="gx-input" data-testid="creds-current" autoComplete="current-password" />
        </div>
        <div>
          <label className="eyebrow block mb-2">New email (optional)</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new-admin@galaxy.salon" className="gx-input" data-testid="creds-new-email" autoComplete="email" />
        </div>
        <div />
        <div>
          <label className="eyebrow block mb-2">New password (optional)</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" className="gx-input" data-testid="creds-new-password" autoComplete="new-password" />
        </div>
        <div>
          <label className="eyebrow block mb-2">Confirm new password</label>
          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="gx-input" data-testid="creds-confirm-password" autoComplete="new-password" />
        </div>
      </div>
      <button onClick={submit} disabled={saving} className="btn-red mt-8 disabled:opacity-40" data-testid="creds-save">
        <Save size={14} /> {saving ? "Saving…" : "Update Credentials"}
      </button>
    </div>
  );
}

export default function AdminSettings() {
  const [data, setData] = useState(null);
  useEffect(() => { adminBusiness().then(setData); }, []);

  const save = async () => {
    await adminUpdateBusiness(data);
    toast.success("Saved");
  };

  if (!data) {
    return (
      <div className="flex items-center gap-3 text-[#8C8880]">
        <span className="w-4 h-4 border border-[#26262A] border-t-[#C21A1A] rounded-full animate-spin" />
        <span className="eyebrow">Loading settings</span>
      </div>
    );
  }

  return (
    <div data-testid="admin-settings">
      <div className="mb-10 md:mb-12">
        <p className="eyebrow mb-3">Settings</p>
        <h1 className="font-editorial text-4xl md:text-5xl text-[#F2EDE4]">
          Business &amp; <span className="italic-accent text-[#C21A1A]">integrations.</span>
        </h1>
      </div>

      <GoogleCalendarPanel />
      <ChangeCredentialsPanel />

      <div className="gx-panel p-6 md:p-8">
        <PanelHeader
          Icon={Building2}
          title="Business Information"
          subtitle="Everything customers see across the website. Updates go live instantly."
          right={(
            <button onClick={save} className="btn-red" data-testid="settings-save">
              <Save size={14} /> Save
            </button>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FIELDS.map(([k, l]) => (
            <div key={k} className={k === "about" || k === "address" ? "md:col-span-2" : ""}>
              <label className="eyebrow block mb-2">{l}</label>
              {k === "about" || k === "address" ? (
                <textarea rows={3} value={data[k] || ""} onChange={(e) => setData({ ...data, [k]: e.target.value })} className="gx-input resize-none" />
              ) : (
                <input value={data[k] || ""} onChange={(e) => setData({ ...data, [k]: e.target.value })} className="gx-input" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
