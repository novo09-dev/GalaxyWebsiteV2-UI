import { Fragment, useEffect, useState } from "react";
import { adminList, adminUpdate, adminCreate, adminDelete } from "../../lib/api";
import { toast } from "sonner";
import { Plus, Save, Trash2, Pencil, Star } from "lucide-react";

function Field({ label, children, span }) {
  return (
    <div className={span || ""}>
      <label className="eyebrow block mb-2">{label}</label>
      {children}
    </div>
  );
}

export default function AdminServices() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const load = async () => {
    const [s, c] = await Promise.all([adminList("services"), adminList("categories")]);
    setRows(s); setCats(c);
  };
  useEffect(() => { load(); }, []);

  const save = async (row) => {
    const body = { ...row, price: parseFloat(row.price), deposit: parseFloat(row.deposit), duration: parseInt(row.duration) };
    if (row.id && rows.find((r) => r.id === row.id)) await adminUpdate("services", row.id, body);
    else await adminCreate("services", body);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this service? This cannot be undone.")) return;
    await adminDelete("services", id);
    toast.success("Deleted");
    load();
  };

  const addNew = () => setEditing({
    name: "", category_id: cats[0]?.id, group: "Haircuts",
    duration: 30, price: 0, deposit: 0, image: "",
    featured: false, active: true, order: 999,
  });
  const filteredRows =
    categoryFilter === "all"
      ? rows
      : rows.filter((r) => r.category_id === categoryFilter);
  const groupedRows = filteredRows.reduce((groups, service) => {
    const groupName = service.group || "Other Services";

    if (!groups[groupName]) {
      groups[groupName] = [];
    }

    groups[groupName].push(service);
    return groups;
  }, {});
  return (
    <div data-testid="admin-services">
      <div className="mb-10 md:mb-12 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="eyebrow mb-3">Services</p>
          <h1 className="font-editorial text-4xl md:text-5xl text-[#F2EDE4]">Service menu.</h1>
        </div>
        <button onClick={addNew} className="btn-red" data-testid="service-add">
          <Plus size={14} /> Add Service
        </button>
      </div>

      {editing && (
        <div className="gx-panel p-6 md:p-8 mb-8" data-testid="service-editor">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="eyebrow mb-2">{editing.id ? "Edit service" : "New service"}</p>
              <p className="font-editorial text-2xl text-[#F2EDE4]">{editing.name || "Untitled service"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Name" span="md:col-span-2">
              <input className="gx-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Group">
              <input className="gx-input" value={editing.group || ""} onChange={(e) => setEditing({ ...editing, group: e.target.value })} />
            </Field>
            <Field label="Category">
              <select className="gx-input" value={editing.category_id} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Duration (min)">
              <input type="number" className="gx-input" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} />
            </Field>
            <Field label="Price (₹)">
              <input type="number" className="gx-input" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
            </Field>
            <Field label="Deposit (₹)">
              <input type="number" className="gx-input" value={editing.deposit} onChange={(e) => setEditing({ ...editing, deposit: e.target.value })} />
            </Field>
            <Field label="Order">
              <input type="number" className="gx-input" value={editing.order} onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })} />
            </Field>
            <Field label="Image URL" span="md:col-span-3">
              <input className="gx-input" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="https://..." />
            </Field>

            <div className="md:col-span-3 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-[#D9D3C6] cursor-pointer">
                <input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} className="accent-[#C21A1A] w-4 h-4" />
                Featured on homepage
              </label>
              <label className="flex items-center gap-2 text-sm text-[#D9D3C6] cursor-pointer">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-[#C21A1A] w-4 h-4" />
                Active (visible)
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => save(editing)} className="btn-red" data-testid="service-save">
              <Save size={14} /> Save
            </button>
            <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="gx-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1B1B1E] flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-4 py-2 text-[10px] tracking-[0.18em] uppercase border transition-colors ${
              categoryFilter === "all"
                ? "border-[#C21A1A] bg-[#C21A1A] text-white"
                : "border-[#26262A] text-[#8C8880] hover:text-[#F2EDE4] hover:border-[#3A3A3E]"
            }`}
          >
            All Services
          </button>

          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-4 py-2 text-[10px] tracking-[0.18em] uppercase border transition-colors ${
                categoryFilter === c.id
                  ? "border-[#C21A1A] bg-[#C21A1A] text-white"
                  : "border-[#26262A] text-[#8C8880] hover:text-[#F2EDE4] hover:border-[#3A3A3E]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0E0E10] border-b border-[#1B1B1E]">
                <th className="text-left px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Service</th>
                <th className="text-left px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Group</th>
                <th className="text-right px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Duration</th>
                <th className="text-right px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Price</th>
                <th className="text-right px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Deposit</th>
                <th className="text-center px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Featured</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedRows).map(([groupName, services]) => (
                <Fragment key={groupName}>
                  <tr className="bg-[#0E0E10] border-t border-[#26262A]">
                    <td colSpan={7} className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-px bg-[#C21A1A]" />
                        <span className="text-[10px] tracking-[0.24em] uppercase font-medium text-[#D9D3C6]">
                          {groupName}
                        </span>
                        <span className="text-[10px] text-[#6E6A62]">
                          {services.length} {services.length === 1 ? "service" : "services"}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {services.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-[#1B1B1E] hover:bg-[#0E0E10] transition-colors"
                    >
                      <td className="px-5 py-4 text-[#F2EDE4]">{r.name}</td>
                      <td className="px-5 py-4 text-[#8C8880]">{r.group}</td>
                      <td className="px-5 py-4 text-right text-[#D9D3C6]">{r.duration}m</td>
                      <td className="px-5 py-4 text-right text-[#F2EDE4]">₹{r.price}</td>
                      <td className="px-5 py-4 text-right font-editorial text-[#C21A1A]">
                        ₹{r.deposit}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {r.featured ? (
                          <Star
                            size={14}
                            className="text-[#C21A1A] inline"
                            fill="#C21A1A"
                          />
                        ) : (
                          <span className="text-[#3A3A3E]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right space-x-3 whitespace-nowrap">
                        <button
                          onClick={() => setEditing(r)}
                          className="inline-flex items-center gap-1 text-xs text-[#D9D3C6] hover:text-white transition-colors"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          className="inline-flex items-center gap-1 text-xs text-[#C21A1A] hover:text-[#F0BEBE] transition-colors"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
