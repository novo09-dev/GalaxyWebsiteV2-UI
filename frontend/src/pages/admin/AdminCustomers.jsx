import { useEffect, useState } from "react";
import { adminCustomers } from "../../lib/api";

export default function AdminCustomers() {
  const [rows, setRows] = useState([]);
  useEffect(() => { adminCustomers().then(setRows); }, []);

  return (
    <div data-testid="admin-customers">
      <div className="mb-8"><p className="eyebrow mb-2">CRM</p><h1 className="font-editorial text-4xl">Customers.</h1></div>
      <div className="gx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0F0F0F] text-[#8F8F8F]">
            <tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">Email</th><th className="text-right px-4 py-3">Visits</th><th className="text-right px-4 py-3">Lifetime</th><th className="text-left px-4 py-3">Last Visit</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-[#181818]">
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3 text-[#8F8F8F]">{c.email || "—"}</td>
                <td className="px-4 py-3 text-right">{c.total_visits}</td>
                <td className="px-4 py-3 text-right">₹{(c.lifetime_spend || 0).toLocaleString()}</td>
                <td className="px-4 py-3">{c.last_visit || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#8F8F8F]">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
