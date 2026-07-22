import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { adminLogin } from "../../lib/api";
import { ArrowRight } from "lucide-react";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@galaxy.salon");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await adminLogin({ email, password });
      localStorage.setItem("galaxy_admin_token", token);
      localStorage.setItem("galaxy_admin_user", JSON.stringify(user));
      toast.success("Welcome back");
      nav("/admin");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]" data-testid="admin-login-page">
      <div className="w-full max-w-md p-8">
        <Link to="/" className="flex items-center justify-center mb-10">
          <img
            src="https://customer-assets-v7afamib.emergentagent.net/job_appointment-hub-969/artifacts/9d3zwini_Brand%20logo.png"
            alt="Galaxy — Hair · Beauty · Style"
            className="h-20 w-auto"
          />
        </Link>
        <div className="gx-card p-8">
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="font-editorial text-3xl mb-8">Sign in.</h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="eyebrow block mb-2">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full bg-[#0F0F0F] border border-[#232323] px-4 py-3 focus:border-[#B91C1C] outline-none" data-testid="login-email" required />
            </div>
            <div>
              <label className="eyebrow block mb-2">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full bg-[#0F0F0F] border border-[#232323] px-4 py-3 focus:border-[#B91C1C] outline-none" data-testid="login-password" required />
            </div>
            <button disabled={loading} className="btn-red w-full justify-center" data-testid="login-submit">
              {loading ? "Signing in…" : (<>Sign In <ArrowRight size={14} /></>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
