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

// 👉 1. IMPORT THE NEW PAGE HERE
import GenerateInvoice from "./pages/GenerateInvoice"; 

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
            <Route path="/" element={<Index />} />
            <Route path="/log" element={<DailyLog />} />
            <Route path="/analysis" element={<FinancialAnalysis />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/insights" element={<Index />} />
            <Route path="/cashflow" element={<Index />} />
            <Route path="/import" element={<ImportData />} />
            
            {/* 👉 2. ADD THE ROUTE HERE */}
            <Route path="/generate-invoice" element={<GenerateInvoice />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);