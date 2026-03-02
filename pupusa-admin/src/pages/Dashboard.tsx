import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Key, Copy, CheckCircle, LogOut, Building2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Licencia {
    id: string;
    codigo: string;
    dias_duracion: number;
    activa: boolean;
    usada_el: string | null;
    created_at: string;
    usada_por_empresa_id: string | null;
}

interface Empresa {
    id: string;
    nombre: string;
    licencia_expira_el: string | null;
}

const Dashboard = () => {
    const [licencias, setLicencias] = useState<Licencia[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [dias, setDias] = useState(30);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const fetchDatos = async () => {
        // 1. Fetch Licencias
        const { data: dataLic } = await supabase
            .from('licencias')
            .select('*')
            .order('created_at', { ascending: false });

        if (dataLic) setLicencias(dataLic);

        // 2. Fetch Empresas
        const { data: dataEmp } = await supabase
            .from('empresas')
            .select('id, nombre, licencia_expira_el')
            .order('nombre');

        if (dataEmp) setEmpresas(dataEmp);
    };

    useEffect(() => {
        fetchDatos();
    }, []);

    const generarLicencia = async () => {
        setLoading(true);
        try {
            // Formato: PUPUSA-[4RANDOM]-[4RANDOM]
            const randomPart = () => Math.random().toString(36).substring(2, 6).toUpperCase();
            const nuevoCodigo = `PUPUSA-${randomPart()}-${randomPart()}`;

            const { error } = await supabase
                .from('licencias')
                .insert([{ codigo: nuevoCodigo, dias_duracion: dias }]);

            if (error) throw error;

            toast({ title: "Licencia Generada", description: `Código: ${nuevoCodigo}` });
            fetchDatos();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const copiarCodigo = (codigo: string) => {
        navigator.clipboard.writeText(codigo);
        toast({ title: "Copiado", description: "Código copiado al portapapeles" });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const getEmpresaNombre = (id: string | null) => {
        if (!id) return "-";
        return empresas.find(e => e.id === id)?.nombre || "Empresa Desconocida";
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                            <Key size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">CPanel Licencias</h1>
                            <p className="text-sm text-slate-500">Administración de PupuPOS</p>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={handleLogout} className="text-slate-600 hover:text-red-600">
                        <LogOut className="h-4 w-4 mr-2" /> Salir
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Card Generador */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-1 h-fit">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <Key className="mr-2 h-5 w-5 text-indigo-600" />
                            Generar Nueva Licencia
                        </h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Duración (Días)</label>
                                <Input
                                    type="number"
                                    value={dias}
                                    onChange={(e) => setDias(Number(e.target.value))}
                                    min={1}
                                />
                            </div>
                            <Button onClick={generarLicencia} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                {loading ? "Generando..." : "Crear Código"}
                            </Button>
                        </div>
                    </div>

                    {/* Card Historial de Licencias */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <CheckCircle className="mr-2 h-5 w-5 text-emerald-600" />
                            Códigos de Licencia
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Código</th>
                                        <th className="px-4 py-3">Días</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Uso / Empresa</th>
                                        <th className="px-4 py-3 rounded-tr-lg">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {licencias.map((lic) => (
                                        <tr key={lic.id} className="border-b border-slate-50">
                                            <td className="px-4 py-3 font-mono font-medium text-slate-700">
                                                {lic.codigo}
                                            </td>
                                            <td className="px-4 py-3">{lic.dias_duracion}</td>
                                            <td className="px-4 py-3">
                                                {lic.activa ? (
                                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                                                        Activa
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold">
                                                        Usada
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">
                                                {lic.activa ? "-" : (
                                                    <div>
                                                        <span className="block text-slate-800 font-medium">
                                                            {getEmpresaNombre(lic.usada_por_empresa_id)}
                                                        </span>
                                                        {lic.usada_el && format(new Date(lic.usada_el), "dd MMM yyyy, HH:mm", { locale: es })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {lic.activa && (
                                                    <Button variant="outline" size="sm" onClick={() => copiarCodigo(lic.codigo)}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {licencias.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                                No hay licencias generadas
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Card Empresas Registradas */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <Building2 className="mr-2 h-5 w-5 text-indigo-600" />
                        Empresas Activas
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {empresas.map(emp => {
                            const expDate = emp.licencia_expira_el ? new Date(emp.licencia_expira_el) : null;
                            const isExpired = !expDate || expDate < new Date();

                            return (
                                <div key={emp.id} className={`p-4 rounded-lg border ${isExpired ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                                    <h3 className="font-bold text-slate-800">{emp.nombre}</h3>
                                    <div className="mt-2 flex items-center text-sm text-slate-600">
                                        <CalendarDays className="h-4 w-4 mr-2" />
                                        {expDate ? (
                                            <span className={isExpired ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
                                                Expira: {format(expDate, "dd MMM yyyy", { locale: es })}
                                            </span>
                                        ) : (
                                            <span className="text-red-500">Sin licencia</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
