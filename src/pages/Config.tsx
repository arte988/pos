import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Store, Table as TableIcon, Utensils, Settings, Coffee, List, Tags, UserCircle, Edit2, X, CreditCard } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";

const Config = () => {
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Data states
  const [branches, setBranches] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // These are now "Alimentos"
  const [subcategories, setSubcategories] = useState<any[]>([]); // These are now "Categorias"
  const [masaTypes, setMasaTypes] = useState<any[]>([]);
  const [pupusaTypes, setPupusaTypes] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);

  // Editing states
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const [editingPupusa, setEditingPupusa] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Default availability
  const defaultAvailability = {
    available_branches: [] as string[],
    available_mesa: true,
    available_llevar: true,
    available_domicilio: true
  };

  // Form states
  const [newBranch, setNewBranch] = useState({ name: "", address: "", phone: "" });
  const [newTable, setNewTable] = useState({ name: "", branch_id: "" });
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState({ name: "", category_id: "" });
  const [newMasa, setNewMasa] = useState("");
  const [newPupusa, setNewPupusa] = useState({ name: "", price: 0, ...defaultAvailability });
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  type ComboItemState = { product_id?: string; pupusa_type_id?: string; masa_type_id?: string; id_key: string; name: string; quantity: number };
  const [newComboItems, setNewComboItems] = useState<ComboItemState[]>([]);
  const [newItem, setNewItem] = useState({ name: "", price: "", item_type: "plato", category_id: "", subcategory_id: "", send_to_kitchen: true, ...defaultAvailability });
  const [newWaiter, setNewWaiter] = useState({ name: "", branch_id: "" });
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newSetting, setNewSetting] = useState({ branch_id: "", restaurant_name: "", logo_url: "", address: "", phone: "", tip_percentage: 0 });

  const [activeSection, setActiveSection] = useState("sucursales");
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadEmpresaId();
    }
  }, [user]);

  useEffect(() => {
    if (empresaId) {
      loadAll();
    }
  }, [empresaId]);

  const loadEmpresaId = async () => {
    const { data } = await supabase.from("perfiles").select("empresa_id").eq("id", user?.id).single();
    if (data) setEmpresaId(data.empresa_id);
  };

  const loadAll = async () => {
    const [b, rs, t, c, sc, m, p, mi, w, pm] = await Promise.all([
      supabase.from("branches").select("*"),
      supabase.from("restaurant_settings").select("*"),
      supabase.from("tables").select("*"),
      supabase.from("categories" as any).select("*"), // Alimentos
      supabase.from("subcategories" as any).select("*"), // Categorías Reales
      supabase.from("masa_types").select("*"),
      supabase.from("pupusa_types").select("*"),
      supabase.from("menu_items").select("*"),
      supabase.from("waiters" as any).select("*"),
      supabase.from("payment_methods" as any).select("*"),
    ]);

    if (b.data) setBranches(b.data);
    if (rs.data) setSettings(rs.data);
    if (t.data) setTables(t.data);
    if (c.data) setCategories(c.data);
    if (sc.data) setSubcategories(sc.data);
    if (m.data) setMasaTypes(m.data);
    if (p.data) setPupusaTypes(p.data);
    if (mi.data) setMenuItems(mi.data);
    if (w.data) setWaiters(w.data);
    if (pm.data) setPaymentMethods(pm.data);
  };

  // --- Functions to add items ---
  const addBranch = async () => {
    if (!newBranch.name.trim() || !empresaId) return;
    const { error } = await supabase.from("branches").insert({ ...newBranch, empresa_id: empresaId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewBranch({ name: "", address: "", phone: "" });
    toast({ title: "Sucursal agregada" });
    loadAll();
  };

  const addSetting = async () => {
    if (!newSetting.restaurant_name.trim() || !newSetting.branch_id || !empresaId) return;
    const { error } = await supabase.from("restaurant_settings").insert({ ...newSetting, empresa_id: empresaId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewSetting({ branch_id: "", restaurant_name: "", logo_url: "", address: "", phone: "", tip_percentage: 0 });
    toast({ title: "Configuración guardada" });
    loadAll();
  };

  const addTable = async () => {
    if (!newTable.name.trim() || !newTable.branch_id || !empresaId) return;
    const { error } = await supabase.from("tables").insert({ ...newTable, empresa_id: empresaId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewTable({ name: "", branch_id: "" });
    toast({ title: "Mesa agregada" });
    loadAll();
  };

  const addCategory = async () => {
    if (!newCategory.trim() || !empresaId) return;
    if (editingCategory) {
      const { error } = await supabase.from("categories" as any).update({ name: newCategory.trim() }).eq("id", editingCategory.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setEditingCategory(null);
      toast({ title: "Alimento modificado" });
    } else {
      const { error } = await supabase.from("categories" as any).insert({ name: newCategory.trim(), empresa_id: empresaId });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Alimento agregado" });
    }
    setNewCategory("");
    loadAll();
  };

  const addSubcategory = async () => {
    if (!newSubcategory.name.trim() || !newSubcategory.category_id || !empresaId) return;
    if (editingSubcategory) {
      const { error } = await supabase.from("subcategories" as any).update({ name: newSubcategory.name.trim(), category_id: newSubcategory.category_id }).eq("id", editingSubcategory.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setEditingSubcategory(null);
      toast({ title: "Categoría modificada" });
    } else {
      const { error } = await supabase.from("subcategories" as any).insert({ name: newSubcategory.name.trim(), category_id: newSubcategory.category_id, empresa_id: empresaId });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Categoría agregada" });
    }
    setNewSubcategory({ name: "", category_id: "" });
    loadAll();
  };

  const addMasa = async () => {
    if (!newMasa.trim()) return;
    const { error } = await supabase.from("masa_types").insert({ name: newMasa.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewMasa("");
    toast({ title: "Masa agregada" });
    loadAll();
  };

  const addPupusaType = async () => {
    if (!newPupusa.name.trim() || !empresaId) return;
    const dataObj = {
      name: newPupusa.name.trim(),
      price: newPupusa.price,
      available_branches: newPupusa.available_branches,
      available_mesa: newPupusa.available_mesa,
      available_llevar: newPupusa.available_llevar,
      available_domicilio: newPupusa.available_domicilio
    };

    if (editingPupusa) {
      const { error } = await supabase.from("pupusa_types").update(dataObj).eq("id", editingPupusa.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setEditingPupusa(null);
      toast({ title: "Especialidad modificada" });
    } else {
      const { error } = await supabase.from("pupusa_types").insert({ ...dataObj, empresa_id: empresaId });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Especialidad agregada" });
    }

    setNewPupusa({ name: "", price: 0, ...defaultAvailability });
    loadAll();
  };

  const addMenuItem = async () => {
    if (!newItem.name.trim() || !newItem.price || !empresaId) return;
    const insertData: any = {
      name: newItem.name.trim(),
      price: parseFloat(newItem.price),
      item_type: newItem.item_type,
      send_to_kitchen_default: newItem.send_to_kitchen,
      category: 'otro', // fallback
      available_branches: newItem.available_branches,
      available_mesa: newItem.available_mesa,
      available_llevar: newItem.available_llevar,
      available_domicilio: newItem.available_domicilio
    };
    if (newItem.category_id) insertData.category_id = newItem.category_id;
    if (newItem.subcategory_id) insertData.subcategory_id = newItem.subcategory_id;
    if (newItem.item_type === 'combo') insertData.category = 'combos';
    let savedItemId = null;
    if (editingItem) {
      const { error } = await supabase.from("menu_items").update(insertData).eq("id", editingItem.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      savedItemId = editingItem.id;
      setEditingItem(null);
      toast({ title: "Producto modificado" });
    } else {
      insertData.empresa_id = empresaId;
      const { data, error } = await supabase.from("menu_items").insert(insertData).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      savedItemId = data.id;
      toast({ title: "Producto agregado" });
    }

    if (newItem.item_type === "combo" && empresaId && savedItemId && newComboItems.length > 0) {
      if (editingItem) {
        await supabase.from("combo_items" as any).delete().eq("combo_id", editingItem.id);
      }
      const comboPayloads = newComboItems.map(ci => ({
        combo_id: savedItemId,
        product_id: ci.product_id || null,
        pupusa_type_id: ci.pupusa_type_id || null,
        masa_type_id: ci.masa_type_id || null,
        quantity: ci.quantity,
        empresa_id: empresaId
      }));
      const { error: comboErr } = await supabase.from("combo_items" as any).insert(comboPayloads);
      if (comboErr) {
        console.error("Error saving combo items", comboErr);
        toast({ title: "Advertencia", description: "El combo se guardó pero hubo un error al guardar sus productos incluidos.", variant: "destructive" });
      }
    }

    setNewItem({ name: "", price: "", item_type: "plato", category_id: "", subcategory_id: "", send_to_kitchen: true, ...defaultAvailability });
    setNewComboItems([]);
    loadAll();
  };

  const addWaiter = async () => {
    if (!newWaiter.name.trim() || !newWaiter.branch_id || !empresaId) return;
    const { error } = await supabase.from("waiters" as any).insert({ ...newWaiter, empresa_id: empresaId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewWaiter({ name: "", branch_id: "" });
    toast({ title: "Mesero agregado" });
    loadAll();
  };

  const addPaymentMethod = async () => {
    if (!newPaymentMethod.trim() || !empresaId) return;
    const { error } = await supabase.from("payment_methods" as any).insert({ name: newPaymentMethod.trim(), empresa_id: empresaId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewPaymentMethod("");
    toast({ title: "Método de pago agregado" });
    loadAll();
  };

  // --- Deletion Functions ---
  const deleteRecord = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { loadAll(); toast({ title: "Eliminado con éxito" }); }
  };

  const sections = [
    { key: "sucursales", label: "Sucursales", icon: Store },
    { key: "general", label: "Ajustes", icon: Settings },
    { key: "meseros", label: "Personal y Pagos", icon: UserCircle },
    { key: "mesas", label: "Mesas", icon: TableIcon },
    { key: "categorias", label: "Alimentos y Categorías", icon: Tags },
    { key: "pupusas", label: "Pupusas", icon: Utensils },
    { key: "productos", label: "Productos", icon: Coffee },
  ];

  const AvailabilityControls = ({ itemState, setItemState }: any) => {
    const toggleBranch = (branchId: string) => {
      const current = itemState.available_branches || [];
      const updated = current.includes(branchId) ? current.filter((id: string) => id !== branchId) : [...current, branchId];
      setItemState({ ...itemState, available_branches: updated });
    };

    return (
      <div className="space-y-3 mt-4 pt-3 border-t">
        <div className="text-sm font-bold text-muted-foreground">Disponibilidad en Sucursales <span className="text-xs font-normal">(Si no marcas ninguna, estará en todas)</span></div>
        <div className="flex flex-wrap gap-2">
          {branches.map(b => (
            <label key={b.id} className="cursor-pointer flex items-center gap-1.5 text-sm py-1 px-2 border rounded hover:bg-secondary/50">
              <input type="checkbox" checked={(itemState.available_branches || []).includes(b.id)} onChange={() => toggleBranch(b.id)} className="rounded" />
              <span className="truncate max-w-[120px]">{b.name}</span>
            </label>
          ))}
          {branches.length === 0 && <span className="text-xs text-muted-foreground">No hay sucursales guardadas.</span>}
        </div>
        <div className="text-sm font-bold text-muted-foreground mt-3">Disponibilidad por Tipo de Servicio:</div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer flex items-center gap-1.5 text-sm py-1 px-2 border rounded hover:bg-secondary/50">
            <input type="checkbox" checked={itemState.available_mesa ?? true} onChange={(e) => setItemState({ ...itemState, available_mesa: e.target.checked })} className="rounded" /> En Mesa
          </label>
          <label className="cursor-pointer flex items-center gap-1.5 text-sm py-1 px-2 border rounded hover:bg-secondary/50">
            <input type="checkbox" checked={itemState.available_llevar ?? true} onChange={(e) => setItemState({ ...itemState, available_llevar: e.target.checked })} className="rounded" /> Para Llevar
          </label>
          <label className="cursor-pointer flex items-center gap-1.5 text-sm py-1 px-2 border rounded hover:bg-secondary/50">
            <input type="checkbox" checked={itemState.available_domicilio ?? true} onChange={(e) => setItemState({ ...itemState, available_domicilio: e.target.checked })} className="rounded" /> Domicilio
          </label>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>

        {/* Horizontal Navigation */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeSection === s.key ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
              >
                <Icon size={16} />
                {s.label}
              </button>
            )
          })}
        </div>

        {/* SUCURSALES */}
        {activeSection === "sucursales" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-xl bg-card p-4 shadow-sm border space-y-3">
              <h3 className="font-semibold text-lg">Nueva Sucursal</h3>
              <Input value={newBranch.name} onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })} placeholder="Nombre de la sucursal" />
              <Input value={newBranch.address} onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })} placeholder="Dirección" />
              <Input value={newBranch.phone} onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })} placeholder="Teléfono" />
              <Button onClick={addBranch} className="w-full gap-2"><Plus size={18} /> Agregar Sucursal</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {branches.map((b) => (
                <div key={b.id} className="relative rounded-xl bg-card p-4 shadow-sm border flex flex-col gap-1">
                  <h4 className="font-bold">{b.name}</h4>
                  <p className="text-sm text-muted-foreground">{b.address}</p>
                  <p className="text-sm text-muted-foreground">{b.phone}</p>
                  <button onClick={() => deleteRecord("branches", b.id)} className="absolute top-4 right-4 text-destructive p-2 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AJUSTES */}
        {activeSection === "general" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-xl bg-card p-4 shadow-sm border space-y-3">
              <h3 className="font-semibold text-lg">Ajustes por Sucursal</h3>
              <select
                value={newSetting.branch_id}
                onChange={(e) => setNewSetting({ ...newSetting, branch_id: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona Sucursal</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <Input value={newSetting.restaurant_name} onChange={(e) => setNewSetting({ ...newSetting, restaurant_name: e.target.value })} placeholder="Nombre Publico del Restaurante" />
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">%</span>
                <Input type="number" step="1" value={newSetting.tip_percentage || ""} onChange={(e) => setNewSetting({ ...newSetting, tip_percentage: parseFloat(e.target.value) || 0 })} placeholder="Porcentaje de Propina Sugerida (Ej. 10)" className="pl-7" />
              </div>
              <Input value={newSetting.logo_url} onChange={(e) => setNewSetting({ ...newSetting, logo_url: e.target.value })} placeholder="URL del Logo (Opcional)" />
              <Button onClick={addSetting} className="w-full gap-2"><Plus size={18} /> Guardar Ajuste</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {settings.map((s) => {
                const branchName = branches.find(b => b.id === s.branch_id)?.name || "Sucursal Desconocida";
                return (
                  <div key={s.id} className="relative rounded-xl bg-card p-4 shadow-sm border flex flex-col gap-1">
                    <span className="text-xs bg-primary/10 text-primary w-fit px-2 py-0.5 rounded-full mb-1">{branchName}</span>
                    <h4 className="font-bold">{s.restaurant_name}</h4>
                    <p className="text-sm text-muted-foreground">Propina Sugerida: {s.tip_percentage || 0}%</p>
                    <button onClick={() => deleteRecord("restaurant_settings", s.id)} className="absolute top-4 right-4 text-destructive p-2 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PERSONAL Y PAGOS */}
        {activeSection === "meseros" && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Meseros */}
            <div className="space-y-4 rounded-xl bg-card p-4 shadow-sm border">
              <h3 className="font-semibold text-lg flex items-center gap-2"><UserCircle className="text-primary" /> Meseros</h3>
              <select
                value={newWaiter.branch_id}
                onChange={(e) => setNewWaiter({ ...newWaiter, branch_id: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona Sucursal</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="flex gap-2">
                <Input value={newWaiter.name} onChange={(e) => setNewWaiter({ ...newWaiter, name: e.target.value })} placeholder="Nombre del Mesero" className="flex-1" />
                <Button onClick={addWaiter} className="shrink-0 gap-2"><Plus size={18} /> Agregar</Button>
              </div>

              <div className="grid grid-cols-1 gap-2 mt-4">
                {waiters.map((w) => {
                  const branchName = branches.find(b => b.id === w.branch_id)?.name || "Sucursal Desconocida";
                  return (
                    <div key={w.id} className="relative rounded-xl bg-background p-3 shadow-sm border flex items-center justify-between">
                      <div>
                        <h4 className="font-bold truncate" title={w.name}>{w.name}</h4>
                        <span className="text-xs text-muted-foreground">{branchName}</span>
                      </div>
                      <button onClick={() => deleteRecord("waiters", w.id)} className="text-destructive p-2 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Métodos de Pago */}
            <div className="space-y-4 rounded-xl bg-card p-4 shadow-sm border">
              <h3 className="font-semibold text-lg flex items-center gap-2"><CreditCard className="text-primary" /> Métodos de Pago</h3>
              <div className="flex gap-2">
                <Input value={newPaymentMethod} onChange={(e) => setNewPaymentMethod(e.target.value)} placeholder="Ej. Efectivo, Tarjeta, Bitcoin" className="flex-1" />
                <Button onClick={addPaymentMethod} className="shrink-0 gap-2"><Plus size={18} /> Agregar</Button>
              </div>

              <div className="grid grid-cols-1 gap-2 mt-4">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="relative rounded-xl bg-background p-3 shadow-sm border flex items-center justify-between">
                    <span className="font-bold">{pm.name}</span>
                    <button onClick={() => deleteRecord("payment_methods", pm.id)} className="text-destructive p-2 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MESAS */}
        {activeSection === "mesas" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-xl bg-card p-4 shadow-sm border space-y-3">
              <h3 className="font-semibold text-lg">Nueva Mesa</h3>
              <select
                value={newTable.branch_id}
                onChange={(e) => setNewTable({ ...newTable, branch_id: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona Sucursal</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="flex gap-2">
                <Input value={newTable.name} onChange={(e) => setNewTable({ ...newTable, name: e.target.value })} placeholder="Ej. Mesa 1" className="flex-1" />
                <Button onClick={addTable} className="shrink-0 gap-2"><Plus size={18} /> Agregar</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tables.map((t) => {
                const branchName = branches.find(b => b.id === t.branch_id)?.name || "Sucursal Desconocida";
                return (
                  <div key={t.id} className="relative rounded-xl bg-card p-4 shadow-sm border flex flex-col items-center justify-center text-center gap-2 aspect-square">
                    <TableIcon size={32} className="text-muted-foreground max-w-full" />
                    <div>
                      <h4 className="font-bold truncate">{t.name}</h4>
                      <span className="text-xs text-muted-foreground">{branchName}</span>
                    </div>
                    <button onClick={() => deleteRecord("tables", t.id)} className="absolute top-2 right-2 text-destructive p-1.5 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ALIMENTOS Y CATEGORÍAS */}
        {activeSection === "categorias" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Alimentos (Categories) */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Grupos de Alimentos (Ej. Bebidas, Desayunos)</h3>
              <div className="rounded-xl bg-card p-4 shadow-sm border space-y-3">
                <div className="flex gap-2">
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nombre del Alimento" className="flex-1" />
                  <Button onClick={addCategory} className="shrink-0 gap-2">
                    {editingCategory ? <><Edit2 size={16} /> Guardar Cambios</> : <><Plus size={18} /> Agregar Alimento</>}
                  </Button>
                  {editingCategory && (
                    <Button variant="outline" onClick={() => { setEditingCategory(null); setNewCategory(""); }} className="shrink-0"><X size={18} /></Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((c) => (
                  <div key={c.id} className="relative rounded-xl bg-card p-4 shadow-sm border flex flex-col justify-center text-center gap-2">
                    <h4 className="font-bold truncate" title={c.name}>{c.name}</h4>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button onClick={() => { setEditingCategory(c); setNewCategory(c.name); }} className="text-muted-foreground p-1.5 hover:bg-secondary rounded-full transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => deleteRecord("categories", c.id)} className="text-destructive p-1.5 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subcategories (Categorías Reales) */}
            <div className="space-y-3 pt-6">
              <h3 className="font-semibold text-lg border-b pb-2">Sub-Categorías (Ej. Bebidas Calientes, Refrescos)</h3>
              <div className="rounded-xl bg-card p-4 shadow-sm border space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newSubcategory.category_id}
                    onChange={(e) => setNewSubcategory({ ...newSubcategory, category_id: e.target.value })}
                    className="w-full sm:w-1/3 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Pertenece al Alimento...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Input value={newSubcategory.name} onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })} placeholder="Nombre de Sub-Categoría" className="flex-1" />
                  <Button onClick={addSubcategory} className="shrink-0 gap-2">
                    {editingSubcategory ? <><Edit2 size={16} /> Guardar Cambios</> : <><Plus size={18} /> Agregar Categoría</>}
                  </Button>
                  {editingSubcategory && (
                    <Button variant="outline" onClick={() => { setEditingSubcategory(null); setNewSubcategory({ name: "", category_id: "" }); }} className="shrink-0"><X size={18} /></Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {subcategories.map((sc) => {
                  const aliName = categories.find(c => c.id === sc.category_id)?.name || "Desconocido";
                  return (
                    <div key={sc.id} className="relative rounded-xl bg-card p-4 shadow-sm border flex flex-col justify-center text-center gap-2">
                      <h4 className="font-bold truncate" title={sc.name}>{sc.name}</h4>
                      <span className="text-xs text-muted-foreground">Alimento: {aliName}</span>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button onClick={() => { setEditingSubcategory(sc); setNewSubcategory({ name: sc.name, category_id: sc.category_id }); }} className="text-muted-foreground p-1.5 hover:bg-secondary rounded-full transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => deleteRecord("subcategories", sc.id)} className="text-destructive p-1.5 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* PUPUSAS */}
        {activeSection === "pupusas" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Masas */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Tipos de Masa</h3>
              <div className="flex gap-2">
                <Input value={newMasa} onChange={(e) => setNewMasa(e.target.value)} placeholder="Ej. Maíz, Arroz..." className="flex-1" />
                <Button onClick={addMasa} className="shrink-0 gap-2"><Plus size={18} /> </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {masaTypes.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-sm">
                    <span className="text-sm font-medium">{m.name}</span>
                    <button onClick={() => deleteRecord("masa_types", m.id)} className="text-destructive"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Rellenos / Especialidades */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Rellenos / Especialidades</h3>
              <div className="rounded-xl bg-card p-4 shadow-sm border space-y-3">
                <Input value={newPupusa.name} onChange={(e) => setNewPupusa({ ...newPupusa, name: e.target.value })} placeholder="Nombre de la Especialidad (Ej. Revuelta)" />
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">$</span>
                  <Input type="number" step="0.25" value={newPupusa.price || ""} onChange={(e) => setNewPupusa({ ...newPupusa, price: parseFloat(e.target.value) || 0 })} placeholder="Precio Unitario" className="pl-7" />
                </div>

                <AvailabilityControls itemState={newPupusa} setItemState={setNewPupusa} />

                <div className="flex gap-2 mt-2">
                  <Button onClick={addPupusaType} className="flex-1 gap-2">
                    {editingPupusa ? <><Edit2 size={16} /> Guardar Cambios</> : <><Plus size={18} /> Agregar Especialidad</>}
                  </Button>
                  {editingPupusa && (
                    <Button variant="outline" onClick={() => {
                      setEditingPupusa(null);
                      setNewPupusa({ name: "", price: 0, ...defaultAvailability });
                    }} className="shrink-0"><X size={18} /></Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pupusaTypes.map((p) => (
                  <div key={p.id} className="relative rounded-xl bg-card p-4 shadow-sm border flex flex-col justify-between">
                    <div className="pr-12">
                      <h4 className="font-bold truncate" title={p.name}>{p.name}</h4>
                      <span className="text-sm font-bold text-primary">${Number(p.price || 0).toFixed(2)}</span>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button onClick={() => {
                        setEditingPupusa(p);
                        setNewPupusa({
                          name: p.name,
                          price: p.price,
                          available_branches: p.available_branches || [],
                          available_mesa: p.available_mesa,
                          available_llevar: p.available_llevar,
                          available_domicilio: p.available_domicilio
                        });
                      }} className="text-muted-foreground p-1.5 hover:bg-secondary rounded-full transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => deleteRecord("pupusa_types", p.id)} className="text-destructive p-1.5 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTOS */}
        {activeSection === "productos" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-xl bg-card p-4 shadow-sm border space-y-3">
              <h3 className="font-semibold text-lg">Nuevo Producto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={newItem.item_type}
                  onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value, category_id: "", subcategory_id: "" })}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="plato">Plato a la carta</option>
                  <option value="bebida">Bebida</option>
                  <option value="combo">Combo</option>
                  <option value="otro">Otro</option>
                </select>
                <select
                  value={newItem.category_id}
                  onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value, subcategory_id: "" })}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecciona Alimento...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={newItem.subcategory_id}
                  onChange={(e) => setNewItem({ ...newItem, subcategory_id: e.target.value })}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={!newItem.category_id}
                >
                  <option value="">Selecciona Categoría...</option>
                  {subcategories.filter(sc => sc.category_id === newItem.category_id).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                </select>
              </div>

              <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Nombre del producto" />
              <Input value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder="Precio ($)" type="number" step="0.01" />

              <label className="flex items-center gap-2 text-sm font-medium mt-2 cursor-pointer p-2 border rounded-lg hover:bg-secondary/50">
                <input
                  type="checkbox"
                  checked={newItem.send_to_kitchen}
                  onChange={(e) => setNewItem({ ...newItem, send_to_kitchen: e.target.checked })}
                  className="rounded w-4 h-4"
                />
                Enviar a comanda de cocina (Tickets)
              </label>

              {/* Relational Combo Builder UI */}
              {newItem.item_type === "combo" && (
                <div className="bg-muted p-4 rounded-xl border space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <h4 className="font-bold text-sm uppercase text-muted-foreground tracking-wider mb-2">¿Qué incluye este Combo?</h4>
                  <div className="flex gap-2 items-center text-sm">
                    <select
                      className="rounded-md border bg-background px-3 py-2 flex-1"
                      id="combo-product-select"
                    >
                      <option value="">-- Seleccionar Producto o Pupusa --</option>
                      <optgroup label="Productos (Bebidas, Platos, etc)">
                        {menuItems.filter(m => m.item_type !== 'combo').map(m => (
                          <option key={`prod-${m.id}`} value={`prod|${m.id}`}>{m.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Pupusas (Especialidad + Masa)">
                        {pupusaTypes.map(p =>
                          masaTypes.map(m => (
                            <option key={`pup-${p.id}-${m.id}`} value={`pup|${p.id}|${m.id}`}>Pupusa {p.name} ({m.name})</option>
                          ))
                        )}
                      </optgroup>
                    </select>
                    <Input id="combo-qty-input" type="number" defaultValue="1" min="1" className="w-20" />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const selectEl = document.getElementById('combo-product-select') as HTMLSelectElement;
                        const qtyEl = document.getElementById('combo-qty-input') as HTMLInputElement;
                        if (!selectEl.value || (!qtyEl.value || parseInt(qtyEl.value) < 1)) return;

                        const selectedName = selectEl.options[selectEl.selectedIndex].text;
                        const qty = parseInt(qtyEl.value);

                        const val = selectEl.value;
                        const [type, id1, id2] = val.split('|');

                        const newItemState: ComboItemState = { name: selectedName, quantity: qty, id_key: val };
                        if (type === 'prod') newItemState.product_id = id1;
                        if (type === 'pup') { newItemState.pupusa_type_id = id1; newItemState.masa_type_id = id2; }

                        setNewComboItems(prev => {
                          const existing = prev.find(p => p.id_key === val);
                          if (existing) {
                            return prev.map(p => p.id_key === val ? { ...p, quantity: p.quantity + qty } : p);
                          }
                          return [...prev, newItemState];
                        });

                        // Reset inputs
                        qtyEl.value = "1";
                        selectEl.value = "";
                      }}
                    ><Plus size={16} /> Añadir</Button>
                  </div>

                  {newComboItems.length > 0 && (
                    <div className="mt-3 space-y-1 bg-background p-2 rounded-md border">
                      {newComboItems.map(ci => (
                        <div key={ci.id_key} className="flex justify-between items-center text-sm p-1 hover:bg-muted rounded px-2">
                          <span><span className="font-bold text-primary">{ci.quantity}x</span> {ci.name}</span>
                          <button type="button" onClick={() => setNewComboItems(prev => prev.filter(p => p.id_key !== ci.id_key))} className="text-destructive p-1"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <AvailabilityControls itemState={newItem} setItemState={setNewItem} />

              <div className="flex gap-2 mt-2">
                <Button onClick={addMenuItem} className="flex-1 gap-2">
                  {editingItem ? <><Edit2 size={16} /> Guardar Cambios</> : <><Plus size={18} /> Agregar Producto</>}
                </Button>
                {editingItem && (
                  <Button variant="outline" onClick={() => {
                    setEditingItem(null);
                    setNewItem({ name: "", price: "", item_type: "plato", category_id: "", subcategory_id: "", send_to_kitchen: true, ...defaultAvailability });
                  }} className="shrink-0"><X size={18} /></Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {['plato', 'bebida', 'combo', 'otro'].map((type) => {
                const items = menuItems.filter((m) => m.item_type === type);
                if (items.length === 0) return null;
                return (
                  <div key={type} className="space-y-2">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{type}s</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((m) => {
                        const aliName = categories.find(c => c.id === m.category_id)?.name || m.category;
                        const catName = subcategories.find(sc => sc.id === m.subcategory_id)?.name || "Sin Subcategoría";
                        return (
                          <div key={m.id} className="relative rounded-xl bg-card p-3 shadow-sm border flex flex-col gap-1 pr-14">
                            <div className="flex justify-between">
                              <span className="font-bold">{m.name}</span>
                              <span className="font-bold text-primary">${Number(m.price).toFixed(2)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{aliName} {`->`} {catName} | A cocina: {m.send_to_kitchen_default ? 'Sí' : 'No'}</span>
                            <div className="absolute top-2 right-2 flex gap-1">
                              <button onClick={async () => {
                                setEditingItem(m);
                                setNewItem({
                                  name: m.name,
                                  price: m.price.toString(),
                                  item_type: m.item_type || "plato",
                                  category_id: m.category_id || "",
                                  subcategory_id: m.subcategory_id || "",
                                  send_to_kitchen: m.send_to_kitchen_default ?? true,
                                  available_branches: m.available_branches || [],
                                  available_mesa: m.available_mesa,
                                  available_llevar: m.available_llevar,
                                  available_domicilio: m.available_domicilio
                                });

                                // Load combo relations if applicable
                                if (m.item_type === "combo") {
                                  const { data: cItems } = await supabase.from("combo_items" as any).select(`
                                    product_id, pupusa_type_id, masa_type_id, quantity,
                                    menu_items(name), pupusa_types(name), masa_types(name)
                                  `).eq("combo_id", m.id);

                                  if (cItems) {
                                    setNewComboItems(cItems.map((ci: any) => {
                                      if (ci.product_id) return { id_key: `prod|${ci.product_id}`, product_id: ci.product_id, quantity: ci.quantity, name: ci.menu_items?.name || "Producto" };
                                      if (ci.pupusa_type_id) return { id_key: `pup|${ci.pupusa_type_id}|${ci.masa_type_id}`, pupusa_type_id: ci.pupusa_type_id, masa_type_id: ci.masa_type_id, quantity: ci.quantity, name: `Pupusa ${ci.pupusa_types?.name} (${ci.masa_types?.name})` };
                                      return { id_key: Date.now().toString(), name: "Ítem", quantity: ci.quantity };
                                    }));
                                  }
                                } else {
                                  setNewComboItems([]);
                                }
                              }} className="text-muted-foreground p-1 hover:bg-secondary rounded-full transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => deleteRecord("menu_items", m.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



      </div>
    </AppLayout>
  );
};

export default Config;
