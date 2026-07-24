import { useEffect, useState } from "react";
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

export default function AdminEmployees() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => setRows(await adminList("employees"));
  useEffect(() => { load(); }, []);

  const save = async (row) => {
    const body = { ...row };
    if (row.id && rows.find((r) => r.id === row.id)) await adminUpdate("employees", row.id, body);
    else await adminCreate("employees", body);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this employee?")) return;
    await adminDelete("employees", id);
    toast.success("Deleted");
    load();
  };

  const addNew = () => setEditing({
    name: "", position: "", specialty: "", bio: "", photo: "",
    rating: 4.8, google_calendar_id: "", active: true, order: 999,
    working_hours: [0,1,2,3,4,5,6].map((d) => ({ day: d, start: "10:00", end: "20:00", open: true })),
    leaves: [], service_ids: [],
  });

  return (
    <div data-testid="admin-employees">
      <div className="mb-10 md:mb-12 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="eyebrow mb-3">Employees</p>
          <h1 className="font-editorial text-4xl md:text-5xl text-[#F2EDE4]">Our team.</h1>
        </div>
        <button onClick={addNew} className="btn-red" data-testid="employee-add">
          <Plus size={14} /> Add Employee
        </button>
      </div>

      {editing && (
        <div className="gx-panel p-6 md:p-8 mb-8" data-testid="employee-editor">
          <div className="flex items-center gap-5 mb-6">
            {editing.photo ? (
              <img src={editing.photo} alt="" className="w-16 h-16 object-cover rounded-full border border-[#26262A]" />
            ) : (
              <div className="w-16 h-16 rounded-full border border-[#26262A] bg-[#111113] flex items-center justify-center text-[#6E6A62] font-editorial">?</div>
            )}
            <div>
              <p className="eyebrow mb-1">{editing.id ? "Edit employee" : "New employee"}</p>
              <p className="font-editorial text-2xl text-[#F2EDE4]">{editing.name || "Untitled"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Name"><input className="gx-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Position"><input className="gx-input" value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })} /></Field>
            <Field label="Specialty" span="md:col-span-2"><input className="gx-input" value={editing.specialty} onChange={(e) => setEditing({ ...editing, specialty: e.target.value })} /></Field>
            <Field label="Rating"><input type="number" step="0.1" className="gx-input" value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: parseFloat(e.target.value) })} /></Field>
            <Field label="Order"><input type="number" className="gx-input" value={editing.order} onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Photo URL" span="md:col-span-2"><input className="gx-input" value={editing.photo} onChange={(e) => setEditing({ ...editing, photo: e.target.value })} placeholder="https://..." /></Field>
            <Field label="Google Calendar ID (optional)" span="md:col-span-2">
              <input placeholder="e.g. stylist@gmail.com or primary" className="gx-input" value={editing.google_calendar_id || ""} onChange={(e) => setEditing({ ...editing, google_calendar_id: e.target.value })} />
            </Field>
            <Field label="Bio" span="md:col-span-2">
              <textarea rows={3} className="gx-input resize-none" value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-[#D9D3C6] cursor-pointer">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-[#C21A1A] w-4 h-4" />
                Active (bookable)
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => save(editing)} className="btn-red"><Save size={14} /> Save</button>
            <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {rows.map((e) => (
          <div key={e.id} className="gx-panel p-5 flex gap-5 items-start hover:border-[#26262A] transition-colors">
            {e.photo ? (
              <img src={e.photo} alt="" className="w-16 h-16 object-cover rounded-full border border-[#1B1B1E]" />
            ) : (
              <div className="w-16 h-16 rounded-full border border-[#1B1B1E] bg-[#111113] flex items-center justify-center text-[#6E6A62] font-editorial text-lg">
                {e.name?.charAt(0) || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-editorial text-lg text-[#F2EDE4] leading-tight">{e.name}</p>
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#8C8880] mt-1">{e.position}</p>
              <p className="text-xs text-[#D9D3C6] mt-3 line-clamp-2 leading-relaxed">{e.specialty}</p>
              <div className="flex items-center gap-1 mt-3 text-[11px] text-[#F0BEBE]">
                <Star size={11} className="text-[#C21A1A]" fill="#C21A1A" /> {e.rating?.toFixed?.(1) || e.rating}
              </div>
              <div className="flex gap-4 mt-4 text-xs">
                <button onClick={() => setEditing(e)} className="inline-flex items-center gap-1 text-[#D9D3C6] hover:text-white transition-colors">
                  <Pencil size={11} /> Edit
                </button>
                <button onClick={() => remove(e.id)} className="inline-flex items-center gap-1 text-[#C21A1A] hover:text-[#F0BEBE] transition-colors">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
