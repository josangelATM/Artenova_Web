import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { ArrowDown, ArrowUp, ImageIcon, ImagePlus, Plus, Star, Trash2 } from "lucide-react";
import type { Category, Product, ProductImage, Tag } from "@artenova/shared";
import { api } from "../../lib/api";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusChip, adminSurfaceSx } from "./adminUi";

type ProductImageInput = Omit<ProductImage, "id">;

const emptyProduct = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  categoryId: "",
  basePrice: 0,
  material: "",
  size: "",
  technique: "Corte y grabado láser",
  isPublished: true,
  isFeatured: false,
  tagIds: [] as string[],
};

function normalizeImages(items: ProductImageInput[]) {
  return items.map((image, position) => ({ ...image, position }));
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<typeof emptyProduct>(emptyProduct);
  const [images, setImages] = useState<ProductImageInput[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const selected = useMemo(() => products.find((product) => product.id === selectedId), [products, selectedId]);
  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.name, product.slug, product.sku ?? "", product.categoryId].some((value) => value.toLowerCase().includes(term)));
  }, [products, query]);

  async function load() {
    const [nextProducts, nextCategories, nextTags] = await Promise.all([api.adminProducts(), api.adminCategories(), api.adminTags()]);
    setProducts(nextProducts);
    setCategories(nextCategories);
    setTags(nextTags);
    const firstCategoryId = nextCategories[0]?.id;
    if (!draft.categoryId && firstCategoryId) {
      setDraft((current) => ({ ...current, categoryId: firstCategoryId }));
    }
  }

  function resetForm() {
    setSelectedId("");
    setDraft({ ...emptyProduct, categoryId: categories[0]?.id ?? "" });
    setImages([]);
    setError("");
    setMessage("");
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selected) {
      setDraft({
        name: selected.name,
        slug: selected.slug,
        sku: selected.sku ?? "",
        description: selected.description,
        categoryId: selected.categoryId,
        basePrice: selected.basePrice,
        material: selected.material ?? "",
        size: selected.size ?? "",
        technique: selected.technique ?? "",
        isPublished: selected.isPublished,
        isFeatured: selected.isFeatured,
        tagIds: selected.tags.map((tag) => tag.id),
      });
      setImages(selected.images.map(({ url, alt, position }) => ({ url, alt, position })));
      setError("");
      setMessage("");
    }
  }, [selected]);

  async function save() {
    try {
      setError("");
      await api.saveAdminProduct({
        ...draft,
        id: selectedId || undefined,
        sku: draft.sku || null,
        basePrice: Number(draft.basePrice),
        tagIds: draft.tagIds ?? [],
        images: normalizeImages(images),
        isHero: false,
        heroSlot: null,
        priceTiers: [],
        extras: [],
        customFields: [],
      });
      setMessage("Producto guardado");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  async function uploadImages(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    try {
      setUploadingImage(true);
      setError("");
      const uploadedImages: ProductImageInput[] = [];
      for (const [offset, file] of files.entries()) {
        const uploaded = await api.uploadProductImage({
          file,
          slug: draft.slug || selectedId || "product",
          alt: draft.name || file.name,
          position: images.length + offset,
        });
        uploadedImages.push(uploaded);
      }
      setImages((current) => normalizeImages([...current, ...uploadedImages]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploadingImage(false);
    }
  }

  function moveImage(index: number, offset: number) {
    setImages((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [image] = next.splice(index, 1);
      if (!image) return current;
      next.splice(target, 0, image);
      return normalizeImages(next);
    });
  }

  function makePrimaryImage(index: number) {
    setImages((current) => {
      const next = [...current];
      const [image] = next.splice(index, 1);
      if (!image) return current;
      return normalizeImages([image, ...next]);
    });
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Productos"
        subtitle="Mantén las piezas visibles en el catálogo."
        action={
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={resetForm}>
            Nuevo producto
          </Button>
        }
      />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 2, md: 1 } }}>
          <Paper sx={{ ...adminSurfaceSx, p: 2 }}>
            <Stack spacing={1.5}>
              <TextField size="small" label="Buscar producto" value={query} onChange={(event) => setQuery(event.target.value)} />
              {filteredProducts.length === 0 ? (
                <AdminEmptyState title="Sin productos" description="Crea el primer producto del catálogo." />
              ) : (
                filteredProducts.map((product) => (
                  <Button
                    key={product.id}
                    color={product.id === selectedId ? "secondary" : "primary"}
                    variant={product.id === selectedId ? "contained" : "text"}
                    onClick={() => setSelectedId(product.id)}
                    sx={{ justifyContent: "flex-start", borderRadius: 2, textAlign: "left" }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center" width="100%">
                      {product.images[0]?.url ? (
                        <Box component="img" src={product.images[0].url} alt="" sx={{ width: 42, height: 42, objectFit: "cover", borderRadius: 1, flexShrink: 0 }} />
                      ) : (
                        <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: "rgba(64,44,37,.08)", color: "text.secondary", flexShrink: 0 }}>
                          <ImageIcon size={18} />
                        </Box>
                      )}
                      <Box flex={1} minWidth={0}>
                        <Typography noWrap fontWeight={900}>
                          {product.name}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <StatusChip status={product.isPublished ? "published" : "draft"} />
                          {product.isFeatured && <Chip size="small" label="Destacado" variant="outlined" />}
                        </Stack>
                      </Box>
                    </Stack>
                  </Button>
                ))
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 1, md: 2 } }}>
          <Stack spacing={2.5}>
            {message && (
              <Alert severity="success" onClose={() => setMessage("")}>
                {message}
              </Alert>
            )}
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            <AdminSection title={selectedId ? "Editar producto" : "Nuevo producto"} description="Información que aparece en la tienda.">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Enlace corto" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} helperText="Ejemplo: retrato-mascota" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Referencia" value={draft.sku ?? ""} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth type="number" label="Precio desde" value={draft.basePrice} onChange={(event) => setDraft({ ...draft, basePrice: Number(event.target.value) })} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth multiline minRows={3} label="Descripción" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select fullWidth label="Categoría" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    SelectProps={{
                      multiple: true,
                      renderValue: (selectedTags) => (
                        <Stack direction="row" gap={0.75} flexWrap="wrap">
                          {(selectedTags as string[]).map((tagId) => {
                            const tag = tags.find((item) => item.id === tagId);
                            return <Chip key={tagId} label={tag?.name ?? tagId} size="small" />;
                          })}
                        </Stack>
                      ),
                    }}
                    label="Etiquetas"
                    value={draft.tagIds ?? []}
                    onChange={(event) => setDraft({ ...draft, tagIds: typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value })}
                  >
                    {tags.map((tag) => (
                      <MenuItem key={tag.id} value={tag.id}>
                        {tag.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Material" value={draft.material ?? ""} onChange={(event) => setDraft({ ...draft, material: event.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Tamaño" value={draft.size ?? ""} onChange={(event) => setDraft({ ...draft, size: event.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Técnica" value={draft.technique ?? ""} onChange={(event) => setDraft({ ...draft, technique: event.target.value })} />
                </Grid>
              </Grid>
              <Stack direction="row" spacing={2}>
                <FormControlLabel control={<Checkbox checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} />} label="Publicado" />
                <FormControlLabel control={<Checkbox checked={draft.isFeatured} onChange={(event) => setDraft({ ...draft, isFeatured: event.target.checked })} />} label="Destacado" />
              </Stack>
            </AdminSection>

            <AdminSection title="Fotos" description="Sube fotos claras para mostrar el producto en el catálogo.">
              <Stack spacing={2}>
                <Button component="label" variant="outlined" startIcon={<ImagePlus size={18} />} disabled={uploadingImage}>
                  {uploadingImage ? "Subiendo fotos..." : "Subir fotos"}
                  <input
                    hidden
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    type="file"
                    onChange={(event) => {
                      const files = event.target.files;
                      event.target.value = "";
                      void uploadImages(files);
                    }}
                  />
                </Button>
                {images.length === 0 ? (
                  <AdminEmptyState title="Sin imagen" description="Sube una imagen para que el producto se vea en el catálogo." />
                ) : (
                  <Grid container spacing={2}>
                    {images.map((image, index) => (
                      <Grid key={image.url} size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ p: 1.25, border: "1px solid rgba(64,44,37,.10)" }}>
                          <Stack spacing={1}>
                            <Box sx={{ position: "relative" }}>
                              <Box component="img" src={image.url} alt={image.alt} sx={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 1 }} />
                              {index === 0 && <Chip size="small" icon={<Star size={14} />} label="Principal" sx={{ position: "absolute", left: 8, top: 8, bgcolor: "rgba(255,250,245,.94)", fontWeight: 900 }} />}
                            </Box>
                            <TextField size="small" label="Descripción de la foto" value={image.alt} onChange={(event) => setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, alt: event.target.value } : item)))} />
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary">
                                Foto {index + 1}
                              </Typography>
                              <Stack direction="row" spacing={0.5}>
                                <IconButton aria-label="Hacer imagen principal" disabled={index === 0} onClick={() => makePrimaryImage(index)}>
                                  <Star size={18} />
                                </IconButton>
                                <IconButton aria-label="Subir imagen" disabled={index === 0} onClick={() => moveImage(index, -1)}>
                                  <ArrowUp size={18} />
                                </IconButton>
                                <IconButton aria-label="Bajar imagen" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)}>
                                  <ArrowDown size={18} />
                                </IconButton>
                                <IconButton aria-label="Eliminar imagen" onClick={() => setImages((current) => normalizeImages(current.filter((_, itemIndex) => itemIndex !== index)))}>
                                  <Trash2 size={18} />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Stack>
            </AdminSection>

            <Button variant="contained" size="large" onClick={save}>
              Guardar producto
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
