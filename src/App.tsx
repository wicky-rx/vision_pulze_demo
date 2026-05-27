import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import UserDetails from "./pages/UserDetails";
import ErrorBoundary from "./components/ErrorBoundary";

import { toast } from "sonner";

const queryClient = new QueryClient();

// Add global fetch interceptor for 429 error handling
const originalFetch = window.fetch;
let lastToastTime = 0;
const TOAST_THROTTLE_MS = 3000; // Only show one toast every 3 seconds

window.fetch = async (...args) => {
  const response = await originalFetch(...args);

  if (response.status === 401 || response.status === 403) {
    const session = localStorage.getItem("user_session");
    const token = localStorage.getItem("token");

    // Only logout if we actually have a session/token to clear
    if (session || token) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_session");

      // Prevent infinite redirect loops if we're already on login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=true";
      }
    }
  }

  if (response.status === 429) {
    const now = Date.now();
    if (now - lastToastTime > TOAST_THROTTLE_MS) {
      lastToastTime = now;

      try {
        // Try to clone the response to read body without affecting the original requester
        const clone = response.clone();
        const data = await clone.json();

        toast.error(data.error || "Too many requests. Please slow down.", {
          duration: 3000,
          id: "rate-limit-error", // Ensure we don't stack multiple identical toasts
          description: "System is protecting itself from excessive traffic."
        });
      } catch (e) {
        // Fallback if parsing fails
        toast.error("Too many requests. Please wait a moment.", {
          duration: 3000,
          id: "rate-limit-error"
        });
      }
    }
  }

  return response;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<UserDetails />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

// export default App;
