import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña — TrendLatam AI" },
      { name: "description", content: "Crea una nueva contraseña para tu cuenta de TrendLatam AI." },
      { property: "og:title", content: "Nueva contraseña — TrendLatam AI" },
      { property: "og:description", content: "Recupera el acceso a tu cuenta de TrendLatam AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session || isRecovery ? "ready" : "invalid");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    navigate({ to: "/explorar", replace: true });
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-ambient px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-primary-glow">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-bold">Crea una nueva contraseña</h1>
        {status === "invalid" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">El enlace no es válido o ya venció. Pide uno nuevo.</p>
            <Button variant="surface" className="w-full" asChild>
              <Link to="/auth">Volver a iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input id="new-password" name="password" type="password" required minLength={6} autoComplete="new-password" className="h-11 bg-surface-elevated" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Repite la contraseña</Label>
              <Input id="confirm-password" name="confirm" type="password" required minLength={6} autoComplete="new-password" className="h-11 bg-surface-elevated" />
            </div>
            <Button type="submit" variant="glow" className="h-11 w-full" disabled={busy || status === "checking"}>
              {busy && <Loader2 className="animate-spin" />} Guardar contraseña
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
