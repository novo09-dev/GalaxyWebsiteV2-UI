import { useEffect, useState, useCallback } from "react";
import { adminList, adminCreate, adminUpdate, adminDelete } from "../../lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Save, Pencil } from "lucide-react";

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

  const load = useCallback(async () => {
    setRows(await adminList(tab));
  }, [tab]);

  useEffect(() => {
    load();
    setEditing(null);
  }, [load]);

  const save = async () => {
    const body = { ...editing };
    if (body.rating) body.rating = parseInt(body.rating);
    if (body.order !== undefined && body.order !== "") body.order = parseInt(body.order);
    if (body.id && rows.find((r) => r.id === body.id)) await adminUpdate(tab, body.id, body);
    else await adminCreate(tab, body);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    await adminDelete(tab, id);
    toast.success("Deleted");
    load();
  };

  const addNew = () => {
    const obj = {};
    active.fields.forEach((f) => {
      obj[f] = f === "active" ? true : (f === "order" || f === "rating" ? 0 : "");
    });
    setEditing(obj);
  };

  return (
    <div data-testid="admin-content">
      <div className="mb-10 md:mb-12 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="eyebrow mb-3">Website Content</p>
          <h1 className="font-editorial text-4xl md:text-5xl text-[#F2EDE4]">
            Manage your <span className="italic-accent text-[#C21A1A]">site.</span>
          </h1>
        </div>
        <button onClick={addNew} className="btn-red">
          <Plus size={14} /> New {active.label.slice(0, -1)}
        </button>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[10px] tracking-[0.24em] uppercase border rounded-full transition-all ${
              tab === t.key
                ? "border-[#C21A1A] bg-[#C21A1A]/10 text-[#F2EDE4]"
                : "border-[#26262A] text-[#8C8880] hover:border-[#3A3A3E] hover:text-[#F2EDE4]"
            }`}
            data-testid={`content-tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {editing && (
        <div className="gx-panel p-6 md:p-8 mb-8" data-testid="content-editor">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="eyebrow mb-2">{editing.id ? "Edit" : "New"} {active.label.slice(0, -1)}</p>
              <p className="font-editorial text-2xl text-[#F2EDE4]">{editing.headline || editing.question || editing.name || editing.caption || "Untitled"}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {active.fields.map((f) => {
              const isTextarea = f === "description" || f === "answer" || f === "review";
              const isBool = typeof editing[f] === "boolean";
              return (
                <div key={f} className={isTextarea ? "md:col-span-2" : ""}>
                  <label className="eyebrow block mb-2">{f.replace(/_/g, " ")}</label>
                  {isBool ? (
                    <label className="flex items-center gap-2 text-sm text-[#D9D3C6] cursor-pointer">
                      <input type="checkbox" checked={editing[f]} onChange={(e) => setEditing({ ...editing, [f]: e.target.checked })} className="accent-[#C21A1A] w-4 h-4" />
                      {editing[f] ? "On" : "Off"}
                    </label>
                  ) : isTextarea ? (
                    <textarea rows={3} value={editing[f] || ""} onChange={(e) => setEditing({ ...editing, [f]: e.target.value })} className="gx-input resize-none" />
                  ) : (
                    <input value={editing[f] ?? ""} onChange={(e) => setEditing({ ...editing, [f]: e.target.value })} className="gx-input" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={save} className="btn-red"><Save size={14} /> Save</button>
            <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="gx-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0E0E10] border-b border-[#1B1B1E]">
                {active.fields.slice(0, 3).map((f) => (
                  <th key={f} className="text-left px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">{f.replace(/_/g, " ")}</th>
                ))}
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#1B1B1E] hover:bg-[#0E0E10] transition-colors">
                  {active.fields.slice(0, 3).map((f) => (
                    <td key={f} className="px-5 py-4 max-w-sm truncate text-[#F2EDE4]">
                      {typeof r[f] === "string" && r[f].startsWith("http")
                        ? <img src={r[f]} alt="" className="w-16 h-11 object-cover rounded border border-[#1B1B1E]" />
                        : String(r[f] ?? "")}
                    </td>
                  ))}
                  <td className="px-5 py-4 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditing(r)} className="inline-flex items-center gap-1 text-xs text-[#D9D3C6] hover:text-white transition-colors">
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={() => remove(r.id)} className="inline-flex items-center gap-1 text-xs text-[#C21A1A] hover:text-[#F0BEBE] transition-colors">
                      <Trash2 size={11} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={active.fields.slice(0,3).length + 1} className="px-5 py-16 text-center text-[#8C8880] text-sm">Nothing here yet. Add the first item using the button above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
