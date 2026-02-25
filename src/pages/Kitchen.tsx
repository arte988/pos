import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, ChefHat, CheckCircle2, Truck } from "lucide-react";
import AppLayout from "@/components/AppLayout";

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  item_type: string;
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; next: string | null }> = {
  pendiente: { label: "Pendiente", icon: Clock, color: "bg-warning text-warning-foreground", next: "preparando" },
  preparando: { label: "Preparando", icon: ChefHat, color: "bg-info text-info-foreground", next: "lista" },
  lista: { label: "Lista", icon: CheckCircle2, color: "bg-success text-success-foreground", next: "despachada" },
  despachada: { label: "Despachada", icon: Truck, color: "bg-muted text-muted-foreground", next: null },
};

const Kitchen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [filter, setFilter] = useState("pendiente");
  const { toast } = useToast();

  const loadOrders = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", today)
      .order("created_at", { ascending: true });
    if (data) {
      setOrders(data);
      const ids = data.map((o) => o.id);
      if (ids.length > 0) {
        const { data: items } = await supabase.from("order_items").select("*").in("order_id", ids);
        if (items) {
          const grouped: Record<string, OrderItem[]> = {};
          items.forEach((item) => {
            if (!grouped[item.order_id]) grouped[item.order_id] = [];
            grouped[item.order_id].push(item);
          });
          setOrderItems(grouped);
        }
      }
    }
  };

  useEffect(() => {
    loadOrders();
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filtered = orders.filter((o) => o.status === filter);
  const counts = {
    pendiente: orders.filter((o) => o.status === "pendiente").length,
    preparando: orders.filter((o) => o.status === "preparando").length,
    lista: orders.filter((o) => o.status === "lista").length,
    despachada: orders.filter((o) => o.status === "despachada").length,
  };

  const filters = [
    { key: "pendiente", label: "Pendientes", count: counts.pendiente },
    { key: "preparando", label: "Preparando", count: counts.preparando },
    { key: "lista", label: "Listas", count: counts.lista },
    { key: "despachada", label: "Despachadas", count: counts.despachada },
  ];

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`touch-target flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  filter === f.key ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No hay órdenes {filter === "pendiente" ? "pendientes" : filter === "preparando" ? "en preparación" : filter === "lista" ? "listas" : "despachadas"}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((order) => {
            const config = statusConfig[order.status];
            const items = orderItems[order.id] || [];
            return (
              <div key={order.id} className="animate-slide-up rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-card-foreground">#{order.order_number}</span>
                    <span className="ml-2 text-sm text-muted-foreground">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{timeSince(order.created_at)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
                <div className="mb-3 space-y-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-card-foreground">{item.quantity}x {item.item_name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-card-foreground">${order.total.toFixed(2)}</span>
                  {config.next && (
                    <button
                      onClick={() => updateStatus(order.id, config.next!)}
                      className="touch-target rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all active:scale-95"
                    >
                      {config.next === "preparando" ? "Preparar" : config.next === "lista" ? "Lista" : "Despachar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Kitchen;
