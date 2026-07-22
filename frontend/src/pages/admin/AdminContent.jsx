import { useEffect, useState } from "react";
import { adminList, adminCreate, adminUpdate, adminDelete } from "../../lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

const TABS = [
  { key: "hero-slides", label: "Hero Slides", fields: ["chapter","headline","description","image","cta_label","order","active"] },
  { key: "gallery", label: "Gallery", fields: ["image","caption","category","order"] },
  { key: "testimonials", label: "Testimonials", fields: ["name","rating","review","photo","active","order"] },
  { key: "faqs", label: "FAQs", fields: ["question","answer","order","active"] },
];

export default function AdminContent() {
  const [tab, setTab] = useState(TABS[0].key);
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const active = TABS.find((t) => t.key === tab);

  const load = async () => setRows(await adminList(tab));
  useEffect(() => { load(); setEditing(null); /* eslint-disable-next-line */ }, [tab]);

  const save = async () => {
    const body = { ...editing };
    if (body.rating) body.rating = parseInt(body.rating);
    if (body.order !== undefined && body.order !== "") body.order = parseInt(body.order);
    if (body.id && rows.find((r) => r.id === body.id)) await adminUpdate(tab, body.id, body);
    else await adminCreate(tab, body);
    toast.success("Saved"); setEditing(null); load();
  };
  const remove = async (id) => { if (!window.confirm("Delete?")) return; await adminDelete(tab, id); toast.success("Deleted"); load(); };
  const addNew = () => { const obj = {}; active.fields.forEach((f) => obj[f] = f === "active" ? true : (f === "order" || f === "rating" ? 0 : "")); setEditing(obj); };

  return (
    <div data-testid="admin-content">
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div><p className="eyebrow mb-2">Website Content</p><h1 className="font-editorial text-4xl">Manage your site.</h1></div>
        <button onClick={addNew} className="btn-red"><Plus size={14} /> New</button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-xs uppercase tracking-widest border ${tab === t.key ? "border-[#B91C1C] text-white" : "border-[#232323] text-[#8F8F8F]"}`} data-testid={`content-tab-${t.key}`}>{t.label}</button>
        ))}
      </div>

      {editing && (
        <div className="gx-card p-6 mb-6" data-testid="content-editor">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {active.fields.map((f) => (
              <div key={f} className={f === "description" || f === "answer" || f === "review" ? "md:col-span-2" : ""}>
                <label className="eyebrow block mb-1">{f.replace("_", " ")}</label>
                {typeof editing[f] === "boolean" ? (
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editing[f]} onChange={(e) => setEditing({ ...editing, [f]: e.target.checked })} className="accent-[#B91C1C]" /> {editing[f] ? "On" : "Off"}</label>
                ) : f === "description" || f === "answer" || f === "review" ? (
                  <textarea rows={3} value={editing[f] || ""} onChange={(e) => setEditing({ ...editing, [f]: e.target.value })} className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" />
                ) : (
                  <input value={editing[f] ?? ""} onChange={(e) => setEditing({ ...editing, [f]: e.target.value })} className="w-full bg-[#0F0F0F] border border-[#232323] px-3 py-2 outline-none focus:border-[#B91C1C]" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} className="btn-red"><Save size={14} /> Save</button>
            <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="gx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0F0F0F] text-[#8F8F8F]">
            <tr>
              {active.fields.slice(0, 3).map((f) => <th key={f} className="text-left px-4 py-3">{f}</th>)}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#181818]">
                {active.fields.slice(0, 3).map((f) => (
                  <td key={f} className="px-4 py-3 max-w-sm truncate">{typeof r[f] === "string" && r[f].startsWith("http") ? <img src={r[f]} alt="" className="w-14 h-10 object-cover" /> : String(r[f] ?? "")}</td>
                ))}
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => setEditing(r)} className="text-xs text-[#DADADA] hover:text-white">Edit</button>
                  <button onClick={() => remove(r.id)} className="text-xs text-[#B91C1C]"><Trash2 size={12} className="inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
