import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth } from "@/hooks/use-auth";
import { safeRedirect } from "@/lib/redirect";

const RETURN_KEY = "trendlatam:return-to";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; modo?: "registro" } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    modo: search.modo === "registro" ? "registro" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Iniciar sesión o crear cuenta — TrendLatam AI" },
      { name: "description", content: "Entra a TrendLatam AI para ver los productos ganadores de tu país." },
      { property: "og:title", content: "Iniciar sesión — TrendLatam AI" },
      { property: "og:description", content: "Crea tu cuenta gratis y descubre productos ganadores en Latinoamérica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function translateError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Todavía no confirmaste tu email. Revisa tu bandeja de entrada.";
  if (m.includes("already registered")) return "Ya existe una cuenta con ese email. Inicia sesión.";
  if (m.includes("password should be")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("weak") || m.includes("pwned")) return "Esa contraseña es muy débil o conocida. Elige otra.";
  return message;
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [tab, setTab] = useState<"login" | "registro" | "olvido">(search.modo === "registro" ? "registro" : "login");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Recordar a dónde volver, también tras el viaje a Google.
  useEffect(() => {
    if (search.redirect) sessionStorage.setItem(RETURN_KEY, safeRedirect(search.redirect));
  }, [search.redirect]);

  // Con sesión activa (por formulario o Google), entrar directo.
  useEffect(() => {
    if (!ready || !user) return;
    const target = safeRedirect(sessionStorage.getItem(RETURN_KEY) ?? search.redirect);
    sessionStorage.removeItem(RETURN_KEY);
    navigate({ to: target, replace: true });
  }, [ready, user, navigate, search.redirect]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) toast.error(translateError(error.message));
  }

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: String(form.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { nombre: String(form.get("nombre")).trim() },
      },
    });
    setBusy(false);
    if (error) return toast.error(translateError(error.message));
    if (!data.session) setSentTo(email);
  }

  async function handleForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(String(form.get("email")), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(translateError(error.message));
    setResetSent(true);
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.redirected) return;
    setBusy(false);
    if (result.error) toast.error("No pudimos conectar con Google. Inténtalo de nuevo.");
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-ambient px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandLogo />
          <p className="text-sm text-muted-foreground">Productos ganadores antes que tu competencia.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          {sentTo ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <MailCheck className="h-6 w-6" />
              </span>
              <h1 className="text-xl font-bold">Revisa tu email</h1>
              <p className="text-sm text-muted-foreground">
                Te enviamos un enlace a <span className="font-medium text-foreground">{sentTo}</span>. Ábrelo para
                confirmar tu cuenta y entrar al dashboard.
              </p>
              <Button variant="surface" className="w-full" onClick={() => { setSentTo(null); setTab("login"); }}>
                Volver a iniciar sesión
              </Button>
            </div>
          ) : tab === "olvido" ? (
            <div className="space-y-5">
              <button type="button" onClick={() => { setTab("login"); setResetSent(false); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Volver
              </button>
              <div>
                <h1 className="text-xl font-bold">Recuperar contraseña</h1>
                <p className="mt-1 text-sm text-muted-foreground">Te enviaremos un enlace para crear una nueva.</p>
              </div>
              {resetSent ? (
                <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground">
                  Si existe una cuenta con ese email, te llegará el enlace en unos minutos.
                </p>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input id="forgot-email" name="email" type="email" required autoComplete="email" className="h-11 bg-surface-elevated" />
                  </div>
                  <Button type="submit" variant="glow" className="h-11 w-full" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Enviar enlace
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "registro")}>
              <TabsList className="grid h-11 w-full grid-cols-2 bg-surface-elevated">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="registro">Crear cuenta</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <GoogleButton onClick={handleGoogle} disabled={busy} />
                <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> o con tu email <span className="h-px flex-1 bg-border" />
                </div>
              </div>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" name="email" type="email" required autoComplete="email" className="h-11 bg-surface-elevated" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <button type="button" onClick={() => setTab("olvido")} className="text-xs text-primary-glow hover:underline">
                        ¿La olvidaste?
                      </button>
                    </div>
                    <Input id="login-password" name="password" type="password" required autoComplete="current-password" className="h-11 bg-surface-elevated" />
                  </div>
                  <Button type="submit" variant="glow" className="h-11 w-full" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="registro" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre</Label>
                    <Input id="signup-name" name="nombre" required autoComplete="name" maxLength={80} className="h-11 bg-surface-elevated" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" required autoComplete="email" className="h-11 bg-surface-elevated" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input id="signup-password" name="password" type="password" required minLength={6} autoComplete="new-password" className="h-11 bg-surface-elevated" />
                  </div>
                  <Button type="submit" variant="glow" className="h-11 w-full" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Crear cuenta gratis
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Empiezas en el Plan Gratuito. <Link to="/precios" className="text-primary-glow hover:underline">Ver planes</Link>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </main>
  );
}
