import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Loader2, Plus, Save, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SaturationDot } from "@/components/dashboard/SaturationBadge";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";
import { generateAnalysis } from "@/lib/admin.functions";
import {
  createProduct,
  emptyForm,
  rowToForm,
  updateProduct,
  validateForm,
  type AdminProductRow,
  type FormErrors,
  type ProductForm,
} from "@/lib/admin";
import {
  COUNTRIES,
  COUNTRY_ORDER,
  SATURATION,
  SATURATION_ORDER,
  SOURCES,
  SOURCE_ORDER,
  type CountryCode,
  type SaturationLevel,
} from "@/lib/products";
import { cn } from "@/lib/utils";
import { isBucketImage } from "@/lib/photo-paths";
import { signedPhotoUrl, uploadProductPhoto } from "@/lib/product-images";

function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls = "bg-surface-elevated";

export function ProductFormPanel({ editing, onDone }: { editing: AdminProductRow | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductForm>(() => (editing ? rowToForm(editing) : emptyForm()));
  const [errors, setErrors] = useState<FormErrors>({});
  const [imageFailed, setImageFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const runAnalysis = useServerFn(generateAnalysis);

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Una foto del bucket es privada: la vista previa necesita un enlace temporal.
  useEffect(() => {
    const raw = form.imagen_url.trim();
    if (!isBucketImage(raw)) {
      setPreviewSrc(raw || null);
      return;
    }
    let alive = true;
    void signedPhotoUrl(raw).then((url) => {
      if (alive) setPreviewSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [form.imagen_url]);

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadProductPhoto(file);
      set("imagen_url", path);
      setImageFailed(false);
      toast.success("Foto subida. Guarda el producto para que aparezca en el dashboard.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const result = validateForm(form);
      if (!result.ok) {
        setErrors(result.errors);
        throw new Error("Revisa los campos marcados.");
      }
      if (editing) await updateProduct(editing.id, result.values);
      else await createProduct(result.values);
    },
    onSuccess: async () => {
      toast.success(editing ? "Producto actualizado" : "Producto agregado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-products"] }),
      ]);
      if (!editing) {
        setForm(emptyForm(form.pais));
        setImageFailed(false);
      }
      onDone();
    },
    onError: (err: Error) => toast.error(err.message || "No se pudo guardar el producto."),
  });

  const ai = useMutation({
    mutationFn: async () => {
      if (!form.nombre.trim()) {
        setErrors((e) => ({ ...e, nombre: "Escribe el nombre para generar el análisis." }));
        throw new Error("Escribe primero el nombre del producto.");
      }
      const res = await runAnalysis({
        data: { nombre: form.nombre, pais: COUNTRIES[form.pais].name, categoria: form.categoria || null },
      });
      if (!res.ok) throw new Error(res.error);
      return res.analysis;
    },
    onSuccess: (analysis) => {
      setForm((f) => ({
        ...f,
        resumen: analysis.resumen,
        puntos: analysis.puntos.join("\n"),
        palabras_clave: analysis.palabras_clave.length ? analysis.palabras_clave.join(", ") : f.palabras_clave,
      }));
      setErrors((e) => ({ ...e, resumen: undefined }));
      toast.success("Análisis generado. Revísalo antes de guardar.");
    },
    onError: (err: Error) => toast.error(err.message || "No pudimos generar el análisis."),
  });

  const changeCountry = (pais: CountryCode) => {
    setForm((f) => ({
      ...f,
      pais,
      // la moneda sigue al país, salvo que el admin la haya cambiado a mano
      moneda: f.moneda === COUNTRIES[f.pais].currency || !f.moneda ? COUNTRIES[pais].currency : f.moneda,
    }));
  };

  const toggleSource = (s: (typeof SOURCE_ORDER)[number], on: boolean) =>
    set("fuentes", on ? [...form.fuentes, s] : form.fuentes.filter((x) => x !== s));

  return (
    <form
      noValidate
      aria-label={editing ? "Editar producto" : "Agregar producto"}
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">
            {editing ? "Editar producto" : "Agregar producto ganador"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {editing ? `Estás editando “${editing.nombre}”.` : "Aparecerá en el dashboard apenas lo guardes."}
          </p>
        </div>
        {editing && (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            <X /> Cancelar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="nombre" label="Nombre" error={errors.nombre} className="sm:col-span-2">
          <Input
            id="nombre"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="Ej. Mini proyector portátil 4K"
            maxLength={160}
            className={inputCls}
          />
        </Field>

        <Field id="pais" label="País" error={errors.pais}>
          <Select value={form.pais} onValueChange={(v) => changeCountry(v as CountryCode)}>
            <SelectTrigger id="pais" className={inputCls}>
              <SelectValue>
                {COUNTRIES[form.pais].flag} {COUNTRIES[form.pais].name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_ORDER.map((c) => (
                <SelectItem key={c} value={c}>
                  {COUNTRIES[c].flag} {COUNTRIES[c].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="categoria" label="Categoría" error={errors.categoria}>
          <Input
            id="categoria"
            value={form.categoria}
            onChange={(e) => set("categoria", e.target.value)}
            placeholder="Ej. Hogar"
            className={inputCls}
          />
        </Field>

        <Field id="precio" label="Precio estimado" error={errors.precio_estimado}>
          <Input
            id="precio"
            inputMode="decimal"
            value={form.precio_estimado}
            onChange={(e) => set("precio_estimado", e.target.value)}
            placeholder="Ej. 1490"
            className={cn(inputCls, "font-mono")}
          />
        </Field>

        <Field id="moneda" label="Moneda" error={errors.moneda}>
          <Input
            id="moneda"
            value={form.moneda}
            onChange={(e) => set("moneda", e.target.value.toUpperCase())}
            maxLength={3}
            className={cn(inputCls, "font-mono uppercase")}
          />
        </Field>

        <Field id="margen" label="Margen (%)" error={errors.margen}>
          <Input
            id="margen"
            inputMode="numeric"
            value={form.margen}
            onChange={(e) => set("margen", e.target.value)}
            placeholder="0 a 100"
            className={cn(inputCls, "font-mono")}
          />
        </Field>

        <Field id="saturacion" label="Saturación">
          <Select value={form.saturacion} onValueChange={(v) => set("saturacion", v as SaturationLevel)}>
            <SelectTrigger id="saturacion" className={inputCls}>
              <SelectValue>
                <span className="flex items-center gap-2">
                  <SaturationDot level={form.saturacion} /> {SATURATION[form.saturacion].label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SATURATION_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <SaturationDot level={s} /> {SATURATION[s].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="viralidad" label="Viralidad (0–100)" error={errors.viralidad}>
          <Input
            id="viralidad"
            inputMode="numeric"
            value={form.viralidad}
            onChange={(e) => set("viralidad", e.target.value)}
            placeholder="Ej. 88"
            className={cn(inputCls, "font-mono")}
          />
        </Field>

        <Field id="crecimiento" label="Crecimiento 7d (%)" error={errors.crecimiento_7d}>
          <Input
            id="crecimiento"
            inputMode="numeric"
            value={form.crecimiento_7d}
            onChange={(e) => set("crecimiento_7d", e.target.value)}
            placeholder="Ej. 24"
            className={cn(inputCls, "font-mono")}
          />
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-muted-foreground">Fuentes donde es fuerte</legend>
        <div className="grid grid-cols-2 gap-2">
          {SOURCE_ORDER.map((s) => (
            <label
              key={s}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                form.fuentes.includes(s) ? "border-primary/50 bg-primary/10" : "border-border bg-surface-elevated",
              )}
            >
              <Checkbox checked={form.fuentes.includes(s)} onCheckedChange={(v) => toggleSource(s, v === true)} />
              <PlatformIcon source={s} />
              <span className="truncate">{SOURCES[s].label}</span>
            </label>
          ))}
        </div>
        {errors.fuentes && <p className="text-xs text-destructive">{errors.fuentes}</p>}
      </fieldset>

      <Field
        id="imagen"
        label="Imagen"
        error={errors.imagen_url}
        hint="Sube una foto desde tu computadora o pega una dirección https://"
      >
        <div className="flex gap-3">
          <Input
            id="imagen"
            value={form.imagen_url}
            onChange={(e) => {
              set("imagen_url", e.target.value);
              setImageFailed(false);
            }}
            placeholder="https://…"
            className={inputCls}
          />
          <label className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <input
              type="file"
              accept="image/*"
              aria-label="Subir foto del producto"
              className="sr-only"
              onChange={(e) => {
                void uploadPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Subiendo…" : "Subir"}
          </label>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-elevated">
            {previewSrc && !imageFailed ? (
              <img
                src={previewSrc}
                alt="Vista previa"
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <ImageOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </Field>

      <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="resumen" className="text-sm font-semibold">
            Análisis de IA
          </Label>
          <Button
            type="button"
            variant="glow"
            size="sm"
            onClick={() => ai.mutate()}
            disabled={ai.isPending}
          >
            {ai.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {ai.isPending ? "Generando…" : "Generar Análisis de IA automáticamente"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Usa el nombre, el país y la categoría para redactar por qué el producto gana en ese mercado.
        </p>
        <Textarea
          id="resumen"
          value={form.resumen}
          onChange={(e) => set("resumen", e.target.value)}
          placeholder="Por qué este producto es ganador en este país…"
          rows={4}
          className={inputCls}
        />
        <Field id="puntos" label="Razones (una por línea)">
          <Textarea
            id="puntos"
            value={form.puntos}
            onChange={(e) => set("puntos", e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Field>
        <Field id="palabras" label="Palabras clave (separadas por coma)">
          <Input
            id="palabras"
            value={form.palabras_clave}
            onChange={(e) => set("palabras_clave", e.target.value)}
            placeholder="proyector portatil, cine en casa"
            className={inputCls}
          />
        </Field>
      </div>

      <Button type="submit" variant="glow" className="w-full" disabled={save.isPending}>
        {save.isPending ? <Loader2 className="animate-spin" /> : editing ? <Save /> : <Plus />}
        {editing ? "Guardar cambios" : "Agregar producto"}
      </Button>
    </form>
  );
}
