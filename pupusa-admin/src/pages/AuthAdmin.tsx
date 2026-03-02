import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const AuthAdmin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // In Admin flow, we only login. SuperAdmins must be created via Supabase Dashboard.
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

        } catch (error: any) {
            toast({ title: "Error", description: "Credenciales inválidas o sin acceso.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center text-white">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl shadow-lg shadow-indigo-500/50">
                        🛡️
                    </div>
                    <h1 className="text-3xl font-bold">Admin Portal</h1>
                    <p className="mt-1 text-sm text-slate-400">easypos Cloud Management</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl">
                    <Input
                        type="email"
                        placeholder="Correo Administrador"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                    />
                    <Input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                    />
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                        {loading ? "Verificando..." : "Ingresar"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default AuthAdmin;
