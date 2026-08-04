"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRole, Role } from "@/providers/role-provider";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setRole } = useRole();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Get redirect parameter from URL
    const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/admin/applications';

    try {
      // Usar la instancia de axios configurada (desenvuelve la respuesta automáticamente)
      const response = await api.post("/auth/login", { email, password });
      
      const { accessToken, user } = response.data; // Axios interceptor modifies .data
      
      // Guardar token y rol
      localStorage.setItem("auth_token", accessToken);
      document.cookie = `app_role=${user.role}; path=/; max-age=86400; SameSite=lax`;
      setRole(user.role as Role);

      toast({
        title: "Sesión iniciada",
        description: `Bienvenido, ${user.name}`,
      });

      if (user.role === "ADMIN") {
        router.push(redirectUrl);
      } else {
        router.push("/");
      }
    } catch (error: any) {
      toast({
        title: "Error de autenticación",
        description: error.response?.data?.message || "Credenciales inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-[#0066cc]/10 flex items-center justify-center rounded-full">
            <Shield className="h-6 w-6 text-[#0066cc]" />
          </div>
          <CardTitle className="text-2xl font-bold font-heading text-slate-800">
            Iniciar Sesión
          </CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@bcs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-[#0066cc] hover:bg-[#0052a3] text-white"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
