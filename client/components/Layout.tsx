import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "./Sidebar";

interface LayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function Layout({ title, subtitle, children }: LayoutProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  // Determine status for the badge
  const status = "red";
  const statusText = "● Critical";

  return (
    <div className="shell">
      <Sidebar />

      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            {subtitle && (
              <p style={{ fontSize: "10px", color: "var(--f-muted)", marginTop: "2px" }}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="topbar-right">
            <span className={`status-badge ${status}`}>{statusText}</span>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <button className="btn-ui btn-primary" onClick={() => navigate("/log")}>
              + Add Transaction
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

