import { useEffect, useState } from "react";
import { adminBusiness, adminUpdateBusiness } from "../../lib/api";
import { toast } from "sonner";
import { Save } from "lucide-react";

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
  useEffect(() => { adminBusiness().then(setData); }, []);
  if (!data) return <p className="text-[#8F8F8F]">Loading…</p>;

  const save = async () => {
    await adminUpdateBusiness(data);
    toast.success("Saved");
  };

  return (
    <div data-testid="admin-settings">
      <div className="mb-8"><p className="eyebrow mb-2">Settings</p><h1 className="font-editorial text-4xl">Business information.</h1></div>
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
