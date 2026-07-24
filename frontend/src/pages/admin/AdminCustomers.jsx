import { useEffect, useState } from "react";
import { adminCustomers } from "../../lib/api";

export default function AdminCustomers() {
  const [rows, setRows] = useState([]);
  useEffect(() => { adminCustomers().then(setRows); }, []);

  return (
    <div data-testid="admin-customers">
      <div className="mb-10 md:mb-12">
        <p className="eyebrow mb-3">CRM</p>
        <h1 className="font-editorial text-4xl md:text-5xl text-[#F2EDE4]">
          Customers.
        </h1>
      </div>

      <div className="gx-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0E0E10] border-b border-[#1B1B1E]">
                <th className="text-left px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Name</th>
                <th className="text-left px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Phone</th>
                <th className="text-left px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Email</th>
                <th className="text-right px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Visits</th>
                <th className="text-right px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Lifetime</th>
                <th className="text-left px-5 py-3.5 text-[10px] tracking-[0.24em] uppercase font-medium text-[#8C8880]">Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-[#1B1B1E] hover:bg-[#0E0E10] transition-colors">
                  <td className="px-5 py-4 text-[#F2EDE4]">{c.name}</td>
                  <td className="px-5 py-4 text-[#D9D3C6]">{c.phone}</td>
                  <td className="px-5 py-4 text-[#8C8880]">{c.email || "—"}</td>
                  <td className="px-5 py-4 text-right text-[#F2EDE4]">{c.total_visits}</td>
                  <td className="px-5 py-4 text-right font-editorial text-[#C21A1A]">₹{(c.lifetime_spend || 0).toLocaleString()}</td>
                  <td className="px-5 py-4 text-[#D9D3C6]">{c.last_visit || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <p className="text-[#8C8880] text-sm">No customers yet.</p>
                    <p className="text-[#6E6A62] text-xs mt-2">They will appear here after their first confirmed booking.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
