import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn, Menu } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "./BrandLogo";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/explorar", label: "Explorar Productos" },
  { to: "/precios", label: "Precios" },
] as const;

const linkBase = "rounded-md px-3 py-2 text-sm font-medium transition-colors";

function announceLogin() {
  toast("Iniciar sesión estará disponible muy pronto", {
    description: "Mientras tanto, puedes explorar el dashboard sin cuenta.",
  });
}

export function TopNav() {
  const [open, setOpen] = useState(false);

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
          <Button variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex" onClick={announceLogin}>
            <LogIn />
            Iniciar Sesión
          </Button>

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
                <Button
                  variant="surface"
                  className="mt-4"
                  onClick={() => {
                    setOpen(false);
                    announceLogin();
                  }}
                >
                  <LogIn />
                  Iniciar Sesión
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
