import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [empresaName, setEmpresaName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data?.user) {
          const { error: rpcError } = await supabase.rpc('handle_new_user_signup', {
            p_user_id: data.user.id,
            p_nombre_empresa: empresaName
          });

          if (rpcError) {
            console.error("Error creating tenant:", rpcError);
            throw new Error("Error al crear la empresa. Contacta a soporte.");
          }
        }

        toast({ title: "Cuenta creada", description: "Iniciando sesión..." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl">
            🍽️
          </div>
          <h1 className="text-3xl font-bold text-foreground">easypos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sistema para restaurantes</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <Input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="touch-target"
          />
          {!isLogin && (
            <Input
              type="text"
              placeholder="Nombre de la Pupusería"
              value={empresaName}
              onChange={(e) => setEmpresaName(e.target.value)}
              required
              className="touch-target"
            />
          )}
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="touch-target"
          />
          <Button type="submit" className="w-full touch-target" disabled={loading}>
            {loading ? "Cargando..." : isLogin ? "Iniciar Sesión" : "Registrarse"}
          </Button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-4 w-full text-center text-sm text-muted-foreground"
        >
          {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
