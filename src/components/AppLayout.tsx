import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, ChefHat, BarChart3, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { path: "/pos", icon: ShoppingCart, label: "Orden" },
  { path: "/cocina", icon: ChefHat, label: "Cocina" },
  { path: "/reportes", icon: BarChart3, label: "Reportes" },
  { path: "/config", icon: Settings, label: "Config" },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🫓</span>
          <h1 className="text-lg font-bold text-foreground">PupuPOS</h1>
        </div>
        <button onClick={handleLogout} className="touch-target flex items-center gap-1 text-sm text-muted-foreground">
          <LogOut size={16} />
        </button>
      </header>
      <main className="flex-1 overflow-auto p-4 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`touch-target flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
