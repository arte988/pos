import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, ChefHat, CheckCircle2, Truck, UtensilsCrossed, PackageOpen, Bike } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  service_type: string | null;
  table_id: string | null;
  empresa_id: string | null;
  branch_id: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  item_type: string;
  send_to_kitchen: boolean;
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; next: string | null }> = {
  pendiente: { label: "Pendiente", icon: Clock, color: "bg-warning text-warning-foreground", next: "preparando" },
  preparando: { label: "Preparando", icon: ChefHat, color: "bg-info text-info-foreground", next: "lista" },
  lista: { label: "Lista", icon: CheckCircle2, color: "bg-success text-success-foreground", next: "despachada" },
  despachada: { label: "Despachada", icon: Truck, color: "bg-muted text-muted-foreground", next: null },
};

const Kitchen = () => {
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [filter, setFilter] = useState("pendiente");
  const { toast } = useToast();

  useEffect(() => { if (user) loadEmpresaId(); }, [user]);

  const loadEmpresaId = async () => {
    const { data } = await supabase.from("perfiles").select("empresa_id").eq("id", user?.id).single();
    if (data) {
      setEmpresaId(data.empresa_id);
    }
  };

  useEffect(() => {
    if (!empresaId) return;
    loadOrders();
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `empresa_id=eq.${empresaId}` }, () => {
        loadOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [empresaId]);

  const loadOrders = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("empresa_id", empresaId)
      .gte("created_at", today)
      .order("created_at", { ascending: true });

    if (data) {
      const ids = data.map((o) => o.id);
      if (ids.length > 0) {
        const { data: items } = await supabase.from("order_items").select("*").in("order_id", ids);
        if (items) {
          const grouped: Record<string, OrderItem[]> = {};
          let validOrders: Order[] = [];

          items.forEach((item) => {
            if (item.send_to_kitchen) {
              if (!grouped[item.order_id]) grouped[item.order_id] = [];
              grouped[item.order_id].push(item);
            }
          });

          // Only keep orders that have at least 1 kitchen item
          validOrders = data.filter(o => grouped[o.id] && grouped[o.id].length > 0);

          setOrderItems(grouped);
          setOrders(validOrders);
        }
      } else {
        setOrders([]);
        setOrderItems({});
      }
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      loadOrders(); // ensure fast UI refresh 
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

  const getServiceIcon = (type: string | null) => {
    if (type === 'mesa') return <UtensilsCrossed size={16} />;
    if (type === 'domicilio') return <Bike size={16} />;
    return <PackageOpen size={16} />;
  };

  return (
    <AppLayout>
      <div className="space-y-4 pb-20">
        <h2 className="text-2xl font-bold tracking-tight">Comandas de Cocina</h2>

        {/* Filters Top Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground shadow-md" : "bg-card text-foreground border hover:bg-secondary/80"
                }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${filter === f.key ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                  }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center bg-card border rounded-2xl shadow-sm">
            <ChefHat size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">No hay tickets {filter === "pendiente" ? "pendientes" : filter}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => {
            const config = statusConfig[order.status];
            const items = orderItems[order.id] || [];
            return (
              <div key={order.id} className="relative animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">

                {/* Header info */}
                <div className="mb-4 pb-3 border-b border-dashed flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-primary leading-none">#{order.order_number}</h3>
                    <p className="mt-1 font-bold text-lg leading-tight">{order.customer_name}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground flex items-center gap-1">
                      <Clock size={12} /> {timeSince(order.created_at)}
                    </span>
                    <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-md flex items-center gap-1 capitalize">
                      {getServiceIcon(order.service_type)} {order.service_type}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="mb-6 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <span className="font-black text-lg text-primary">{item.quantity}</span>
                        <span className="text-base font-medium leading-tight pt-0.5">{item.item_name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Action */}
                <div className="pt-2">
                  {config.next && (
                    <button
                      onClick={() => updateStatus(order.id, config.next!)}
                      className="w-full touch-target rounded-xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground transition-all active:scale-95 shadow-sm"
                    >
                      {config.next === "preparando" ? "Comenzar Preparación" : config.next === "lista" ? "Marcar como Lista" : "Despachar"}
                    </button>
                  )}
                  {!config.next && (
                    <div className="w-full text-center p-3 text-sm font-bold text-muted-foreground bg-secondary/50 rounded-xl">
                      Orden Terminada
                    </div>
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
