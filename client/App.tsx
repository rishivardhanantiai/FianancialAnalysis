import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DailyLog from "./pages/DailyLog";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<DailyLog />} />
            <Route
              path="/analysis"
              element={
                <Placeholder
                  title="Financial Analysis"
                  subtitle="Auto-aggregated from Daily Log · Month-by-month performance"
                />
              }
            />
            <Route
              path="/projects"
              element={
                <Placeholder
                  title="Project Tracker"
                  subtitle="Auto P&L per project from Daily Log"
                />
              }
            />
            <Route
              path="/departments"
              element={
                <Placeholder
                  title="Department Tracker"
                  subtitle="Budget vs Actual · Efficiency flags · Auto from Daily Log"
                />
              }
            />
            <Route
              path="/forecast"
              element={
                <Placeholder
                  title="3-Month Revenue Projection"
                  subtitle="Base auto-pulled from Daily Log · Only assumptions are editable"
                />
              }
            />
            <Route
              path="/insights"
              element={
                <Placeholder
                  title="AI Insights Engine"
                  subtitle="Auto-generated from Daily Log rules engine · Updates with every transaction"
                />
              }
            />
            <Route
              path="/cashflow"
              element={
                <Placeholder
                  title="Cash Flow Analysis"
                  subtitle="Running cash position · Inflows vs Outflows"
                />
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
