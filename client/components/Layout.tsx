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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col ml-56 overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-blue-pale px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="ANTI AI Logo"
              className="w-9 h-9 rounded-md object-cover border border-blue-pale"
            />
            <div>
            <h1 className="text-base font-bold text-navy">{title}</h1>
            {subtitle && (
              <p className="text-xs text-blue-mid mt-0.5">{subtitle}</p>
            )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              ● Critical
            </span>

            <div className="text-xs text-blue-mid">
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>

            <button
              onClick={() => navigate("/log")}
              className="ml-2 bg-slate-800 text-white text-sm px-3 py-1.5 rounded-md hover:brightness-95"
            >
              + Add Transaction
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
