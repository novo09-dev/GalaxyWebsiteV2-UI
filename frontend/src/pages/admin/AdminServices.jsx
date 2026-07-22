import { useEffect, useState } from "react";
import { adminList, adminUpdate, adminCreate, adminDelete } from "../../lib/api";
import { toast } from "sonner";
import { Plus, Save, Trash2, Star } from "lucide-react";

export default function AdminServices() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [s, c] = await Promise.all([adminList("services"), adminList("categories")]);
    setRows(s); setCats(c);
  };
  useEffect(() => { load(); }, []);

  const save = async (row) => {
    const body = { ...row, price: parseFloat(row.price), deposit: parseFloat(row.deposit), duration: parseInt(row.duration) };
    if (row.id && rows.find((r) => r.id === row.id)) await adminUpdate("services", row.id, body);
    else await adminCreate("services", body);
    toast.success("Saved"); setEditing(null); load();
  };
  const remove = async (id) => { if (!window.confirm("Delete?")) return; await adminDelete("services", id); toast.success("Deleted"); load(); };

  const addNew = () => setEditing({ name: "", category_id: cats[0]?.id, group: "Haircuts", duration: 30, price: 0, deposit: 0, image: "", featured: false, active: true, order: 999 });

  return (
    <div data-testid="admin-services">
      <div className="flex justify-between items-end mb-8">
        <div><p className="eyebrow mb-2">Services</p><h1 className="font-editorial text-4xl">Service menu.</h1></div>
        <button onClick={addNew} className="btn-red" data-testid="service-add"><Plus size={14} /> Add Service</button>
      </div>

      {editing && (
        <div className="gx-card p-6 mb-6" data-testid="service-editor">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <Field label="Name"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Category">
              <select className="input" value={editing.category_id} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Group"><input className="input" value={editing.group || ""} onChange={(e) => setEditing({ ...editing, group: e.target.value })} /></Field>
            <Field label="Duration (min)"><input type="number" className="input" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} /></Field>
            <Field label="Price (₹)"><input type="number" className="input" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></Field>
            <Field label="Deposit (₹)"><input type="number" className="input" value={editing.deposit} onChange={(e) => setEditing({ ...editing, deposit: e.target.value })} /></Field>
            <Field label="Image URL"><input className="input" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} className="accent-[#B91C1C]" /> Featured</label>
            <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-[#B91C1C]" /> Active</label>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => save(editing)} className="btn-red" data-testid="service-save"><Save size={14} /> Save</button>
            <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="gx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0F0F0F] text-[#8F8F8F]">
            <tr><th className="text-left px-4 py-3">Service</th><th className="text-left px-4 py-3">Group</th><th className="text-right px-4 py-3">Duration</th><th className="text-right px-4 py-3">Price</th><th className="text-right px-4 py-3">Deposit</th><th className="text-center px-4 py-3">Featured</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#181818]">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-[#8F8F8F]">{r.group}</td>
                <td className="px-4 py-3 text-right">{r.duration}m</td>
                <td className="px-4 py-3 text-right">₹{r.price}</td>
                <td className="px-4 py-3 text-right text-[#B91C1C]">₹{r.deposit}</td>
                <td className="px-4 py-3 text-center">{r.featured ? <Star size={14} className="text-[#B91C1C] inline" fill="#B91C1C" /> : ""}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setEditing(r)} className="text-xs text-[#DADADA] hover:text-white">Edit</button>
                  <button onClick={() => remove(r.id)} className="text-xs text-[#B91C1C]"><Trash2 size={12} className="inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`.input{background:#0F0F0F;border:1px solid #232323;padding:0.6rem 0.8rem;width:100%;outline:none}.input:focus{border-color:#B91C1C}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="eyebrow block mb-1">{label}</label>{children}</div>;
}
