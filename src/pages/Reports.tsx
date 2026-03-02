import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, ShoppingCart, TrendingUp, Lock, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Reports = () => {
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [closing, setClosing] = useState(false);
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ordersRes, closingsRes, waitersRes] = await Promise.all([
      supabase.from("orders").select("*").gte("created_at", today).neq("status", "cancelada"),
      supabase.from("cash_closings").select("*").order("created_at", { ascending: false }).limit(7),
      supabase.from("waiters" as any).select("*"),
    ]);
    if (ordersRes.data) setTodayOrders(ordersRes.data);
    if (closingsRes.data) setClosings(closingsRes.data);
    if (waitersRes.data) setWaiters(waitersRes.data);
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

  // Calculate tips per waiter
  const waiterTips = waiters.map(w => {
    const ordersForWaiter = todayOrders.filter(o => o.waiter_id === w.id);
    const totalTips = ordersForWaiter.reduce((sum, o) => sum + Number(o.tip_amount || 0), 0);
    return { ...w, totalTips };
  }).filter(w => w.totalTips > 0);

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

        {/* Waiter Tips Section */}
        {waiterTips.length > 0 && (
          <div className="space-y-3 mt-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users size={20} className="text-muted-foreground" />
              Propinas por Mesero (Hoy)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {waiterTips.map((w) => (
                <div key={w.id} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col items-center justify-center text-center">
                  <h4 className="font-bold truncate w-full" title={w.name}>{w.name}</h4>
                  <p className="text-xl font-black text-primary mt-1">${w.totalTips.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button onClick={doCashClosing} disabled={closing} className="w-full touch-target gap-2" variant="default">
            <Lock size={16} />
            {closing ? "Cerrando..." : "Cierre de Caja"}
          </Button>
        </div>

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
