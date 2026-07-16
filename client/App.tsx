import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Index from "./pages/Index";
import DailyLog from "./pages/DailyLog";
import FinancialAnalysis from "./pages/FinancialAnalysis";
import Projects from "./pages/Projects";
import Departments from "./pages/Departments";
import Forecast from "./pages/Forecast";
import NotFound from "./pages/NotFound";
import ImportData from "./pages/ImportData";
import GenerateInvoice from "./pages/GenerateInvoice"; 

// --- Role-based components and guards ---
import ProtectedRoute from "@/components/ProtectedRoute";
import CAPortal from "./pages/CAPortal";
import TeamManagement from "./pages/TeamManagement";

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
            
            {/* Admin and Team Core Routes */}
            <Route path="/" element={<ProtectedRoute allowedRoles={["admin", "team", "ca"]}><Index /></ProtectedRoute>} />
            <Route path="/log" element={<ProtectedRoute allowedRoles={["admin", "team"]}><DailyLog /></ProtectedRoute>} />
            <Route path="/analysis" element={<ProtectedRoute allowedRoles={["admin", "team", "ca"]}><FinancialAnalysis /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute allowedRoles={["admin", "team", "ca"]}><Projects /></ProtectedRoute>} />
            <Route path="/departments" element={<ProtectedRoute allowedRoles={["admin", "team", "ca"]}><Departments /></ProtectedRoute>} />
            <Route path="/forecast" element={<ProtectedRoute allowedRoles={["admin", "team", "ca"]}><Forecast /></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute allowedRoles={["admin", "team", "ca"]}><Index /></ProtectedRoute>} />
            <Route path="/cashflow" element={<ProtectedRoute allowedRoles={["admin", "team", "ca"]}><Index /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute allowedRoles={["admin", "team"]}><ImportData /></ProtectedRoute>} />
            <Route path="/generate-invoice" element={<ProtectedRoute allowedRoles={["admin", "team"]}><GenerateInvoice /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute allowedRoles={["admin", "team"]}><TeamManagement /></ProtectedRoute>} />
            
            {/* CA Portal Route (viewable by CA and Admin) */}
            <Route path="/ca-portal" element={<ProtectedRoute allowedRoles={["admin", "ca"]}><CAPortal /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);