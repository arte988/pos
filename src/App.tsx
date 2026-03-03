import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useLicense } from "@/hooks/useLicense";
import Auth from "./pages/Auth";
import LicenseBlocker from "./components/LicenseBlocker";
import POS from "./pages/POS";
import Kitchen from "./pages/Kitchen";
import Reports from "./pages/Reports";
import Config from "./pages/Config";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();
  const { hasValidLicense, loadingLicense, checkLicense } = useLicense(user);

  if (loading || (user && loadingLicense)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <span className="text-4xl">🍽️</span>
          <p className="mt-2 text-sm text-muted-foreground animate-pulse-soft">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  if (hasValidLicense === false) {
    return <LicenseBlocker onLicenseActivated={checkLicense} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route path="/pos" element={<POS />} />
      <Route path="/cocina" element={<Kitchen />} />
      <Route path="/reportes" element={<Reports />} />
      <Route path="/config" element={<Config />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProtectedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
