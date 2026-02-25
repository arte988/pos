import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, ShoppingCart, TrendingUp, Lock } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Reports = () => {
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [closing, setClosing] = useState(false);
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ordersRes, closingsRes] = await Promise.all([
      supabase.from("orders").select("*").gte("created_at", today).neq("status", "cancelada"),
      supabase.from("cash_closings").select("*").order("created_at", { ascending: false }).limit(7),
    ]);
    if (ordersRes.data) setTodayOrders(ordersRes.data);
    if (closingsRes.data) setClosings(closingsRes.data);
  };

  const totalSales = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrders = todayOrders.length;
  const dispatched = todayOrders.filter((o) => o.status === "despachada").length;

  const doCashClosing = async () => {
    setClosing(true);
    try {
      const { error } = await supabase.from("cash_closings").insert({
        closing_date: today,
        total_sales: totalSales,
        total_orders: totalOrders,
        total_pupusas: 0,
      });
      if (error) throw error;
      toast({ title: "Cierre de caja realizado", description: `Total: $${totalSales.toFixed(2)}` });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setClosing(false);
    }
  };

  const stats = [
    { label: "Ventas Hoy", value: `$${totalSales.toFixed(2)}`, icon: DollarSign, color: "bg-success/10 text-success" },
    { label: "Órdenes", value: totalOrders, icon: ShoppingCart, color: "bg-info/10 text-info" },
    { label: "Despachadas", value: dispatched, icon: TrendingUp, color: "bg-primary/10 text-primary" },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Resumen del Día</h2>

        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-3 text-center shadow-sm">
              <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${s.color}`}>
                <s.icon size={18} />
              </div>
              <p className="text-lg font-bold text-card-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <Button onClick={doCashClosing} disabled={closing} className="w-full touch-target gap-2" variant="default">
          <Lock size={16} />
          {closing ? "Cerrando..." : "Cierre de Caja"}
        </Button>

        {closings.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Cierres recientes</h3>
            {closings.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-card p-3 shadow-sm">
                <span className="text-sm text-card-foreground">{c.closing_date}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-card-foreground">${Number(c.total_sales).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{c.total_orders} órdenes</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Reports;
