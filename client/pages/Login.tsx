import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShieldAlert,
  Lock,
  Mail,
  ChevronRight,
  Loader2,
  Fingerprint,
} from "lucide-react";

type RoleOption = {
  label: string;
  email: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  { label: "Admin", email: "admin@antiaifinance.com" },
  { label: "Team", email: "team@antiaifinance.com" },
  { label: "CA Auditor", email: "ca@antiaifinance.com" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleRoleSelect = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("");
    setError("");
    setTimeout(() => passwordRef.current?.focus(), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const finalEmail = email.trim();
    const finalPassword = password;

    if (!finalEmail || !finalPassword) {
      setError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      await login(finalEmail, finalPassword);
      navigate("/");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      <style>{`
        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-reverse-spin {
          animation: reverse-spin 15s linear infinite;
        }
      `}</style>

      <div className="absolute top-[-40%] left-[-20%] w-[80%] h-[80%] rounded-full bg-blue-900/10 blur-[150px] animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute bottom-[-40%] right-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-900/10 blur-[150px] animate-pulse" style={{ animationDuration: "12s" }} />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-spin" style={{ animationDuration: "20s" }} />
            <div className="absolute inset-1.5 rounded-full border border-indigo-500/30 animate-reverse-spin" />
            <div className="absolute inset-3 rounded-full border border-blue-400/50 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-widest uppercase text-white bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
              ANTI AI
            </h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
              Financial Command Center
            </p>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 rounded-3xl shadow-3xl backdrop-blur-2xl p-8 space-y-6">
          <h2 className="text-sm font-semibold text-slate-400 text-center tracking-wide">
            Authenticate to proceed
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-900 rounded-2xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition placeholder-slate-600 font-medium"
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  ref={passwordRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Secret key"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-900 rounded-2xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition placeholder-slate-600 font-medium"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-2xl text-xs text-red-400 font-medium flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-white hover:bg-slate-200 text-slate-950 font-bold text-sm rounded-2xl transition duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-white/5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <span>Unlock Workspace</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="space-y-3 pt-4 border-t border-slate-900">
            <div className="text-center">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-blue-500/70" /> Select Access Role
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role.email}
                  type="button"
                  onClick={() => handleRoleSelect(role.email)}
                  className="px-3 py-1.5 bg-slate-950/30 hover:bg-slate-950 border border-slate-900 hover:border-blue-500/30 rounded-full text-xs font-bold text-slate-400 hover:text-white transition duration-200"
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-700 font-bold uppercase tracking-widest">
          Secured Session // MIS Compliance Registry
        </div>
      </div>
    </div>
  );
}