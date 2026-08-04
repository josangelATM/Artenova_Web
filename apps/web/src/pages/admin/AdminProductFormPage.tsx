import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Grid, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Star, Trash2 } from "lucide-react";
import type { Category, DiscountType, Product, ProductImage, ProductVariantAttribute } from "@artenova/shared";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminEmptyState, AdminPageHeader, AdminSection } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";

type ProductImageInput = Omit<ProductImage, "id">;
type PriceTierInput = {
  minQuantity: string;
  unitPrice: string;
  totalPrice?: string;
  label?: string | null;
};

type VariantAttributeInput = Omit<ProductVariantAttribute, "id">;
type DraftProduct = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  basePrice: string;
  discountType: DiscountType | "";
  discountValue: string;
  material: string;
  size: string;
  technique: string;
  isPublished: boolean;
  isFeatured: boolean;
};

type VariantInput = {
  name: string;
  sku: string;
  basePrice: string;
  discountType: DiscountType | "";
  discountValue: string;
  isActive: boolean;
  position: number;
  images: ProductImageInput[];
  attributes: VariantAttributeInput[];
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
  material: "",
  size: "",
  technique: "Corte y grabado láser",
  isPublished: true,
  isFeatured: false
};

const emptyVariant = (position: number): VariantInput => ({
  name: "",
  sku: "",
  basePrice: "",
  discountType: "",
  discountValue: "",
  isActive: true,
  position,
  images: [],
  attributes: [],
  priceTiers: []
});

function normalizeImages(items: ProductImageInput[]) {
  return items.map((image, position) => ({ ...image, position }));
}

function normalizePriceTiers(items: PriceTierInput[]) {
  return items.map((tier) => ({
    minQuantity: Number(tier.minQuantity) || 1,
    unitPrice: Number(tier.unitPrice) || 0,
    totalPrice: !tier.totalPrice ? null : Number(tier.totalPrice),
    label: tier.label?.trim() || null
  }));
}

function normalizeVariantAttributes(items: VariantAttributeInput[]) {
  return items
    .map((attribute, position) => ({
      name: attribute.name.trim(),
      value: attribute.value.trim(),
      position
    }))
    .filter((attribute) => attribute.name && attribute.value);
}

export function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DraftProduct>(emptyProduct);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<ProductImageInput[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTierInput[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");
  const isEdit = Boolean(id);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([api.adminCategories(), id ? api.adminProduct(id) : Promise.resolve(null)])
      .then(([nextCategories, selected]) => {
        if (!active) return;
        setCategories(nextCategories);
        if (selected) {
          setDraft({
            name: selected.name,
            slug: selected.slug,
            sku: selected.sku ?? "",
            description: selected.description,
            categoryId: selected.categoryId,
            basePrice: String(selected.basePrice),
            discountType: selected.discountType ?? "",
            discountValue: selected.discountValue == null ? "" : String(selected.discountValue),
            material: selected.material ?? "",
            size: selected.size ?? "",
            technique: selected.technique ?? "",
            isPublished: selected.isPublished,
            isFeatured: selected.isFeatured
          });
          setImages(selected.images.map(({ url, alt, position }) => ({ url, alt, position })));
          setPriceTiers(selected.priceTiers.map(({ minQuantity, unitPrice, totalPrice, label }) => ({ minQuantity: String(minQuantity), unitPrice: String(unitPrice), totalPrice: totalPrice == null ? "" : String(totalPrice), label })));
          setVariants(
            selected.variants.map((variant, position) => ({
              name: variant.name,
              sku: variant.sku ?? "",
              basePrice: String(variant.basePrice),
              discountType: variant.discountType ?? "",
              discountValue: variant.discountValue == null ? "" : String(variant.discountValue),
              isActive: variant.isActive,
              position,
              images: variant.images.map(({ url, alt, position: imagePosition }) => ({ url, alt, position: imagePosition })),
              attributes: variant.attributes.map(({ name, value, position: attributePosition }) => ({ name, value, position: attributePosition })),
              priceTiers: variant.priceTiers.map(({ minQuantity, unitPrice, totalPrice, label }) => ({ minQuantity: String(minQuantity), unitPrice: String(unitPrice), totalPrice: totalPrice == null ? "" : String(totalPrice), label }))
            }))
          );
        } else {
          setDraft((current) => ({ ...current, categoryId: current.categoryId || nextCategories[0]?.id || "" }));
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

  async function save() {
    try {
      setSaving(true);
      setError("");
      const saved = await api.saveAdminProduct({
        ...draft,
        id,
        sku: draft.sku || null,
        basePrice: Number(draft.basePrice) || 0,
        discountType: draft.discountType || null,
        discountValue: draft.discountValue === "" ? null : Number(draft.discountValue),
        images: normalizeImages(images),
        isHero: false,
        heroSlot: null,
        priceTiers: normalizePriceTiers(priceTiers),
        variants: variants.map((variant, position) => ({
          name: variant.name,
          sku: variant.sku || null,
          basePrice: Number(variant.basePrice) || 0,
          discountType: variant.discountType || null,
          discountValue: variant.discountValue === "" ? null : Number(variant.discountValue),
          isActive: variant.isActive,
          position,
          images: normalizeImages(variant.images),
          attributes: normalizeVariantAttributes(variant.attributes),
          priceTiers: normalizePriceTiers(variant.priceTiers)
        })),
        extras: [],
        customFields: []
      });
      navigate(`/admin/productos/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImages(files: File[], target: "product" | number) {
    if (files.length === 0) return;
    const key = target === "product" ? "product" : `variant-${target}`;
    try {
      setUploadingKey(key);
      setError("");
      const existingImages = target === "product" ? images : variants[target]?.images ?? [];
      const uploadedImages: ProductImageInput[] = [];
      for (const [offset, file] of files.entries()) {
        const uploaded = await api.uploadProductImage({
          file,
          slug: `${draft.slug || id || "product"}${target === "product" ? "" : `-variant-${target + 1}`}`,
          alt: draft.name || file.name,
          position: existingImages.length + offset
        });
        uploadedImages.push(uploaded);
      }

      if (target === "product") {
        setImages((current) => normalizeImages([...current, ...uploadedImages]));
      } else {
        setVariants((current) => current.map((variant, index) => index === target ? { ...variant, images: normalizeImages([...(variant.images ?? []), ...uploadedImages]) } : variant));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploadingKey("");
    }
  }

  function updatePriceTier(index: number, patch: Partial<PriceTierInput>) {
    setPriceTiers((current) => current.map((tier, itemIndex) => (itemIndex === index ? { ...tier, ...patch } : tier)));
  }

  function updateVariant(index: number, patch: Partial<VariantInput>) {
    setVariants((current) => current.map((variant, itemIndex) => (itemIndex === index ? { ...variant, ...patch } : variant)));
  }

  function updateVariantPriceTier(variantIndex: number, tierIndex: number, patch: Partial<PriceTierInput>) {
    setVariants((current) =>
      current.map((variant, itemIndex) =>
        itemIndex === variantIndex
          ? { ...variant, priceTiers: variant.priceTiers.map((tier, currentTierIndex) => (currentTierIndex === tierIndex ? { ...tier, ...patch } : tier)) }
          : variant
      )
    );
  }

  function updateVariantAttribute(variantIndex: number, attributeIndex: number, patch: Partial<VariantAttributeInput>) {
    setVariants((current) =>
      current.map((variant, itemIndex) =>
        itemIndex === variantIndex
          ? { ...variant, attributes: variant.attributes.map((attribute, currentAttributeIndex) => (currentAttributeIndex === attributeIndex ? { ...attribute, ...patch } : attribute)) }
          : variant
      )
    );
  }

  function renderImageEditor(items: ProductImageInput[], onChange: (nextImages: ProductImageInput[]) => void) {
    return items.length === 0 ? (
      <AdminEmptyState title="Sin imagen" description="Sube al menos una imagen para mostrar mejor este elemento." />
    ) : (
      <Grid container spacing={2}>
        {items.map((image, index) => (
          <Grid key={`${image.url}-${index}`} size={{ xs: 12, sm: 6 }}>
            <Box sx={{ p: 1.25, border: "1px solid rgba(64,44,37,.10)", borderRadius: 2 }}>
              <Stack spacing={1}>
                <Box sx={{ position: "relative" }}>
                  <Box component="img" src={image.url} alt={image.alt} sx={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 1 }} />
                  {index === 0 && <Chip size="small" icon={<Star size={14} />} label="Principal" sx={{ position: "absolute", left: 8, top: 8, bgcolor: "rgba(255,250,245,.94)", fontWeight: 900 }} />}
                </Box>
                <TextField size="small" label="Descripción de la foto" value={image.alt} onChange={(event) => onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, alt: event.target.value } : item)))} />
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Foto {index + 1}</Typography>
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

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Productos", to: "/admin/productos" }, { label: isEdit ? "Editar" : "Nuevo" }]} />
      <AdminPageHeader
        title={isEdit ? "Editar producto" : "Nuevo producto"}
        subtitle="Formulario dedicado para trabajar variantes, descuentos y fotos con mejor foco."
        action={<AdminBackButton to={id ? `/admin/productos/${id}` : "/admin/productos"} />}
      />
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

      <AdminSection title="Datos base" description="Información principal del producto visible en la tienda.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField disabled={loading} fullWidth label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField disabled={loading} fullWidth label="Enlace corto" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} helperText="Ejemplo: retrato-mascota" />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField disabled={loading} fullWidth label="Referencia" value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField disabled={loading} fullWidth type="text" label="Precio base" value={draft.basePrice} onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField disabled={loading} select fullWidth label="Descuento" value={draft.discountType} onChange={(event) => setDraft({ ...draft, discountType: event.target.value as DiscountType | "" })}>
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
            <TextField disabled={loading} fullWidth multiline minRows={3} label="Descripción" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField disabled={loading} select fullWidth label="Categoría" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField disabled={loading} fullWidth label="Material" value={draft.material} onChange={(event) => setDraft({ ...draft, material: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField disabled={loading} fullWidth label="Tamaño" value={draft.size} onChange={(event) => setDraft({ ...draft, size: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField disabled={loading} fullWidth label="Técnica" value={draft.technique} onChange={(event) => setDraft({ ...draft, technique: event.target.value })} />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2}>
          <FormControlLabel control={<Checkbox checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} />} label="Publicado" />
          <FormControlLabel control={<Checkbox checked={draft.isFeatured} onChange={(event) => setDraft({ ...draft, isFeatured: event.target.checked })} />} label="Destacado" />
        </Stack>
      </AdminSection>

      <AdminSection title="Precios por cantidad del producto base" description="Se usan en productos simples o si la variante no tiene precios propios.">
        <Stack spacing={1.5}>
          <Button size="small" startIcon={<Plus size={16} />} onClick={() => setPriceTiers((current) => [...current, { minQuantity: "2", unitPrice: draft.basePrice || "0", totalPrice: "", label: "" }])}>
            Agregar precio
          </Button>
          {priceTiers.length === 0 && <Typography color="text.secondary">Sin precios por cantidad. Se usará el precio base del producto.</Typography>}
          {priceTiers.map((tier, index) => (
            <PriceTierEditor key={`product-tier-${index}`} tier={tier} onChange={(patch) => updatePriceTier(index, patch)} onDelete={() => setPriceTiers((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
          ))}
        </Stack>
      </AdminSection>

      <AdminSection title="Fotos del producto base" description="Se usan cuando el producto no tiene fotos propias por variante.">
        <Stack spacing={2}>
          <Button component="label" variant="outlined" startIcon={<ImagePlus size={18} />} disabled={uploadingKey === "product"}>
            {uploadingKey === "product" ? "Subiendo fotos..." : "Subir fotos"}
            <input hidden accept="image/png,image/jpeg,image/webp" multiple type="file" onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              void uploadImages(files, "product");
            }} />
          </Button>
          {renderImageEditor(images, setImages)}
        </Stack>
      </AdminSection>

      <AdminSection
        title="Variantes"
        description="Crea variantes opcionales con atributos, fotos, descuento y precios por cantidad propios."
        action={<Button size="small" startIcon={<Plus size={16} />} onClick={() => setVariants((current) => [...current, emptyVariant(current.length)])}>Agregar variante</Button>}
      >
        <Stack spacing={2}>
          {variants.length === 0 && <Typography color="text.secondary">Si no agregas variantes, el producto se tratará como producto simple.</Typography>}
          {variants.map((variant, variantIndex) => (
            <Box key={`variant-${variantIndex}`} sx={{ p: 2, border: "1px solid rgba(64,44,37,.10)", borderRadius: 2 }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={900}>Variante {variantIndex + 1}</Typography>
                  <IconButton aria-label="Eliminar variante" onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== variantIndex).map((item, position) => ({ ...item, position })))}>
                    <Trash2 size={18} />
                  </IconButton>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Nombre de variante" value={variant.name} onChange={(event) => updateVariant(variantIndex, { name: event.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="SKU variante" value={variant.sku} onChange={(event) => updateVariant(variantIndex, { sku: event.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth type="text" label="Precio base" value={variant.basePrice} onChange={(event) => updateVariant(variantIndex, { basePrice: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField select fullWidth label="Descuento variante" value={variant.discountType} onChange={(event) => updateVariant(variantIndex, { discountType: event.target.value as DiscountType | "" })}>
                      <MenuItem value="">Usar descuento del producto o ninguno</MenuItem>
                      <MenuItem value="percentage">Porcentaje</MenuItem>
                      <MenuItem value="fixed">Monto fijo</MenuItem>
                    </TextField>
                  </Grid>
                  {variant.discountType && (
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth type="text" label={variant.discountType === "percentage" ? "Porcentaje" : "Monto"} value={variant.discountValue} onChange={(event) => updateVariant(variantIndex, { discountValue: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
                    </Grid>
                  )}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControlLabel control={<Checkbox checked={variant.isActive} onChange={(event) => updateVariant(variantIndex, { isActive: event.target.checked })} />} label="Activa" />
                  </Grid>
                </Grid>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={900}>Atributos</Typography>
                    <Button size="small" startIcon={<Plus size={16} />} onClick={() => updateVariant(variantIndex, { attributes: [...variant.attributes, { name: "", value: "", position: variant.attributes.length }] })}>Agregar atributo</Button>
                  </Stack>
                  {variant.attributes.length === 0 && <Typography color="text.secondary">Ejemplo: Color = Negro, Tamaño = Mediano.</Typography>}
                  {variant.attributes.map((attribute, attributeIndex) => (
                    <Grid key={`variant-${variantIndex}-attribute-${attributeIndex}`} container spacing={1.5}>
                      <Grid size={{ xs: 12, md: 5 }}>
                        <TextField fullWidth size="small" label="Nombre" value={attribute.name} onChange={(event) => updateVariantAttribute(variantIndex, attributeIndex, { name: event.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 5 }}>
                        <TextField fullWidth size="small" label="Valor" value={attribute.value} onChange={(event) => updateVariantAttribute(variantIndex, attributeIndex, { value: event.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <IconButton aria-label="Eliminar atributo" onClick={() => updateVariant(variantIndex, { attributes: variant.attributes.filter((_, itemIndex) => itemIndex !== attributeIndex) })}>
                          <Trash2 size={18} />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                </Stack>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={900}>Precios por cantidad de la variante</Typography>
                    <Button size="small" startIcon={<Plus size={16} />} onClick={() => updateVariant(variantIndex, { priceTiers: [...variant.priceTiers, { minQuantity: "2", unitPrice: variant.basePrice || "0", totalPrice: "", label: "" }] })}>Agregar precio</Button>
                  </Stack>
                  {variant.priceTiers.length === 0 && <Typography color="text.secondary">Si no agregas precios aquí, la variante usará los del producto base.</Typography>}
                  {variant.priceTiers.map((tier, tierIndex) => (
                    <PriceTierEditor key={`variant-${variantIndex}-tier-${tierIndex}`} tier={tier} onChange={(patch) => updateVariantPriceTier(variantIndex, tierIndex, patch)} onDelete={() => updateVariant(variantIndex, { priceTiers: variant.priceTiers.filter((_, itemIndex) => itemIndex !== tierIndex) })} />
                  ))}
                </Stack>
                <Stack spacing={1.5}>
                  <Button component="label" variant="outlined" startIcon={<ImagePlus size={18} />} disabled={uploadingKey === `variant-${variantIndex}`}>
                    {uploadingKey === `variant-${variantIndex}` ? "Subiendo fotos..." : "Subir fotos de variante"}
                    <input hidden accept="image/png,image/jpeg,image/webp" multiple type="file" onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      void uploadImages(files, variantIndex);
                    }} />
                  </Button>
                  {renderImageEditor(variant.images, (nextImages) => updateVariant(variantIndex, { images: nextImages }))}
                </Stack>
              </Stack>
            </Box>
          ))}
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

function PriceTierEditor({ tier, onChange, onDelete }: { tier: PriceTierInput; onChange: (patch: Partial<PriceTierInput>) => void; onDelete: () => void }) {
  return (
    <Box sx={{ p: 1.5, border: "1px solid rgba(64,44,37,.10)", borderRadius: 2 }}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField fullWidth size="small" type="text" label="Cantidad mínima" value={tier.minQuantity} onChange={(event) => onChange({ minQuantity: event.target.value })} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField fullWidth size="small" type="text" label="Precio unitario" value={tier.unitPrice} onChange={(event) => onChange({ unitPrice: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField fullWidth size="small" type="text" label="Precio total exacto" value={tier.totalPrice ?? ""} onChange={(event) => onChange({ totalPrice: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField fullWidth size="small" label="Texto visible" value={tier.label ?? ""} onChange={(event) => onChange({ label: event.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 1 }}>
          <IconButton aria-label="Eliminar precio" onClick={onDelete}>
            <Trash2 size={18} />
          </IconButton>
        </Grid>
      </Grid>
    </Box>
  );
}
