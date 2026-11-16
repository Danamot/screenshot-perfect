import { Globe2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COUNTRIES,
  COUNTRY_ORDER,
  PRODUCTS,
  SATURATION,
  SATURATION_ORDER,
  SOURCES,
  SOURCE_ORDER,
  type ProductFilters,
  type SourceId,
} from "@/lib/products";
import { PlatformIcon } from "./PlatformIcon";
import { SaturationDot } from "./SaturationBadge";
import { cn } from "@/lib/utils";

interface Props {
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
  onReset: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}

export function FilterSidebar({ filters, onChange, onReset }: Props) {
  const toggleSource = (s: SourceId, on: boolean) => {
    const sources = on ? [...filters.sources, s] : filters.sources.filter((x) => x !== s);
    onChange({ ...filters, sources });
  };

  return (
    <aside className="flex flex-col gap-7 border-b border-sidebar-border bg-sidebar p-5 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal className="h-4 w-4 text-primary-glow" />
        Filtros
      </div>

      <div>
        <SectionLabel>Buscar</SectionLabel>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Ej: skincare, mascotas, led…"
            aria-label="Buscar por palabra clave"
            className="h-10 bg-surface-elevated pl-9"
          />
        </div>
      </div>

      <div>
        <SectionLabel>País / Región</SectionLabel>
        <Select
          value={filters.country}
          onValueChange={(v) => onChange({ ...filters, country: v as ProductFilters["country"] })}
        >
          <SelectTrigger aria-label="País o región" className="h-10 bg-surface-elevated">
            <SelectValue>
              {filters.country === "ALL" ? (
                <span className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-electric" /> Toda Latinoamérica
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span aria-hidden>{COUNTRIES[filters.country].flag}</span> {COUNTRIES[filters.country].name}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">
              <span className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-electric" /> Toda Latinoamérica
              </span>
            </SelectItem>
            {COUNTRY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="flex items-center gap-2">
                  <span aria-hidden>{COUNTRIES[c].flag}</span> {COUNTRIES[c].name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <SectionLabel>Origen de datos</SectionLabel>
        <div className="flex flex-col gap-1.5">
          {SOURCE_ORDER.map((s) => {
            const checked = filters.sources.includes(s);
            const count = PRODUCTS.filter((p) => p.sources.includes(s)).length;
            const id = `source-${s}`;
            return (
              <label
                key={s}
                htmlFor={id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:bg-sidebar-accent has-[[data-state=checked]]:border-border has-[[data-state=checked]]:bg-surface-elevated"
              >
                <Checkbox id={id} checked={checked} onCheckedChange={(v) => toggleSource(s, v === true)} />
                <PlatformIcon source={s} />
                <span className="flex-1 text-sm font-medium">{SOURCES[s].label}</span>
                <span className="font-mono text-xs text-muted-foreground">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Nivel de saturación</SectionLabel>
        <div role="group" aria-label="Nivel de saturación" className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-surface-elevated p-1">
          {(["ALL", ...SATURATION_ORDER] as const).map((level) => {
            const active = filters.saturation === level;
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...filters, saturation: level })}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-primary/20 text-foreground ring-1 ring-primary/50",
                )}
              >
                {level !== "ALL" && <SaturationDot level={level} />}
                {level === "ALL" ? "Todas" : SATURATION[level].label}
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="surface" className="w-full" onClick={onReset}>
        <RotateCcw />
        Limpiar filtros
      </Button>

      <p className="mt-auto hidden text-[11px] leading-relaxed text-muted-foreground lg:block">
        Datos de demostración actualizados semanalmente a partir de señales de redes sociales y
        marketplaces.
      </p>
    </aside>
  );
}
