import { useEffect, useState } from "react";
import { adminList, adminUpdate, adminCreate, adminDelete } from "../../lib/api";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";

export default function AdminEmployees() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => setRows(await adminList("employees"));
  useEffect(() => { load(); }, []);

  const save = async (row) => {
    const body = { ...row };
    if (row.id && rows.find((r) => r.id === row.id)) await adminUpdate("employees", row.id, body);
    else await adminCreate("employees", body);
    toast.success("Saved"); setEditing(null); load();
  };
  const remove = async (id) => { if (!window.confirm("Delete?")) return; await adminDelete("employees", id); toast.success("Deleted"); load(); };
  const addNew = () => setEditing({ name: "", position: "", specialty: "", bio: "", photo: "", rating: 4.8, google_calendar_id: "", active: true, order: 999, working_hours: [0,1,2,3,4,5,6].map((d) => ({ day: d, start: "10:00", end: "20:00", open: true })), leaves: [], service_ids: [] });

  return (
    <div data-testid="admin-employees">
      <div className="flex justify-between items-end mb-8">
        <div><p className="eyebrow mb-2">Employees</p><h1 className="font-editorial text-4xl">Our team.</h1></div>
        <button onClick={addNew} className="btn-red" data-testid="employee-add"><Plus size={14} /> Add Employee</button>
      </div>

      {editing && (
        <div className="gx-card p-6 mb-6" data-testid="employee-editor">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Field label="Name"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Position"><input className="input" value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })} /></Field>
            <Field label="Specialty"><input className="input" value={editing.specialty} onChange={(e) => setEditing({ ...editing, specialty: e.target.value })} /></Field>
            <Field label="Rating"><input type="number" step="0.1" className="input" value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: parseFloat(e.target.value) })} /></Field>
            <Field label="Photo URL"><input className="input" value={editing.photo} onChange={(e) => setEditing({ ...editing, photo: e.target.value })} /></Field>
            <Field label="Google Calendar ID (optional)"><input placeholder="e.g. stylist@gmail.com or primary" className="input" value={editing.google_calendar_id || ""} onChange={(e) => setEditing({ ...editing, google_calendar_id: e.target.value })} /></Field>
            <Field label="Bio"><textarea rows={3} className="input" value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} /></Field>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => save(editing)} className="btn-red"><Save size={14} /> Save</button>
            <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((e) => (
          <div key={e.id} className="gx-card p-4 flex gap-4">
            <img src={e.photo} alt="" className="w-16 h-16 object-cover" />
            <div className="flex-1">
              <p className="font-display">{e.name}</p>
              <p className="text-xs text-[#8F8F8F]">{e.position}</p>
              <p className="text-xs mt-2">{e.specialty}</p>
              <div className="flex gap-3 mt-3 text-xs">
                <button onClick={() => setEditing(e)} className="text-[#DADADA] hover:text-white">Edit</button>
                <button onClick={() => remove(e.id)} className="text-[#B91C1C]"><Trash2 size={12} className="inline" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <style>{`.input{background:#0F0F0F;border:1px solid #232323;padding:0.6rem 0.8rem;width:100%;outline:none}.input:focus{border-color:#B91C1C}`}</style>
    </div>
  );
}
function Field({ label, children }) { return <div><label className="eyebrow block mb-1">{label}</label>{children}</div>; }
