import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Grid, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { ArrowDown, ArrowUp, Copy, ImagePlus, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import type { Category, DiscountType, Product, ProductMedia, ProductOption, ProductOptionValue } from "@artenova/shared";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminEmptyState, AdminPageHeader, AdminSection } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";

type ProductImageInput = Omit<ProductMedia, "id">;
type PriceTierInput = {
  minQuantity: string;
  unitPrice: string;
  totalPrice?: string;
  label?: string | null;
};

type DraftProduct = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  basePrice: string;
  discountType: DiscountType | "";
  discountValue: string;
  isPublished: boolean;
  isFeatured: boolean;
};

type ProductOptionValueInput = ProductOptionValue;
type ProductOptionInput = Omit<ProductOption, "productId"> & {
  values: ProductOptionValueInput[];
};

type VariantInput = {
  id: string;
  name: string;
  sku: string;
  visualGroupKey: string;
  basePrice: string;
  discountType: DiscountType | "";
  discountValue: string;
  isActive: boolean;
  position: number;
  optionValueIds: string[];
  images: ProductImageInput[];
  priceTiers: PriceTierInput[];
};

const emptyProduct: DraftProduct = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  categoryId: "",
  basePrice: "",
  discountType: "",
  discountValue: "",
  isPublished: true,
  isFeatured: false,
};

function createId() {
  return crypto.randomUUID();
}

function createOption(position: number): ProductOptionInput {
  return { id: createId(), name: "", position, values: [] };
}

function createOptionValue(optionId: string, position: number): ProductOptionValueInput {
  return { id: createId(), optionId, value: "", position, swatch: null };
}

function createVariant(position: number, optionValueIds: string[]): VariantInput {
  return {
    id: createId(),
    name: "",
    sku: "",
    visualGroupKey: "",
    basePrice: "",
    discountType: "",
    discountValue: "",
    isActive: true,
    position,
    optionValueIds,
    images: [],
    priceTiers: [],
  };
}

function normalizeImages(items: ProductImageInput[]) {
  return items.map((image, position) => ({ ...image, position }));
}

function isMediaFile(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

async function createPosterFromVideo(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("No se pudo preparar la portada del video"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la portada del video");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("No se pudo generar la portada del video"));
      }, "image/webp", 0.88);
    });

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-poster.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function normalizePriceTiers(items: PriceTierInput[]) {
  return items.map((tier) => ({
    minQuantity: Number(tier.minQuantity) || 1,
    unitPrice: Number(tier.unitPrice) || 0,
    totalPrice: !tier.totalPrice ? null : Number(tier.totalPrice),
    label: tier.label?.trim() || null,
  }));
}

function normalizeSelectionKey(optionValueIds: string[]) {
  return [...optionValueIds].sort().join("|");
}

function cartesianProduct<T>(input: T[][]): T[][] {
  if (input.length === 0) return [];
  return input.reduce<T[][]>(
    (acc, values) => acc.flatMap((prefix) => values.map((value) => [...prefix, value])),
    [[]],
  );
}

export function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DraftProduct>(emptyProduct);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<ProductImageInput[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTierInput[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOptionInput[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [defaultVariantId, setDefaultVariantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");
  const isEdit = Boolean(id);
  const hasVariantOptions = productOptions.length > 0;

  const optionValueById = useMemo(() => {
    const map = new Map<string, { optionId: string; optionName: string; value: string; position: number }>();
    productOptions.forEach((option) => {
      option.values.forEach((value) => {
        map.set(value.id, { optionId: option.id, optionName: option.name, value: value.value, position: option.position });
      });
    });
    return map;
  }, [productOptions]);

  const variantLabel = (optionValueIds: string[]) =>
    optionValueIds
      .map((valueId) => optionValueById.get(valueId)?.value)
      .filter(Boolean)
      .join(" / ");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([api.adminCategories(), id ? api.adminProduct(id) : Promise.resolve(null)])
      .then(([nextCategories, selected]) => {
        if (!active) return;
        setCategories(nextCategories);
        if (selected) {
          const hasOptions = selected.productOptions.length > 0;
          const primaryVariant = selected.defaultVariant ?? selected.variants.find((variant) => variant.isActive) ?? selected.variants[0] ?? null;
          setDraft({
            name: selected.name,
            slug: selected.slug,
            sku: primaryVariant?.sku ?? selected.sku ?? "",
            description: selected.description,
            categoryId: selected.categoryId,
            basePrice: String(primaryVariant?.basePrice ?? selected.basePrice ?? 0),
            discountType: primaryVariant?.discountType ?? "",
            discountValue: primaryVariant?.discountValue == null ? "" : String(primaryVariant.discountValue),
            isPublished: selected.isPublished,
            isFeatured: selected.isFeatured,
          });
          setImages((!hasOptions ? primaryVariant?.media ?? [] : selected.media).map(({ url, type, alt, position, posterUrl }) => ({ url, type, alt, position, posterUrl: posterUrl ?? null })));
          setPriceTiers((!hasOptions ? primaryVariant?.priceTiers ?? [] : []).map(({ minQuantity, unitPrice, totalPrice, label }) => ({
            minQuantity: String(minQuantity),
            unitPrice: String(unitPrice),
            totalPrice: totalPrice == null ? "" : String(totalPrice),
            label,
          })));
          setProductOptions(
            selected.productOptions.map((option, position) => ({
              id: option.id,
              name: option.name,
              position,
              values: option.values.map((value, valuePosition) => ({
                id: value.id,
                optionId: option.id,
                value: value.value,
                position: valuePosition,
                swatch: value.swatch ?? null,
              })),
            })),
          );
          setVariants(
            selected.variants.map((variant, position) => ({
              id: variant.id,
              name: variant.name,
              sku: variant.sku ?? "",
              visualGroupKey: variant.visualGroupKey ?? "",
              basePrice: String(variant.basePrice),
              discountType: variant.discountType ?? "",
              discountValue: variant.discountValue == null ? "" : String(variant.discountValue),
              isActive: variant.isActive,
              position,
              optionValueIds: variant.selections.map((selection) => selection.optionValueId),
              images: variant.media.map(({ url, type, alt, position: imagePosition, posterUrl }) => ({ url, type, alt, position: imagePosition, posterUrl: posterUrl ?? null })),
              priceTiers: variant.priceTiers.map(({ minQuantity, unitPrice, totalPrice, label }) => ({
                minQuantity: String(minQuantity),
                unitPrice: String(unitPrice),
                totalPrice: totalPrice == null ? "" : String(totalPrice),
                label,
              })),
            })),
          );
          setDefaultVariantId(selected.defaultVariant?.id ?? selected.defaultVariantId ?? primaryVariant?.id ?? "");
        } else {
          setDraft((current) => ({ ...current, categoryId: current.categoryId || nextCategories[0]?.id || "" }));
          setDefaultVariantId("");
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el producto");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!hasVariantOptions) {
      if (defaultVariantId) setDefaultVariantId("");
      return;
    }
    const validDefault = variants.find((variant) => variant.id === defaultVariantId && variant.isActive);
    if (validDefault) return;
    const nextDefault = variants.find((variant) => variant.isActive) ?? variants[0] ?? null;
    if (nextDefault && nextDefault.id !== defaultVariantId) {
      setDefaultVariantId(nextDefault.id);
    }
  }, [defaultVariantId, hasVariantOptions, variants]);

  async function save() {
    try {
      setSaving(true);
      setError("");
      const sanitizedOptions = productOptions
        .map((option, position) => ({
          id: option.id,
          name: option.name.trim(),
          position,
          values: option.values
            .map((value, valuePosition) => ({
              id: value.id,
              optionId: option.id,
              value: value.value.trim(),
              position: valuePosition,
              swatch: value.swatch ?? null,
            }))
            .filter((value) => value.value),
        }))
        .filter((option) => option.name && option.values.length > 0);

      const normalizedVariants = sanitizedOptions.length > 0
        ? variants.map((variant, position) => ({
            id: variant.id,
            name: variant.name.trim() || variantLabel(variant.optionValueIds),
            sku: variant.sku || null,
            visualGroupKey: variant.visualGroupKey.trim() || null,
            basePrice: Number(variant.basePrice) || 0,
            discountType: variant.discountType || null,
            discountValue: variant.discountValue === "" ? null : Number(variant.discountValue),
            isActive: variant.isActive,
            position,
            selectionKey: normalizeSelectionKey(variant.optionValueIds),
            optionValueIds: variant.optionValueIds,
            media: normalizeImages(variant.images),
            priceTiers: normalizePriceTiers(variant.priceTiers),
          }))
        : [];

      await api.saveAdminProduct({
        ...draft,
        id,
        sku: draft.sku || null,
        basePrice: Number(draft.basePrice) || 0,
        discountType: draft.discountType || null,
        discountValue: draft.discountValue === "" ? null : Number(draft.discountValue),
        media: normalizeImages(images),
        isHero: false,
        heroSlot: null,
        priceTiers: normalizePriceTiers(priceTiers),
        productOptions: sanitizedOptions,
        defaultVariantId: sanitizedOptions.length > 0
          ? (defaultVariantId || normalizedVariants.find((variant) => variant.isActive)?.id || normalizedVariants[0]?.id || null)
          : null,
        variants: normalizedVariants,
        extras: [],
        customFields: [],
      });
      navigate(id ? `/admin/productos/${id}` : "/admin/productos", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImages(files: File[], target: "product" | string) {
    if (files.length === 0) return;
    try {
      setUploadingKey(target);
      setError("");
      const existingImages = target === "product" ? images : variants.find((variant) => variant.id === target)?.images ?? [];
      const existingVideoCount = existingImages.filter((item) => item.type === "video").length;
      const incomingVideoCount = files.filter((file) => isVideoFile(file)).length;
      if (existingVideoCount + incomingVideoCount > 1) {
        throw new Error("Solo puedes subir un video por galeria en esta version.");
      }
      const uploadedImages: ProductImageInput[] = [];
      for (const [offset, file] of files.entries()) {
        const poster = isVideoFile(file) ? await createPosterFromVideo(file) : null;
        const uploaded = await api.uploadProductMedia({
          file,
          poster,
          slug: `${draft.slug || id || "product"}${target === "product" ? "" : `-${target}`}`,
          alt: draft.name || file.name,
          position: existingImages.length + offset,
        });
        uploadedImages.push(uploaded);
      }
      if (target === "product") {
        setImages((current) => normalizeImages([...current, ...uploadedImages]));
        return;
      }
      setVariants((current) =>
        current.map((variant) => variant.id === target ? { ...variant, images: normalizeImages([...(variant.images ?? []), ...uploadedImages]) } : variant),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo");
    } finally {
      setUploadingKey("");
    }
  }

  function updatePriceTier(index: number, patch: Partial<PriceTierInput>) {
    setPriceTiers((current) => current.map((tier, itemIndex) => (itemIndex === index ? { ...tier, ...patch } : tier)));
  }

  function updateOption(optionId: string, patch: Partial<ProductOptionInput>) {
    setProductOptions((current) => current.map((option) => option.id === optionId ? { ...option, ...patch } : option));
  }

  function updateOptionValue(optionId: string, valueId: string, patch: Partial<ProductOptionValueInput>) {
    setProductOptions((current) =>
      current.map((option) =>
        option.id === optionId
          ? { ...option, values: option.values.map((value) => value.id === valueId ? { ...value, ...patch } : value) }
          : option,
      ),
    );
  }

  function updateVariant(variantId: string, patch: Partial<VariantInput>) {
    setVariants((current) => current.map((variant) => variant.id === variantId ? { ...variant, ...patch } : variant));
  }

  function updateVariantPriceTier(variantId: string, tierIndex: number, patch: Partial<PriceTierInput>) {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === variantId
          ? { ...variant, priceTiers: variant.priceTiers.map((tier, index) => index === tierIndex ? { ...tier, ...patch } : tier) }
          : variant,
      ),
    );
  }

  function renderImageEditor(items: ProductImageInput[], onChange: (nextImages: ProductImageInput[]) => void) {
    return items.length === 0 ? (
      <AdminEmptyState title="Sin galeria" description="Sube imagenes o un video para mostrar mejor este elemento." />
    ) : (
      <Grid container spacing={2}>
        {items.map((image, index) => (
          <Grid key={`${image.url}-${index}`} size={{ xs: 12, sm: 6 }}>
            <Box sx={{ p: 1.25, border: "1px solid rgba(64,44,37,.10)", borderRadius: 2 }}>
              <Stack spacing={1}>
                <Box sx={{ position: "relative" }}>
                  {image.type === "video" ? (
                    <Box component="video" src={image.url} poster={image.posterUrl ?? undefined} controls playsInline sx={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 1 }} />
                  ) : (
                    <Box component="img" src={image.url} alt={image.alt} sx={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 1 }} />
                  )}
                  {index === 0 && <Chip size="small" icon={<Star size={14} />} label="Principal" sx={{ position: "absolute", left: 8, top: 8, bgcolor: "rgba(255,250,245,.94)", fontWeight: 900 }} />}
                </Box>
                <TextField size="small" label={image.type === "video" ? "Descripcion del video" : "Descripcion de la imagen"} value={image.alt} onChange={(event) => onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, alt: event.target.value } : item)))} />
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">{image.type === "video" ? `Video ${index + 1}` : `Imagen ${index + 1}`}</Typography>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton aria-label="Hacer imagen principal" disabled={index === 0} onClick={() => {
                      const next = [...items];
                      const [item] = next.splice(index, 1);
                      if (!item) return;
                      onChange(normalizeImages([item, ...next]));
                    }}>
                      <Star size={18} />
                    </IconButton>
                    <IconButton aria-label="Subir imagen" disabled={index === 0} onClick={() => {
                      const next = [...items];
                      const [item] = next.splice(index, 1);
                      if (!item) return;
                      next.splice(index - 1, 0, item);
                      onChange(normalizeImages(next));
                    }}>
                      <ArrowUp size={18} />
                    </IconButton>
                    <IconButton aria-label="Bajar imagen" disabled={index === items.length - 1} onClick={() => {
                      const next = [...items];
                      const [item] = next.splice(index, 1);
                      if (!item) return;
                      next.splice(index + 1, 0, item);
                      onChange(normalizeImages(next));
                    }}>
                      <ArrowDown size={18} />
                    </IconButton>
                    <IconButton aria-label="Eliminar imagen" onClick={() => onChange(normalizeImages(items.filter((_, itemIndex) => itemIndex !== index)))}>
                      <Trash2 size={18} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    );
  }

  function generateVariants() {
    const cleanOptions = productOptions
      .map((option) => ({
        ...option,
        name: option.name.trim(),
        values: option.values.filter((value) => value.value.trim()),
      }))
      .filter((option) => option.name && option.values.length > 0);

    if (cleanOptions.length === 0) {
      setVariants([]);
      setDefaultVariantId("");
      return;
    }

    const combinations = cartesianProduct(cleanOptions.map((option) => option.values));
    const existingByKey = new Map(variants.map((variant) => [normalizeSelectionKey(variant.optionValueIds), variant]));

    const nextVariants = combinations.map((combo, position) => {
      const optionValueIds = combo.map((value) => value.id);
      const key = normalizeSelectionKey(optionValueIds);
      const existing = existingByKey.get(key);
      if (existing) {
        return { ...existing, optionValueIds, position, name: existing.name || combo.map((value) => value.value).join(" / ") };
      }
      const variant = createVariant(position, optionValueIds);
      return {
        ...variant,
        name: combo.map((value) => value.value).join(" / "),
        basePrice: draft.basePrice || "0",
      };
    });

    setVariants(nextVariants);
    setDefaultVariantId((current) => current && nextVariants.some((variant) => variant.id === current) ? current : nextVariants[0]?.id ?? "");
  }

  const duplicateSelectionKeys = useMemo(() => {
    const counts = new Map<string, number>();
    variants.forEach((variant) => {
      const key = normalizeSelectionKey(variant.optionValueIds);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key));
  }, [variants]);

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Productos", to: "/admin/productos" }, { label: isEdit ? "Editar" : "Nuevo" }]} />
      <AdminPageHeader
        title={isEdit ? "Editar producto" : "Nuevo producto"}
        subtitle="Configura el producto y, si aplica, sus variantes visibles."
        action={<AdminBackButton to={id ? `/admin/productos/${id}` : "/admin/productos"} />}
      />
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

      <AdminSection title="Datos base" description="Informacion general y comercial inicial del producto.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField disabled={loading} fullWidth label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField disabled={loading} fullWidth label="Enlace corto" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} helperText="Ejemplo: retrato-mascota" />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField disabled={loading} fullWidth label={hasVariantOptions ? "Referencia sugerida" : "Referencia"} value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField disabled={loading} fullWidth type="text" label={hasVariantOptions ? "Precio sugerido para variantes nuevas" : "Precio"} value={draft.basePrice} onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField disabled={loading} select fullWidth label={hasVariantOptions ? "Descuento sugerido" : "Descuento"} value={draft.discountType} onChange={(event) => setDraft({ ...draft, discountType: event.target.value as DiscountType | "" })}>
              <MenuItem value="">Sin descuento</MenuItem>
              <MenuItem value="percentage">Porcentaje</MenuItem>
              <MenuItem value="fixed">Monto fijo</MenuItem>
            </TextField>
          </Grid>
          {draft.discountType && (
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField disabled={loading} fullWidth type="text" label={draft.discountType === "percentage" ? "Porcentaje" : "Monto"} value={draft.discountValue} onChange={(event) => setDraft({ ...draft, discountValue: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
            </Grid>
          )}
          <Grid size={{ xs: 12 }}>
            <TextField disabled={loading} fullWidth multiline minRows={3} label="Descripcion" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField disabled={loading} select fullWidth label="Categoria" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2}>
          <FormControlLabel control={<Checkbox checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} />} label="Publicado" />
          <FormControlLabel control={<Checkbox checked={draft.isFeatured} onChange={(event) => setDraft({ ...draft, isFeatured: event.target.checked })} />} label="Destacado" />
        </Stack>
      </AdminSection>

      {!hasVariantOptions && (
        <>
          <AdminSection title="Precios por cantidad" description="Se guardan en la variante unica automatica.">
            <Stack spacing={1.5}>
              <Button size="small" startIcon={<Plus size={16} />} onClick={() => setPriceTiers((current) => [...current, { minQuantity: "2", unitPrice: draft.basePrice || "0", totalPrice: "", label: "" }])}>
                Agregar precio
              </Button>
              {priceTiers.length === 0 && <Typography color="text.secondary">Sin precios por cantidad. Se usara el precio base.</Typography>}
              {priceTiers.map((tier, index) => (
                <PriceTierEditor
                  key={`product-tier-${index}`}
                  tier={tier}
                  onChange={(patch) => updatePriceTier(index, patch)}
                  onDuplicate={() => setPriceTiers((current) => [...current.slice(0, index + 1), { ...tier }, ...current.slice(index + 1)])}
                  onDelete={() => setPriceTiers((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                />
              ))}
            </Stack>
          </AdminSection>

          <AdminSection title="Galeria del producto" description="Se guarda en la variante unica automatica.">
            <Stack spacing={2}>
              <ImageUploadDropzone
                disabled={uploadingKey === "product"}
                loadingLabel="Subiendo galeria..."
                idleLabel="Subir galeria"
                helperText="Arrastra imagenes o un video aqui, o haz click para seleccionarlos."
                onFilesSelected={(files) => void uploadImages(files, "product")}
              />
              {renderImageEditor(images, setImages)}
            </Stack>
          </AdminSection>
        </>
      )}

      {hasVariantOptions && (
        <AdminSection title="Galeria descriptiva del producto" description="Es apoyo visual general; la vista publica arrancara desde la variante por defecto.">
          <Stack spacing={2}>
            <ImageUploadDropzone
              disabled={uploadingKey === "product"}
              loadingLabel="Subiendo galeria..."
              idleLabel="Subir galeria del producto"
              helperText="Arrastra imagenes o un video aqui, o haz click para seleccionarlos."
              onFilesSelected={(files) => void uploadImages(files, "product")}
            />
            {renderImageEditor(images, setImages)}
          </Stack>
        </AdminSection>
      )}

      <AdminSection
        title="Opciones del producto"
        description="Define los ejes dinamicos del producto, por ejemplo Color, Talla o Material."
        action={<Button size="small" startIcon={<Plus size={16} />} onClick={() => setProductOptions((current) => [...current, createOption(current.length)])}>Agregar opcion</Button>}
      >
        <Stack spacing={2}>
          {productOptions.length === 0 && <Typography color="text.secondary">Si no agregas opciones, el producto seguira siendo simple.</Typography>}
          {productOptions.map((option, optionIndex) => (
            <Box key={option.id} sx={{ p: 2, border: "1px solid rgba(64,44,37,.10)", borderRadius: 2 }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={900}>Opcion {optionIndex + 1}</Typography>
                  <IconButton aria-label="Eliminar opcion" onClick={() => {
                    const removedValueIds = new Set(option.values.map((value) => value.id));
                    setProductOptions((current) => current.filter((item) => item.id !== option.id).map((item, position) => ({ ...item, position })));
                    setVariants((current) => current.filter((variant) => variant.optionValueIds.every((valueId) => !removedValueIds.has(valueId))).map((variant, position) => ({ ...variant, position })));
                  }}>
                    <Trash2 size={18} />
                  </IconButton>
                </Stack>
                <TextField fullWidth label="Nombre de la opcion" value={option.name} onChange={(event) => updateOption(option.id, { name: event.target.value })} helperText="Ejemplo: Color, Talla, Acabado" />
                <Stack spacing={1.25}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={900}>Valores</Typography>
                    <Button size="small" startIcon={<Plus size={16} />} onClick={() => updateOption(option.id, { values: [...option.values, createOptionValue(option.id, option.values.length)] })}>
                      Agregar valor
                    </Button>
                  </Stack>
                  {option.values.length === 0 && <Typography color="text.secondary">Agrega al menos un valor para esta opcion.</Typography>}
                  {option.values.map((value, valueIndex) => (
                    <Grid key={value.id} container spacing={1.5} alignItems="center">
                      <Grid size={{ xs: 12, md: 10 }}>
                        <TextField fullWidth size="small" label={`Valor ${valueIndex + 1}`} value={value.value} onChange={(event) => updateOptionValue(option.id, value.id, { value: event.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <IconButton aria-label="Eliminar valor" onClick={() => {
                          updateOption(option.id, { values: option.values.filter((item) => item.id !== value.id).map((item, position) => ({ ...item, position })) });
                          setVariants((current) => current.filter((variant) => !variant.optionValueIds.includes(value.id)).map((variant, position) => ({ ...variant, position })));
                        }}>
                          <Trash2 size={18} />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      </AdminSection>

      <AdminSection
        title="Combinaciones"
        description="Genera variantes reales, define su precio y marca cual sera la variante por defecto."
        action={<Button size="small" variant="contained" startIcon={<Sparkles size={16} />} onClick={generateVariants}>Generar combinaciones</Button>}
      >
        <Stack spacing={2}>
          {variants.length === 0 && <Typography color="text.secondary">Todavia no hay combinaciones generadas.</Typography>}
          {variants.map((variant) => {
            const label = variantLabel(variant.optionValueIds);
            const selectionKey = normalizeSelectionKey(variant.optionValueIds);
            return (
              <Box key={variant.id} sx={{ p: 2, border: "1px solid rgba(64,44,37,.10)", borderRadius: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                    <Box>
                      <Typography fontWeight={900}>{label || "Combinacion sin nombre"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {variant.optionValueIds.map((valueId) => {
                          const value = optionValueById.get(valueId);
                          return value ? `${value.optionName}: ${value.value}` : valueId;
                        }).join(" - ")}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {defaultVariantId === variant.id && <Chip size="small" color="secondary" label="Por defecto" />}
                      {duplicateSelectionKeys.has(selectionKey) && <Chip size="small" color="warning" label="Duplicada" />}
                      <IconButton aria-label="Eliminar variante" onClick={() => setVariants((current) => current.filter((item) => item.id !== variant.id).map((item, position) => ({ ...item, position })))}>
                        <Trash2 size={18} />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label="Nombre visible" value={variant.name} onChange={(event) => updateVariant(variant.id, { name: event.target.value })} helperText="Si lo dejas vacio, se usara la combinacion de valores." />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label="SKU variante" value={variant.sku} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth type="text" label="Precio base" value={variant.basePrice} onChange={(event) => updateVariant(variant.id, { basePrice: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField select fullWidth label="Descuento variante" value={variant.discountType} onChange={(event) => updateVariant(variant.id, { discountType: event.target.value as DiscountType | "" })}>
                        <MenuItem value="">Sin descuento</MenuItem>
                        <MenuItem value="percentage">Porcentaje</MenuItem>
                        <MenuItem value="fixed">Monto fijo</MenuItem>
                      </TextField>
                    </Grid>
                    {variant.discountType && (
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth type="text" label={variant.discountType === "percentage" ? "Porcentaje" : "Monto"} value={variant.discountValue} onChange={(event) => updateVariant(variant.id, { discountValue: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
                      </Grid>
                    )}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControlLabel control={<Checkbox checked={variant.isActive} onChange={(event) => updateVariant(variant.id, { isActive: event.target.checked })} />} label="Activa" />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControlLabel control={<Checkbox checked={defaultVariantId === variant.id} onChange={(event) => setDefaultVariantId(event.target.checked ? variant.id : "")} />} label="Variante por defecto" />
                    </Grid>
                  </Grid>

                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={900}>Precios por cantidad</Typography>
                      <Button size="small" startIcon={<Plus size={16} />} onClick={() => updateVariant(variant.id, { priceTiers: [...variant.priceTiers, { minQuantity: "2", unitPrice: variant.basePrice || draft.basePrice || "0", totalPrice: "", label: "" }] })}>
                        Agregar precio
                      </Button>
                    </Stack>
                    {variant.priceTiers.length === 0 && <Typography color="text.secondary">Si no agregas precios aqui, esta variante usara solo su precio base.</Typography>}
                    {variant.priceTiers.map((tier, tierIndex) => (
                      <PriceTierEditor
                        key={`${variant.id}-tier-${tierIndex}`}
                        tier={tier}
                        onChange={(patch) => updateVariantPriceTier(variant.id, tierIndex, patch)}
                        onDuplicate={() => updateVariant(variant.id, { priceTiers: [...variant.priceTiers.slice(0, tierIndex + 1), { ...tier }, ...variant.priceTiers.slice(tierIndex + 1)] })}
                        onDelete={() => updateVariant(variant.id, { priceTiers: variant.priceTiers.filter((_, itemIndex) => itemIndex !== tierIndex) })}
                      />
                    ))}
                  </Stack>

                  <Stack spacing={1.5}>
                    <ImageUploadDropzone
                      disabled={uploadingKey === variant.id}
                      loadingLabel="Subiendo galeria..."
                      idleLabel="Subir galeria de variante"
                      helperText="Arrastra imagenes o un video de esta variante, o haz click para seleccionarlos."
                      onFilesSelected={(files) => void uploadImages(files, variant.id)}
                    />
                    {renderImageEditor(variant.images, (nextImages) => updateVariant(variant.id, { images: nextImages }))}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </AdminSection>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button variant="contained" size="large" onClick={() => void save()} disabled={loading || saving}>
          {saving ? "Guardando..." : "Guardar producto"}
        </Button>
        <AdminBackButton to={id ? `/admin/productos/${id}` : "/admin/productos"} label="Cancelar" />
      </Stack>
    </Stack>
  );
}

function ImageUploadDropzone({
  disabled,
  idleLabel,
  loadingLabel,
  helperText,
  onFilesSelected,
}: {
  disabled: boolean;
  idleLabel: string;
  loadingLabel: string;
  helperText: string;
  onFilesSelected: (files: File[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  function preventDefaults(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    preventDefaults(event);
    if (disabled) return;
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []).filter(isMediaFile);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }

  return (
    <Box
      component="label"
      onDragEnter={(event: DragEvent<HTMLLabelElement>) => {
        preventDefaults(event);
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event: DragEvent<HTMLLabelElement>) => {
        preventDefaults(event);
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(event: DragEvent<HTMLLabelElement>) => {
        preventDefaults(event);
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      sx={{
        border: "1.5px dashed",
        borderColor: isDragging ? "primary.main" : "rgba(64,44,37,.20)",
        borderRadius: 2,
        px: 2,
        py: 2.25,
        cursor: disabled ? "not-allowed" : "pointer",
        bgcolor: isDragging ? "rgba(224,122,95,.08)" : "rgba(255,250,245,.6)",
        transition: "border-color .2s ease, background-color .2s ease, transform .2s ease",
        "&:hover": disabled
          ? undefined
          : {
              borderColor: "primary.main",
              bgcolor: "rgba(224,122,95,.05)",
            },
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <ImagePlus size={18} />
            <Typography fontWeight={900}>{disabled ? loadingLabel : idleLabel}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {disabled ? "Procesando archivos..." : helperText}
          </Typography>
        </Stack>
        <Button component="span" variant="outlined" disabled={disabled}>
          Seleccionar
        </Button>
      </Stack>
      <input
        hidden
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
        multiple
        type="file"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []).filter(isMediaFile);
          event.target.value = "";
          if (files.length > 0) {
            onFilesSelected(files);
          }
        }}
      />
    </Box>
  );
}

function PriceTierEditor({
  tier,
  onChange,
  onDuplicate,
  onDelete,
}: {
  tier: PriceTierInput;
  onChange: (patch: Partial<PriceTierInput>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Box sx={{ p: 1.5, border: "1px solid rgba(64,44,37,.10)", borderRadius: 2 }}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField fullWidth size="small" type="text" label="Cantidad minima" value={tier.minQuantity} onChange={(event) => onChange({ minQuantity: event.target.value })} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField fullWidth size="small" type="text" label="Precio unitario" value={tier.unitPrice} onChange={(event) => onChange({ unitPrice: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
          <TextField fullWidth size="small" type="text" label="Precio total exacto" value={tier.totalPrice ?? ""} onChange={(event) => onChange({ totalPrice: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
          <TextField fullWidth size="small" label="Texto visible" value={tier.label ?? ""} onChange={(event) => onChange({ label: event.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Stack direction="row" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
            <IconButton aria-label="Duplicar precio" onClick={onDuplicate}>
              <Copy size={18} />
            </IconButton>
            <IconButton aria-label="Eliminar precio" onClick={onDelete}>
              <Trash2 size={18} />
            </IconButton>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
