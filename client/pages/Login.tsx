import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("admin@antiaifinance.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-background to-blue-pale flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-blue-pale">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="text-4xl font-bold text-navy mb-2">⚡ ANTI AI</div>
            <div className="text-sm text-blue-mid font-semibold uppercase tracking-wider">
              Financial Command Center
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-wide mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-blue-pale rounded-lg focus:outline-none focus:ring-2 focus:ring-navy bg-background"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-wide mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-blue-pale rounded-lg focus:outline-none focus:ring-2 focus:ring-navy bg-background"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-danger-bg border border-danger-light rounded-lg text-xs text-danger font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-navy hover:bg-navy-light text-white font-bold rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-blue-pale/50 rounded-lg border border-blue-pale">
            <div className="text-xs font-semibold text-navy mb-2">Demo Credentials:</div>
            <div className="text-xs text-blue-mid font-mono">
              <div>Email: admin@antiaifinance.com</div>
              <div>Password: demo123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
