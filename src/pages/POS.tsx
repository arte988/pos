import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Trash2, Send } from "lucide-react";
import AppLayout from "@/components/AppLayout";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "pupusa" | "bebida" | "postre" | "otro";
};

type Pupusa = { id: string; name: string; price: number; masa_type_id: string; pupusa_type_id: string };
type MenuItem = { id: string; name: string; price: number; category: string };
type MasaType = { id: string; name: string };

const POS = () => {
  const [pupusas, setPupusas] = useState<Pupusa[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [masaTypes, setMasaTypes] = useState<MasaType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [activeTab, setActiveTab] = useState<string>("pupusa");
  const [activeMasa, setActiveMasa] = useState<string>("all");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const [p, m, mt] = await Promise.all([
        supabase.from("pupusas").select("*").eq("available", true),
        supabase.from("menu_items").select("*").eq("available", true),
        supabase.from("masa_types").select("*"),
      ]);
      if (p.data) setPupusas(p.data);
      if (m.data) setMenuItems(m.data);
      if (mt.data) setMasaTypes(mt.data);
    };
    load();
  }, []);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)).filter((c) => c.quantity > 0)
    );
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const sendOrder = async () => {
    if (cart.length === 0) return;
    setSending(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({ customer_name: customerName || "Cliente", total, status: "pendiente" })
        .select()
        .single();
      if (error) throw error;

      const items = cart.map((c) => ({
        order_id: order.id,
        item_type: c.type,
        item_name: c.name,
        quantity: c.quantity,
        unit_price: c.price,
        subtotal: c.price * c.quantity,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) throw itemsError;

      toast({ title: `Orden #${order.order_number} enviada`, description: `Para: ${order.customer_name}` });
      setCart([]);
      setCustomerName("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const categories = [
    { key: "pupusa", label: "🫓 Pupusas" },
    { key: "bebida", label: "🥤 Bebidas" },
    { key: "postre", label: "🍰 Postres" },
    { key: "otro", label: "🍽️ Otros" },
  ];

  const filteredPupusas = activeMasa === "all" ? pupusas : pupusas.filter((p) => p.masa_type_id === activeMasa);
  const filteredMenu = menuItems.filter((m) => m.category === activeTab);

  return (
    <AppLayout>
      <div className="space-y-4">
        <Input
          placeholder="Nombre del cliente"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="touch-target text-base font-medium"
        />

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`touch-target whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === cat.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Masa filter for pupusas */}
        {activeTab === "pupusa" && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveMasa("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeMasa === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              Todas
            </button>
            {masaTypes.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveMasa(m.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeMasa === m.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        {/* Products grid */}
        <div className="grid grid-cols-2 gap-2">
          {activeTab === "pupusa"
            ? filteredPupusas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart({ id: p.id, name: p.name, price: p.price, type: "pupusa" })}
                  className="touch-target animate-slide-up rounded-xl bg-card p-3 text-left shadow-sm transition-all active:scale-95"
                >
                  <p className="text-sm font-medium text-card-foreground">{p.name}</p>
                  <p className="mt-1 text-lg font-bold text-primary">${p.price.toFixed(2)}</p>
                </button>
              ))
            : filteredMenu.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addToCart({ id: m.id, name: m.name, price: m.price, type: m.category as CartItem["type"] })}
                  className="touch-target animate-slide-up rounded-xl bg-card p-3 text-left shadow-sm transition-all active:scale-95"
                >
                  <p className="text-sm font-medium text-card-foreground">{m.name}</p>
                  <p className="mt-1 text-lg font-bold text-primary">${m.price.toFixed(2)}</p>
                </button>
              ))}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Orden actual</h3>
            <div className="space-y-2">
              {cart.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-card-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">${(c.price * c.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(c.id, -1)} className="touch-target flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{c.quantity}</span>
                    <button onClick={() => updateQty(c.id, 1)} className="touch-target flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="text-base font-bold text-card-foreground">Total: ${total.toFixed(2)}</span>
              <Button onClick={sendOrder} disabled={sending} className="touch-target gap-2">
                <Send size={16} />
                {sending ? "Enviando..." : "Enviar Orden"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default POS;
