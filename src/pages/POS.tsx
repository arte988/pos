import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Trash2, Send, Store, UtensilsCrossed, PackageOpen, Bike, ChevronLeft, Table as TableIcon, Printer, Banknote, UserCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: string;
  send_to_kitchen: boolean;
};

const POS = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Data states
  const [branches, setBranches] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [pupusas, setPupusas] = useState<any[]>([]);
  const [pupusaTypes, setPupusaTypes] = useState<any[]>([]);
  const [masaTypes, setMasaTypes] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // Alimentos
  const [subcategories, setSubcategories] = useState<any[]>([]); // Categorías
  const [waiters, setWaiters] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // App Flow State
  const [step, setStep] = useState<"branch" | "service" | "table" | "waiter" | "name" | "menu" | "prepay" | "checkout">("branch");

  // Selections
  const [activeBranch, setActiveBranch] = useState<any>(null);
  const [serviceType, setServiceType] = useState<"mesa" | "llevar" | "domicilio" | null>(null);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");

  // Menu State
  const [activeTab, setActiveTab] = useState<string>("pupusa"); // Top level (Pupusas, Combos, Others)
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // Alimento seleccionado en el Sidebar
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null); // Subcategoría seleccionada
  const [activeRelleno, setActiveRelleno] = useState<{ id: string, name: string, price: number } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sending, setSending] = useState(false);

  // Checkout State (Mesa)
  const [activeTableOrder, setActiveTableOrder] = useState<any>(null);
  const [activeTableItems, setActiveTableItems] = useState<any[]>([]);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const [tipAmount, setTipAmount] = useState<number | "">("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");

  useEffect(() => { if (user) loadInitial(); }, [user]);

  const loadInitial = async () => {
    const { data: perfil } = await supabase.from("perfiles").select("empresa_id").eq("id", user?.id).single();
    if (perfil) {
      setEmpresaId(perfil.empresa_id);
      loadData(perfil.empresa_id);
    }
  };

  const loadData = async (empId: string) => {
    const [b, t, m, pt, mi, p, c, sc, w, rs] = await Promise.all([
      supabase.from("branches").select("*").eq("empresa_id", empId),
      supabase.from("tables").select("*").eq("empresa_id", empId),
      supabase.from("masa_types").select("*"),
      supabase.from("pupusa_types").select("*"),
      supabase.from("menu_items").select("*").eq("empresa_id", empId),
      supabase.from("pupusas").select("*").eq("available", true),
      supabase.from("categories" as any).select("*").eq("empresa_id", empId), // Alimentos
      supabase.from("subcategories" as any).select("*").eq("empresa_id", empId), // Categorias reales
      supabase.from("waiters" as any).select("*").eq("empresa_id", empId).eq("is_active", true),
      supabase.from("restaurant_settings").select("*").eq("empresa_id", empId),
      supabase.from("payment_methods" as any).select("*").eq("empresa_id", empId).eq("active", true),
    ]);

    if (b.data) {
      setBranches(b.data);
      if (b.data.length === 1) {
        setActiveBranch(b.data[0]);
        setStep("service");
      }
    }
    if (t.data) setTables(t.data);
    if (m.data) setMasaTypes(m.data);
    if (pt.data) setPupusaTypes(pt.data);
    if (mi.data) setMenuItems(mi.data);
    if (p.data) setPupusas(p.data);
    if (c.data) setCategories(c.data);
    if (sc.data) setSubcategories(sc.data);
    if (w.data) setWaiters(w.data);
    if (rs.data) setSettings(rs.data);
    if (pm.data) {
      setPaymentMethods(pm.data);
      if (pm.data.length > 0) setSelectedPaymentMethod(pm.data[0].id);
    }
  };

  const handleSelectBranch = (branch: any) => {
    setActiveBranch(branch);
    setStep("service");
  };

  const handleSelectService = (type: "mesa" | "llevar" | "domicilio") => {
    setServiceType(type);
    if (type === "mesa") {
      setStep("table");
    } else {
      setStep("name");
    }
  };

  const handleSelectTable = async (table: any) => {
    if (table.status === "occupied") {
      const { data: orders, error: fetchErr } = await supabase
        .from("orders")
        .select("*")
        .eq("table_id", table.id)
        .neq("status", "pagada")
        .neq("status", "cancelada")
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchErr) {
        toast({ title: "Error", description: fetchErr.message, variant: "destructive" });
        return;
      }

      const order = orders && orders.length > 0 ? orders[0] : null;

      if (order) {
        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        setActiveTableOrder(order);
        setActiveTableItems(items || []);
        setCheckoutTotal(order.total);

        // Calculate tip
        const branchSettings = settings.find(s => s.branch_id === table.branch_id);
        const defaultTipPercentage = branchSettings?.tip_percentage || 0;
        const calculatedTip = order.total * (defaultTipPercentage / 100);

        setTipAmount((order as any).tip_amount > 0 ? (order as any).tip_amount : (calculatedTip > 0 ? parseFloat(calculatedTip.toFixed(2)) : ""));
        setStep("checkout");
      } else {
        // Self-heal: table is "occupied" but has no active orders.
        await supabase.from("tables").update({ status: "available" }).eq("id", table.id);
        if (empresaId) loadData(empresaId);

        toast({ title: "Mesa Liberada", description: "La mesa se sincronizó automáticamente porque no tenía cuenta activa. Puedes tomar la orden de nuevo." });
        setSelectedTable(table);
        setStep("waiter");
      }
    } else {
      setSelectedTable(table);
      setStep("waiter");
    }
  };

  const handleSelectWaiter = (waiter: any) => {
    setSelectedWaiter(waiter);
    setStep("name");
  };

  const startOrder = () => {
    if (!customerName.trim() && serviceType !== "mesa") {
      toast({ title: "Atención", description: "Ingresa un nombre para la orden" });
      return;
    }
    setStep("menu");
  };

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { ...item, quantity: 1 }];
    });
    toast({ title: `${item.name} agregado`, duration: 1500 });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)).filter((c) => c.quantity > 0)
    );
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const handlePreSend = () => {
    if (serviceType === "mesa") {
      sendOrder("pendiente");
    } else {
      setStep("prepay");
    }
  };

  const sendOrder = async (status: "pendiente" | "pagada") => {
    if (cart.length === 0 || !empresaId || !activeBranch) return;
    setSending(true);
    try {
      const payload: any = {
        empresa_id: empresaId,
        branch_id: activeBranch.id,
        service_type: serviceType,
        table_id: selectedTable?.id || null,
        customer_name: customerName || (selectedTable ? selectedTable.name : "Cliente"),
        total,
        status: status,
      };

      if (status === "pagada" && selectedPaymentMethod) {
        payload.payment_method_id = selectedPaymentMethod;
      }

      if (selectedWaiter) {
        payload.waiter_id = selectedWaiter.id;
      }

      const { data: order, error } = await supabase
        .from("orders")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      let finalItems: any[] = [];

      for (const c of cart) {
        // Push the item itself (if it's a combo, we don't send it to kitchen, we just log it for the ticket)
        finalItems.push({
          order_id: order.id,
          item_type: c.type,
          item_name: c.name,
          quantity: c.quantity,
          unit_price: c.price,
          subtotal: c.price * c.quantity,
          send_to_kitchen: c.send_to_kitchen,
          kitchen_status: c.send_to_kitchen ? "pending" : null
        });

        if (c.type === 'combo') {
          // Fetch its children
          const { data: cItems } = await supabase.from("combo_items" as any).select(`
            quantity, product_id, pupusa_type_id, masa_type_id,
            menu_items(name, item_type), pupusa_types(name), masa_types(name)
          `).eq("combo_id", c.id.split('-')[0] || c.id);

          if (cItems) {
            cItems.forEach((ci: any) => {
              const isPupusa = !!ci.pupusa_type_id;
              const name = isPupusa
                ? `Pupusa ${ci.pupusa_types?.name} (${ci.masa_types?.name})`
                : ci.menu_items?.name || 'Desconocido';
              const type = isPupusa ? 'pupusa' : ci.menu_items?.item_type || 'otro';

              finalItems.push({
                order_id: order.id,
                item_type: type,
                item_name: `↳ [${c.name}] ${name}`,
                quantity: c.quantity * ci.quantity,
                unit_price: 0, // Children of combo are $0
                subtotal: 0,
                send_to_kitchen: true, // Always send combo children to kitchen
                kitchen_status: "pending"
              });
            });
          }
        }
      }

      const { error: itemsError } = await supabase.from("order_items").insert(finalItems);
      if (itemsError) throw itemsError;

      // Update table status if needed
      if (selectedTable && serviceType === "mesa") {
        await supabase.from("tables").update({ status: "occupied" }).eq("id", selectedTable.id);
        if (empresaId) loadData(empresaId); // refresh
      }

      toast({ title: status === "pagada" ? `Cobro y Envío Exitosos` : `Orden Enviada a Cocina`, description: `Total: $${total.toFixed(2)}` });
      resetPOS();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handlePayment = async () => {
    if (!activeTableOrder) return;
    setSending(true);
    try {
      const finalTip = Number(tipAmount) || 0;
      const { error: errOrder } = await supabase.from("orders").update({
        status: "pagada",
        tip_amount: finalTip,
        payment_method_id: selectedPaymentMethod || null
      }).eq("id", activeTableOrder.id);
      if (errOrder) throw errOrder;

      if (activeTableOrder.table_id) {
        const { error: errTable } = await supabase.from("tables").update({ status: "available" }).eq("id", activeTableOrder.table_id);
        if (errTable) throw errTable;
      }

      toast({ title: "Cuenta Pagada", description: "Mesa liberada con éxito", variant: "default" });
      if (empresaId) loadData(empresaId);
      resetPOS();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setCustomerName("");
    setSelectedTable(null);
    setSelectedWaiter(null);
    setServiceType(null);
    setActiveTableOrder(null);
    setActiveTableItems([]);
    setTipAmount("");
    if (paymentMethods.length > 0) setSelectedPaymentMethod(paymentMethods[0].id);
    setActiveTab("pupusa");
    setStep(branches.length > 1 ? "branch" : "service");
  };

  const goBack = () => {
    if (step === "prepay") setStep("menu");
    else if (step === "menu") setStep("name");
    else if (step === "name") setStep(serviceType === "mesa" ? "waiter" : "service");
    else if (step === "waiter") setStep("table");
    else if (step === "table") setStep("service");
    else if (step === "service") setStep("branch");
    else if (step === "checkout") {
      setActiveTableOrder(null);
      setActiveTableItems([]);
      setTipAmount("");
      setStep("table");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 pb-24 max-w-2xl mx-auto">

        {/* Header with Back button */}
        {step !== "branch" && step !== "service" && (
          <Button variant="ghost" className="mb-2 -ml-2" onClick={goBack}>
            <ChevronLeft size={20} className="mr-1" /> Volver
          </Button>
        )}

        {/* STEP 1: Branch Selection */}
        {step === "branch" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-bold mb-6 text-center">Selecciona una Sucursal</h2>
            <div className="grid gap-4">
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBranch(b)}
                  className="flex items-center p-6 border rounded-2xl bg-card shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                    <Store size={32} className="text-primary" />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="text-xl font-bold">{b.name}</h3>
                    <p className="text-muted-foreground">{b.address}</p>
                  </div>
                </button>
              ))}
              {branches.length === 0 && (
                <div className="text-center p-8 bg-card rounded-2xl border">
                  <p className="text-muted-foreground">No tienes sucursales creadas. Ve a Configuración.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Service Selection */}
        {step === "service" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold mb-6 text-center">¿Qué tipo de servicio?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => handleSelectService("mesa")} className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-card shadow-md hover:border-primary/50 hover:-translate-y-1 transition-all active:scale-95 group">
                <div className="p-4 bg-primary/10 rounded-full mb-4 group-hover:bg-primary/20 transition-colors">
                  <UtensilsCrossed size={48} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold">En Mesa</h3>
              </button>
              <button onClick={() => handleSelectService("llevar")} className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-card shadow-md hover:border-primary/50 hover:-translate-y-1 transition-all active:scale-95 group">
                <div className="p-4 bg-blue-500/10 rounded-full mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <PackageOpen size={48} className="text-blue-500" />
                </div>
                <h3 className="text-xl font-bold">Para Llevar</h3>
              </button>
              <button onClick={() => handleSelectService("domicilio")} className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-card shadow-md hover:border-primary/50 hover:-translate-y-1 transition-all active:scale-95 group">
                <div className="p-4 bg-green-500/10 rounded-full mb-4 group-hover:bg-green-500/20 transition-colors">
                  <Bike size={48} className="text-green-500" />
                </div>
                <h3 className="text-xl font-bold">Domicilio</h3>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Table Selection */}
        {step === "table" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold mb-6 text-center">Selecciona una Mesa</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tables.filter(t => t.branch_id === activeBranch?.id).map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTable(t)}
                  className={`flex flex-col items-center justify-center p-6 border rounded-2xl transition-all active:scale-95 ${t.status === 'occupied' ? 'bg-destructive/10 border-destructive/30' : 'bg-card shadow-sm hover:shadow-md hover:border-primary'}`}
                >
                  <TableIcon size={32} className={t.status === 'occupied' ? 'text-destructive mb-2' : 'text-primary mb-2'} />
                  <h3 className="text-lg font-bold">{t.name}</h3>
                  <p className="text-xs font-medium uppercase text-muted-foreground mt-1">{t.status === 'occupied' ? 'Ocupada' : 'Libre'}</p>
                </button>
              ))}
              {tables.filter(t => t.branch_id === activeBranch?.id).length === 0 && (
                <div className="col-span-full text-center p-8 bg-card rounded-2xl border">
                  <p className="text-muted-foreground">No hay mesas en esta sucursal.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3.5: Waiter Selection (Mesa only) */}
        {step === "waiter" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold mb-6 text-center">¿Quién Atiende la Mesa?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {waiters.filter(w => w.branch_id === activeBranch?.id).map(w => (
                <button
                  key={w.id}
                  onClick={() => handleSelectWaiter(w)}
                  className="flex flex-col items-center justify-center p-6 border rounded-2xl bg-card shadow-sm hover:shadow-md hover:border-primary transition-all active:scale-95 group"
                >
                  <UserCircle size={40} className="text-muted-foreground mb-3 group-hover:text-primary transition-colors" />
                  <h3 className="text-lg font-bold text-center leading-tight truncate w-full px-2">{w.name}</h3>
                </button>
              ))}
              {waiters.filter(w => w.branch_id === activeBranch?.id).length === 0 && (
                <div className="col-span-full text-center p-8 bg-card rounded-2xl border">
                  <p className="text-muted-foreground mb-4">No hay meseros activos para esta sucursal.</p>
                  <Button variant="outline" onClick={() => handleSelectWaiter(null)}>Continuar Sin Mesero</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Order Name */}
        {step === "name" && (
          <div className="animate-in zoom-in-95 duration-300 max-w-sm mx-auto mt-12">
            <div className="bg-card p-6 border rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold mb-2">Nombre de la Orden</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                {serviceType === 'mesa' ? `Mesa: ${selectedTable?.name} ${selectedWaiter ? `| Atiende: ${selectedWaiter.name.split(' ')[0]}` : ''}` : 'Ingresa el nombre del cliente o etiqueta de la orden.'}
              </p>
              <Input
                placeholder="Ej. Juan Pérez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-lg py-6 mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && startOrder()}
              />
              <Button onClick={startOrder} className="w-full text-lg py-6 h-auto">Continuar al Menú</Button>
            </div>
          </div>
        )}

        {/* STEP 5: Checkout (Cobro de Mesa) */}
        {step === "checkout" && activeTableOrder && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm mx-auto print:max-w-none print:m-0 mt-4">
            <style>
              {`
                @media print {
                  body * { visibility: hidden; }
                  .print-area, .print-area * { visibility: visible; }
                  .print-area { position: absolute; left: 0; top: 0; width: 100%; font-family: monospace; color: black; }
                  .no-print { display: none !important; }
                  @page { margin: 0; size: 80mm 297mm; }
                }
              `}
            </style>

            <div className="bg-card p-6 border rounded-2xl shadow-lg print-area print:border-none print:shadow-none print:p-2 mb-4">
              <div className="text-center mb-6 border-b border-dashed pb-4 print:border-black">
                <h2 className="text-2xl font-black">{activeBranch?.name || "Restaurante"}</h2>
                <p className="text-sm text-muted-foreground mt-1 print:text-black print:font-bold">Ticket de Venta</p>
                <div className="mt-4 flex justify-between text-sm font-bold print:text-black">
                  <span>Orden #{activeTableOrder.order_number}</span>
                  <span>Mesa: {tables.find(t => t.id === activeTableOrder.table_id)?.name}</span>
                </div>
                <div className="flex justify-between text-xs mt-1 text-muted-foreground print:text-black print:font-bold">
                  <span>Cliente: {activeTableOrder.customer_name}</span>
                  <span>{new Date(activeTableOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="space-y-3 mb-6 print:text-black">
                <div className="flex justify-between text-sm font-bold border-b pb-2 print:border-black">
                  <span>Cant. Descripción</span>
                  <span>Importe</span>
                </div>
                {activeTableItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="truncate pr-2 print:text-wrap">{item.quantity}x {item.item_name}</span>
                    <span className="shrink-0">${Number(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed pt-4 mb-2 print:border-black print:text-black">
                <div className="flex justify-between items-center text-xl font-black mb-2">
                  <span>SUBTOTAL</span>
                  <span>${Number(checkoutTotal).toFixed(2)}</span>
                </div>
                {Number(tipAmount) > 0 && (
                  <div className="flex justify-between items-center text-lg font-bold mb-2">
                    <span>PROPINA</span>
                    <span>${Number(tipAmount).toFixed(2)}</span>
                  </div>
                )}
                {selectedPaymentMethod && (
                  <div className="flex justify-between items-center text-sm mb-2 text-muted-foreground print:text-black">
                    <span>MÉTODO PAGO</span>
                    <span>{paymentMethods.find(p => p.id === selectedPaymentMethod)?.name || 'Efectivo'}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-2xl font-black border-t py-2">
                  <span>TOTAL FINAL</span>
                  <span>${(Number(checkoutTotal) + (Number(tipAmount) || 0)).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-center mt-6 text-xs text-muted-foreground print:text-black font-bold">
                <p>¡Gracias por su visita!</p>
              </div>
            </div>

            {/* Tip Entry and Payment Actions - HIDDEN ON PRINT */}
            <div className="bg-card p-4 border rounded-2xl shadow-sm mb-4 no-print border-primary/20 bg-primary/5 space-y-4">
              <div>
                <label className="text-sm font-bold mb-2 block">Método de Pago</label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="w-full text-lg py-3 rounded-md border border-primary/30 bg-background px-3"
                >
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                  {paymentMethods.length === 0 && <option value="">--- Sin métodos de pago ---</option>}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold mb-2 block">Añadir Propina ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value ? parseFloat(e.target.value) : "")}
                  placeholder="Ej. 2.50"
                  className="text-lg py-5 border-primary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 no-print">
              <Button onClick={() => window.print()} variant="outline" className="h-14 text-lg font-bold gap-2">
                <Printer size={20} /> Imprimir
              </Button>
              <Button onClick={handlePayment} disabled={sending} className="h-14 text-lg font-bold gap-2 bg-success hover:bg-success/90 text-success-foreground">
                <Banknote size={20} /> Cobrar ${(Number(checkoutTotal) + (Number(tipAmount) || 0)).toFixed(2)}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: PRE-PAYMENT (Llevar / Domicilio) */}
        {step === "prepay" && (
          <div className="animate-in zoom-in-95 duration-300 max-w-sm mx-auto mt-12">
            <div className="bg-card p-6 border rounded-2xl shadow-lg text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Banknote size={32} className="text-primary" />
              </div>

              <div>
                <h2 className="text-2xl font-black">Cobro Requerido</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  Las órdenes tipo <strong>{serviceType}</strong> deben ser cobradas antes de enviarse a cocina.
                </p>
              </div>

              <div className="bg-secondary p-4 rounded-xl border border-secondary mb-4">
                <p className="text-sm font-semibold uppercase text-muted-foreground mb-1">Monto a Cobrar</p>
                <p className="text-4xl font-black text-primary">${total.toFixed(2)}</p>
              </div>

              <div className="text-left mb-6">
                <label className="text-sm font-bold mb-2 block text-muted-foreground">Método de Pago:</label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="w-full text-lg py-3 rounded-md border bg-background px-3"
                >
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                  {paymentMethods.length === 0 && <option value="">--- Sin métodos de pago ---</option>}
                </select>
              </div>

              <Button
                onClick={() => sendOrder("pagada")}
                disabled={sending}
                className="w-full text-lg py-6 h-auto bg-success hover:bg-success/90 text-success-foreground font-bold"
              >
                Confirmar Pago y Enviar Orden
              </Button>

              <Button
                variant="ghost"
                onClick={() => setStep("menu")}
                disabled={sending}
                className="w-full"
              >
                Cancelar y volver al Menú
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Menu Ordering */}
        {step === "menu" && (
          <div className="animate-in fade-in duration-300 flex flex-col h-[calc(100vh-140px)]">

            {/* Top Info Bar */}
            <div className="flex justify-between items-center bg-card px-4 py-3 rounded-xl border mb-4 shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase text-primary tracking-wider">{serviceType}</span>
                <p className="font-bold text-sm leading-none mt-1">
                  {customerName || selectedTable?.name || "Sin Nombre"}
                  {selectedWaiter && <span className="text-muted-foreground font-normal ml-2">({selectedWaiter.name.split(' ')[0]})</span>}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
                <p className="font-bold text-lg leading-none mt-1 text-primary">${total.toFixed(2)}</p>
              </div>
            </div>

            {/* Menu Layout: Two Columns (Sidebar + Products) */}
            <div className="flex flex-1 overflow-hidden mt-2 border rounded-xl bg-card shadow-sm">

              {/* VERTICAL SIDEBAR MENU */}
              <div className="w-[120px] sm:w-[160px] border-r bg-muted/20 flex flex-col shrink-0 overflow-y-auto">
                <button
                  onClick={() => { setActiveTab("pupusa"); setActiveCategory(null); setActiveSubcategory(null); }}
                  className={`p-3 sm:p-4 text-left border-b font-bold transition-colors ${activeTab === "pupusa" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  🫓 Pupusas
                </button>
                <button
                  onClick={() => { setActiveTab("combos"); setActiveCategory(null); setActiveSubcategory(null); }}
                  className={`p-3 sm:p-4 text-left border-b font-bold transition-colors ${activeTab === "combos" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  🍱 Combos
                </button>

                {/* Alimentos (Categories) Accordion */}
                {categories.map(c => {
                  const subs = subcategories.filter(sc => sc.category_id === c.id);
                  const isCategoryActive = activeCategory === c.id;

                  return (
                    <div key={c.id} className="border-b">
                      <button
                        onClick={() => {
                          setActiveTab("alimentos");
                          setActiveCategory(isCategoryActive ? null : c.id);
                          if (subs.length > 0 && !isCategoryActive) {
                            setActiveSubcategory(subs[0].id); // Auto-select first sub on open
                          } else {
                            setActiveSubcategory(null);
                          }
                        }}
                        className={`w-full p-3 sm:p-4 text-left font-bold transition-colors flex justify-between items-center ${isCategoryActive ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}
                      >
                        <span className="truncate pr-1">📌 {c.name}</span>
                        <span className="text-xs">{isCategoryActive ? '▼' : '▶'}</span>
                      </button>

                      {/* Subcategorias (Categorias) */}
                      {isCategoryActive && subs.length > 0 && (
                        <div className="bg-background flex flex-col">
                          {subs.map(sc => (
                            <button
                              key={sc.id}
                              onClick={() => { setActiveTab("alimentos"); setActiveSubcategory(sc.id); }}
                              className={`pl-6 p-2 sm:p-3 text-sm text-left border-l-4 transition-colors ${activeSubcategory === sc.id ? "border-primary bg-primary/10 font-bold text-primary" : "border-transparent hover:bg-muted font-medium text-muted-foreground"}`}
                            >
                              {sc.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* If it's an Alimento with NO subcategories, allow selecting the Alimento itself */}
                      {isCategoryActive && subs.length === 0 && (
                        <div className="p-3 text-xs text-muted-foreground italic pl-6 bg-background">
                          (Sin categorías)
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => { setActiveTab("otros"); setActiveCategory(null); setActiveSubcategory(null); }}
                  className={`p-3 sm:p-4 text-left font-bold transition-colors ${activeTab === "otros" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  🍽️ Otros / Sin Categoría
                </button>
              </div>

              {/* Main Ordering Area (Right Column) */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-background">


                {/* PUPUSAS HIERARCHY FLOW */}
                {activeTab === "pupusa" && (
                  <>
                    {!activeRelleno ? (
                      <div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">1. Selecciona la Especialidad</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {pupusaTypes.filter(p => {
                            const isInBranch = !p.available_branches || p.available_branches.length === 0 || p.available_branches.includes(activeBranch?.id);
                            const isServiceAvail =
                              (serviceType === 'mesa' && p.available_mesa !== false) ||
                              (serviceType === 'llevar' && p.available_llevar !== false) ||
                              (serviceType === 'domicilio' && p.available_domicilio !== false);
                            return isInBranch && isServiceAvail;
                          }).map(p => (
                            <button
                              key={p.id}
                              onClick={() => setActiveRelleno({ id: p.id, name: p.name, price: Number(p.price || 0) })}
                              className="bg-card border rounded-xl p-4 text-center shadow-sm hover:border-primary transition-all active:scale-95 flex flex-col justify-between"
                            >
                              <h4 className="font-bold text-lg mb-2">{p.name}</h4>
                              <span className="text-primary font-bold bg-primary/10 px-2 py-1 rounded-full text-sm inline-block mx-auto">${Number(p.price || 0).toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            2. ¿Qué masa para la {activeRelleno.name}?
                          </h3>
                          <button onClick={() => setActiveRelleno(null)} className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded-md">Cambiar Relleno</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {masaTypes.map(m => {
                            const fullName = `Pupusa ${activeRelleno.name} (${m.name})`;
                            return (
                              <button
                                key={m.id}
                                onClick={() => {
                                  addToCart({ id: activeRelleno.id + m.id, name: fullName, price: activeRelleno.price, type: "pupusa", send_to_kitchen: true });
                                  setActiveRelleno(null); // Return to step 1 automatically
                                }}
                                className="bg-card border rounded-xl p-6 shadow-sm hover:border-primary transition-all active:scale-95 flex flex-col justify-center items-center h-24"
                              >
                                <span className="font-bold leading-tight">{m.name}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* RESTAURANT, BEVERAGES, COMBOS ITEMS */}
                {activeTab !== "pupusa" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {menuItems.filter(m => {
                      // Filter by Branch & Service Type
                      const isInBranch = !m.available_branches || m.available_branches.length === 0 || m.available_branches.includes(activeBranch?.id);
                      const isServiceAvail =
                        (serviceType === 'mesa' && m.available_mesa !== false) ||
                        (serviceType === 'llevar' && m.available_llevar !== false) ||
                        (serviceType === 'domicilio' && m.available_domicilio !== false);
                      if (!isInBranch || !isServiceAvail) return false;

                      // Filter by Tab (Vertical Mode)
                      if (activeTab === 'combos') return m.item_type === 'combo';
                      if (m.item_type === 'combo') return false; // Hide combos from other tabs

                      if (activeTab === 'alimentos') {
                        // User selected an Alimento category
                        if (activeSubcategory) {
                          // They selected a specific subcategory
                          return m.subcategory_id === activeSubcategory;
                        } else if (activeCategory) {
                          // They opened an Alimento that has NO subcategories
                          return m.category_id === activeCategory;
                        }
                        return false;
                      }

                      // Tab "otros"
                      if (activeTab === "otros") {
                        // Return items that have NO category assigned, or legacy ones
                        return !m.category_id && m.category === "otro";
                      }

                      return false;

                    }).map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          addToCart({ id: m.id, name: m.name, price: m.price, type: m.item_type || "otro", send_to_kitchen: m.send_to_kitchen_default ?? false });
                        }}
                        className={`bg-card border rounded-xl p-3 sm:p-4 shadow-sm transition-all active:scale-95 flex flex-col justify-between min-h-[5.5rem] ${m.item_type === 'combo' ? 'border-primary shadow-primary/20 hover:border-primary/80 bg-primary/5' : 'hover:border-primary'}`}
                      >
                        <span className="font-bold text-left leading-tight text-sm">{m.name}</span>
                        <span className="font-bold text-primary text-right mt-2">${Number(m.price).toFixed(2)}</span>
                      </button>
                    ))}
                    {menuItems.filter(m => {
                      const isInBranch = !m.available_branches || m.available_branches.length === 0 || m.available_branches.includes(activeBranch?.id);
                      const isServiceAvail =
                        (serviceType === 'mesa' && m.available_mesa !== false) ||
                        (serviceType === 'llevar' && m.available_llevar !== false) ||
                        (serviceType === 'domicilio' && m.available_domicilio !== false);
                      if (!isInBranch || !isServiceAvail) return false;

                      if (activeTab === 'combos') return m.item_type === 'combo';
                      if (m.item_type === 'combo') return false;

                      if (activeTab === 'alimentos') {
                        if (activeSubcategory) return m.subcategory_id === activeSubcategory;
                        if (activeCategory) return m.category_id === activeCategory;
                        return false;
                      }

                      if (activeTab === "otros") return !m.category_id && m.category === "otro";
                      return false;
                    }).length === 0 && (
                        <div className="col-span-full text-center p-8 bg-muted/20 rounded-xl border border-dashed">
                          <p className="text-muted-foreground text-sm">No hay ítems configurados aquí.</p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Floating Cart Button / Area */}
            <div className="shrink-0 bg-background pt-2 border-t -mx-4 px-4 pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-10">
              <div className="max-h-40 overflow-y-auto mb-3 space-y-2 pr-1">
                {cart.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-card border rounded-lg p-2 shadow-sm">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-bold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">${(c.price * c.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-secondary rounded-full p-1">
                      <button onClick={() => updateQty(c.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-background shadow-sm text-foreground active:scale-90"><Minus size={14} /></button>
                      <span className="font-bold text-sm w-4 text-center">{c.quantity}</span>
                      <button onClick={() => updateQty(c.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-background shadow-sm text-foreground active:scale-90"><Plus size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <Button onClick={handlePreSend} disabled={sending} className={`w-full text-lg h-14 font-bold shadow-lg gap-2 rounded-xl transition-colors
                  ${serviceType === "mesa" ? "" : "bg-success hover:bg-success/90 text-success-foreground"}`}>
                  {serviceType === "mesa" ? <Send size={20} /> : <Banknote size={20} />}
                  {sending ? "Cargando..." : (serviceType === "mesa" ? `Enviar a Cocina ($${total.toFixed(2)})` : `Cobrar y Enviar ($${total.toFixed(2)})`)}
                </Button>
              )}
            </div>

          </div>
        )}

      </div>
    </AppLayout >
  );
};

export default POS;
