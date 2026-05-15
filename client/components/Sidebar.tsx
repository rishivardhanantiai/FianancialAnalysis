import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { ChangePwModal } from "./ChangePwModal";

export default function Sidebar() {
  const { logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChangePwOpen, setIsChangePwOpen] = useState(false);

  // Determine active tab from pathname
  const path = location.pathname;
  let activeTab = "dashboard";
  if (path === "/log") activeTab = "log";
  else if (path === "/analysis") activeTab = "analysis";
  else if (path === "/projects") activeTab = "projects";
  else if (path === "/departments") activeTab = "departments";
  else if (path === "/forecast") activeTab = "forecast";
  else if (path === "/insights") activeTab = "insights";
  else if (path === "/cashflow") activeTab = "cashflow";
  else if (path === "/") activeTab = "dashboard";

  const PAGE_TITLES: Record<string, string> = {
    dashboard: "Dashboard",
    log: "Daily Log",
    analysis: "Financial Analysis",
    projects: "Project Tracker",
    departments: "Department Tracker",
    forecast: "3-Month Forecast",
    insights: "AI Insights",
    cashflow: "Cash Flow",
  };

  const nav = (id: string) => {
    navigate(id === "dashboard" ? "/" : `/${id}`);
  };

  // Mock status for now, or could be passed as props/context
  const status = "red";

  return (
    <>
      <nav className="sidebar">
        <div className="brand">
          <img src="/logo.jpg" alt="ANTI AI Logo" className="brand-logo" />
          <div className="brand-name">ANTI AI</div>
          <div className="brand-sub">Command Center</div>
        </div>

        <div className="nav-section">Core</div>
        {[
          { id: "dashboard", icon: "📊" },
          { id: "log", icon: "📋" },
        ].map(({ id, icon }) => (
          <button
            key={id}
            className={`nav-item ${activeTab === id ? "active" : ""}`}
            onClick={() => nav(id)}
          >
            <span className="icon">{icon}</span>
            <span>{PAGE_TITLES[id]}</span>
            {id === "dashboard" && <span className={`status-dot ${status}`}></span>}
          </button>
        ))}

        <div className="nav-section">Analysis</div>
        {[
          { id: "analysis", icon: "📈" },
          { id: "projects", icon: "🗂️" },
          { id: "departments", icon: "🏢" },
        ].map(({ id, icon }) => (
          <button
            key={id}
            className={`nav-item ${activeTab === id ? "active" : ""}`}
            onClick={() => nav(id)}
          >
            <span className="icon">{icon}</span>
            <span>{PAGE_TITLES[id]}</span>
          </button>
        ))}

        <div className="nav-section">Intelligence</div>
        {[
          { id: "forecast", icon: "🔮" },
          { id: "insights", icon: "🧠" },
          { id: "cashflow", icon: "💧" },
        ].map(({ id, icon }) => (
          <button
            key={id}
            className={`nav-item ${activeTab === id ? "active" : ""}`}
            onClick={() => nav(id)}
          >
            <span className="icon">{icon}</span>
            <span>{PAGE_TITLES[id]}</span>
          </button>
        ))}

        <div style={{ flex: 1 }}></div>

        <div
          className="nav-section"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}
        >
          System
        </div>
        <button className="nav-item" onClick={() => setIsChangePwOpen(true)}>
          <span className="icon">🔑</span>
          <span>Change Password</span>
        </button>
        <button
          className="nav-item"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          style={{ color: "var(--red)" }}
        >
          <span className="icon">🚪</span>
          <span>Sign Out</span>
        </button>
      </nav>

      {isChangePwOpen && (
        <ChangePwModal
          onClose={() => setIsChangePwOpen(false)}
          changePassword={changePassword}
        />
      )}
    </>
  );
}

