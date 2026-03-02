import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";

interface LicenseBlockerProps {
    onLicenseActivated: () => void;
}

const LicenseBlocker = ({ onLicenseActivated }: LicenseBlockerProps) => {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Tu número de WhatsApp incluyendo el código de país (ej: 503 para El Salvador)
    const whatsappNumber = "50370000000"; // PLEASE UPDATE THIS
    const whatsappMsg = "Hola, necesito renovar mi membresía de PupuPOS de $25.";

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('activar_licencia', {
                p_codigo: code
            });

            const result = data as any;

            if (error || !result?.success) {
                throw new Error(result?.error || "Código inválido o expirado");
            }

            toast({ title: "¡Éxito!", description: "Membresía activada correctamente." });
            onLicenseActivated();

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsApp = () => {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl" />

            <div className="w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden relative z-10 animate-slide-up">
                {/* Header */}
                <div className="bg-primary/10 p-8 text-center border-b border-primary/20">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-4xl shadow-inner">
                        🔒
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Membresía Requerida</h1>
                    <p className="mt-2 text-muted-foreground">Tu licencia de PupuPOS ha expirado o no está activa.</p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <div className="bg-muted p-4 rounded-xl border border-border text-center space-y-2">
                        <p className="font-semibold">Costo Mensual: <span className="text-primary text-xl">$25.00</span></p>
                        <p className="text-sm text-muted-foreground">Adquiere tu código de licencia contactando a soporte para seguir usando el sistema.</p>
                        <Button onClick={handleWhatsApp} className="w-full mt-2 bg-[#25D366] hover:bg-[#128C7E] text-white">
                            <MessageCircle className="mr-2 h-5 w-5" />
                            Solicitar Código por WhatsApp
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">¿Ya tienes un código?</span>
                        </div>
                    </div>

                    <form onSubmit={handleActivate} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="text"
                                placeholder="PUPUSA-XXXX-XXXX"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                className="text-center font-mono text-lg uppercase tracking-wider"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading || !code}>
                            {loading ? "Verificando..." : "Activar Licencia"}
                        </Button>
                    </form>

                    <div className="pt-4 text-center">
                        <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground">
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LicenseBlocker;
