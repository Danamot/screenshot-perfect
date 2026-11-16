import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, LogIn, LogOut, Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { accountQueryOptions } from "@/lib/account";
import { BrandLogo } from "./BrandLogo";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/explorar", label: "Explorar Productos" },
  { to: "/precios", label: "Precios" },
] as const;

const linkBase = "rounded-md px-3 py-2 text-sm font-medium transition-colors";

function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

function PlanBadge({ plan, isAdmin }: { plan: "free" | "pro"; isAdmin: boolean }) {
  if (isAdmin)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
        <ShieldCheck className="h-3 w-3" /> Admin
      </span>
    );
  if (plan === "pro")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
        <Crown className="h-3 w-3" /> Pro
      </span>
    );
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Gratis
    </span>
  );
}

function AccountMenu({ userId, email }: { userId: string; email: string }) {
  const { data: account } = useQuery(accountQueryOptions(userId));
  const signOut = useSignOut();
  const name = account?.nombre || email.split("@")[0] || "Mi cuenta";
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="surface" size="sm" className="gap-2 pl-1.5" aria-label="Mi cuenta">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
            {initial}
          </span>
          <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-1.5">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
          {account && <PlanBadge plan={account.plan} isAdmin={account.isAdmin} />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {account && !account.isAdmin && account.plan === "free" && (
          <DropdownMenuItem asChild>
            <Link to="/precios">
              <Crown /> Mejorar a Pro
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        <Link to="/" aria-label="TrendLatam AI, inicio">
          <BrandLogo />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              className={linkBase}
              activeProps={{ className: "bg-accent text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <AccountMenu userId={user.id} email={user.email ?? ""} />
          ) : (
            <Button variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex" asChild>
              <Link to="/auth">
                <LogIn />
                Iniciar Sesión
              </Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="surface" size="icon" className="md:hidden" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-border bg-sidebar">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <BrandLogo />
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Menú móvil" className="mt-6 flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: true }}
                    onClick={() => setOpen(false)}
                    className={linkBase}
                    activeProps={{ className: "bg-accent text-foreground" }}
                    inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                  >
                    {item.label}
                  </Link>
                ))}
                {user ? (
                  <Button
                    variant="surface"
                    className="mt-4"
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                  >
                    <LogOut />
                    Cerrar sesión
                  </Button>
                ) : (
                  <Button variant="surface" className="mt-4" asChild>
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      <LogIn />
                      Iniciar Sesión
                    </Link>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
