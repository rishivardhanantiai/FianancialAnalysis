import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    {
      icon: "📊",
      label: "Dashboard",
      path: "/",
    },
    {
      icon: "📋",
      label: "Daily Log",
      path: "/log",
    },
    {
      icon: "📈",
      label: "Financial Analysis",
      path: "/analysis",
    },
    {
      icon: "🗂️",
      label: "Projects",
      path: "/projects",
    },
    {
      icon: "🏢",
      label: "Departments",
      path: "/departments",
    },
    {
      icon: "🔮",
      label: "Forecast",
      path: "/forecast",
    },
    {
      icon: "🧠",
      label: "AI Insights",
      path: "/insights",
    },
    {
      icon: "💧",
      label: "Cash Flow",
      path: "/cashflow",
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-56 bg-navy-dark text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto">
      {/* Brand */}
      <div className="p-4 border-b border-navy-light flex flex-col items-center">
        <img
          src="/logo.jpg"
          alt="ANTI AI Logo"
          className="w-12 h-12 mb-2"
        />
        <div className="text-xs text-blue-pale/80 uppercase tracking-widest font-semibold text-center">
          Command Center
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        <div className="px-3 py-2">
          <div className="text-xs font-bold text-white/40 uppercase tracking-wider px-3 mb-2">
            Core
          </div>
          {navItems.slice(0, 2).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 mx-1 rounded-lg text-xs transition-all ${
                isActive(item.path)
                  ? "bg-white/15 text-white font-bold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="px-3 py-2 mt-2">
          <div className="text-xs font-bold text-white/40 uppercase tracking-wider px-3 mb-2">
            Analysis
          </div>
          {navItems.slice(2, 5).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 mx-1 rounded-lg text-xs transition-all ${
                isActive(item.path)
                  ? "bg-white/15 text-white font-bold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="px-3 py-2 mt-2">
          <div className="text-xs font-bold text-white/40 uppercase tracking-wider px-3 mb-2">
            Intelligence
          </div>
          {navItems.slice(5).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 mx-1 rounded-lg text-xs transition-all ${
                isActive(item.path)
                  ? "bg-white/15 text-white font-bold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-navy-light">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-danger/10 text-danger-light hover:bg-danger/20 transition text-xs font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
