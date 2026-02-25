import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Config = () => {
  const [masaTypes, setMasaTypes] = useState<any[]>([]);
  const [pupusaTypes, setPupusaTypes] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [newMasa, setNewMasa] = useState("");
  const [newPupusa, setNewPupusa] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "bebida" });
  const [activeSection, setActiveSection] = useState("masa");
  const { toast } = useToast();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [m, p, mi] = await Promise.all([
      supabase.from("masa_types").select("*"),
      supabase.from("pupusa_types").select("*"),
      supabase.from("menu_items").select("*"),
    ]);
    if (m.data) setMasaTypes(m.data);
    if (p.data) setPupusaTypes(p.data);
    if (mi.data) setMenuItems(mi.data);
  };

  const addMasa = async () => {
    if (!newMasa.trim()) return;
    const { error } = await supabase.from("masa_types").insert({ name: newMasa.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewMasa("");
    loadAll();
  };

  const addPupusaType = async () => {
    if (!newPupusa.trim()) return;
    const { error } = await supabase.from("pupusa_types").insert({ name: newPupusa.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewPupusa("");
    loadAll();
  };

  const addMenuItem = async () => {
    if (!newItem.name.trim() || !newItem.price) return;
    const { error } = await supabase.from("menu_items").insert({
      name: newItem.name.trim(),
      price: parseFloat(newItem.price),
      category: newItem.category,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewItem({ name: "", price: "", category: newItem.category });
    loadAll();
  };

  const deleteMasa = async (id: string) => {
    await supabase.from("masa_types").delete().eq("id", id);
    loadAll();
  };

  const deletePupusaType = async (id: string) => {
    await supabase.from("pupusa_types").delete().eq("id", id);
    loadAll();
  };

  const deleteMenuItem = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    loadAll();
  };

  const sections = [
    { key: "masa", label: "Masas" },
    { key: "relleno", label: "Rellenos" },
    { key: "menu", label: "Menú" },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Configuración</h2>

        <div className="flex gap-2">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`touch-target rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === s.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {activeSection === "masa" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={newMasa} onChange={(e) => setNewMasa(e.target.value)} placeholder="Nuevo tipo de masa" className="touch-target" />
              <Button onClick={addMasa} size="icon" className="touch-target shrink-0"><Plus size={18} /></Button>
            </div>
            {masaTypes.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-card p-3">
                <span className="text-sm text-card-foreground">{m.name}</span>
                <button onClick={() => deleteMasa(m.id)} className="text-destructive"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}

        {activeSection === "relleno" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={newPupusa} onChange={(e) => setNewPupusa(e.target.value)} placeholder="Nuevo tipo de relleno" className="touch-target" />
              <Button onClick={addPupusaType} size="icon" className="touch-target shrink-0"><Plus size={18} /></Button>
            </div>
            {pupusaTypes.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-card p-3">
                <span className="text-sm text-card-foreground">{p.name}</span>
                <button onClick={() => deletePupusaType(p.id)} className="text-destructive"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}

        {activeSection === "menu" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="touch-target rounded-lg border bg-card px-2 text-sm"
              >
                <option value="bebida">Bebida</option>
                <option value="postre">Postre</option>
                <option value="otro">Otro</option>
              </select>
              <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Nombre" className="touch-target" />
              <Input value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder="$" type="number" step="0.01" className="touch-target w-20" />
              <Button onClick={addMenuItem} size="icon" className="touch-target shrink-0"><Plus size={18} /></Button>
            </div>
            {["bebida", "postre", "otro"].map((cat) => {
              const items = menuItems.filter((m) => m.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{cat}s</h4>
                  {items.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg bg-card p-3 mb-1">
                      <div>
                        <span className="text-sm text-card-foreground">{m.name}</span>
                        <span className="ml-2 text-sm font-semibold text-primary">${Number(m.price).toFixed(2)}</span>
                      </div>
                      <button onClick={() => deleteMenuItem(m.id)} className="text-destructive"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Config;
