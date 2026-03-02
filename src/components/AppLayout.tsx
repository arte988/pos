import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, ChefHat, BarChart3, Settings, LogOut, Store, ShieldCheck, AlertTriangle, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";

const tabs = [
  { path: "/pos", icon: ShoppingCart, label: "Orden" },
  { path: "/cocina", icon: ChefHat, label: "Cocina" },
  { path: "/reportes", icon: BarChart3, label: "Reportes" },
  { path: "/config", icon: Settings, label: "Config" },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [empresaName, setEmpresaName] = useState<string | null>(null);
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);

  useEffect(() => {
    const fetchEmpresa = async () => {
      if (!user) return;
      // We can fetch the user's empresa directly because RLS limits the result to only their empresa
      const { data, error } = await supabase
        .from('empresas')
        .select('nombre, licencia_expira_el')
        .maybeSingle();

      if (!error && data) {
        setEmpresaName(data.nombre);

        if (data.licencia_expira_el) {
          const expiraDate = new Date(data.licencia_expira_el);
          const now = new Date();
          const diffTime = expiraDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDiasRestantes(diffDays > 0 ? diffDays : 0);
        }
      }
    };

    fetchEmpresa();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isLicenciaPorExpirar = diasRestantes !== null && diasRestantes <= 5;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🫓</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground leading-tight">
                {empresaName || "easypos"}
              </h1>
              {diasRestantes !== null && (
                <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${isLicenciaPorExpirar ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                  {isLicenciaPorExpirar ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
                  <span>Activa: {diasRestantes} días</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate w-32 md:w-auto">
              {user?.email || "Cargando..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="touch-target flex items-center justify-center text-foreground hover:bg-secondary/80 bg-secondary px-3 py-1.5 rounded-full shrink-0 transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={handleLogout} className="touch-target flex items-center gap-1 text-sm text-destructive hover:text-destructive/80 transition-colors bg-destructive/10 px-3 py-1.5 rounded-full shrink-0">
            <LogOut size={16} />
            <span className="hidden sm:inline font-medium">Salir</span>
          </button>
        </div>
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
                className={`touch-target flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
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
