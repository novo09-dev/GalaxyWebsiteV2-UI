import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { adminLogin } from "../../lib/api";
import { ArrowRight, ArrowLeft } from "lucide-react";
import BrandMark from "../../components/galaxy/primitives/BrandMark";

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
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08080A] px-6" data-testid="admin-login-page">
      <div className="absolute top-6 left-6">
        <Link to="/" className="pill-link">
          <ArrowLeft size={11} /> Back to site
        </Link>
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-10">
          <BrandMark variant="logo" size="xl" />
        </Link>

        <div className="gx-panel p-8 md:p-10">
          <p className="eyebrow mb-3">Galaxy · Admin</p>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#F2EDE4] mb-8">
            Sign <span className="italic-accent text-[#C21A1A]">in.</span>
          </h1>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="eyebrow block mb-2">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="gx-input"
                data-testid="login-email"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="eyebrow block mb-2">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="gx-input"
                data-testid="login-password"
                required
                autoComplete="current-password"
              />
            </div>
            <button disabled={loading} className="btn-red w-full justify-center mt-2" data-testid="login-submit">
              {loading ? "Signing in…" : (<>Sign In <ArrowRight size={14} /></>)}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-[10px] tracking-[0.28em] uppercase text-[#6E6A62]">
          Owner &amp; staff access only
        </p>
      </div>
    </div>
  );
}
