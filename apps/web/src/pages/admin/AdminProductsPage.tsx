import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import type { Category, Product } from "@artenova/shared";
import { api } from "../../lib/api";

const emptyProduct = {
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  basePrice: 0,
  material: "",
  size: "",
  technique: "Corte y grabado laser",
  isPublished: true,
  isFeatured: false,
  images: [],
  priceTiers: [],
  extras: [],
  customFields: []
};

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<any>(emptyProduct);
  const [jsonAdvanced, setJsonAdvanced] = useState("{}");
  const [error, setError] = useState("");

  const selected = useMemo(() => products.find((product) => product.id === selectedId), [products, selectedId]);

  async function load() {
    const [nextProducts, nextCategories] = await Promise.all([api.adminProducts(), api.adminCategories()]);
    setProducts(nextProducts);
    setCategories(nextCategories);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selected) {
      setDraft(selected);
      setJsonAdvanced(JSON.stringify({
        images: selected.images.map(({ url, alt, position }) => ({ url, alt, position })),
        priceTiers: selected.priceTiers.map(({ minQuantity, unitPrice, label }) => ({ minQuantity, unitPrice, label })),
        extras: selected.extras.map(({ name, type, priceDelta }) => ({ name, type, priceDelta })),
        customFields: selected.customFields.map(({ label, type, required, options, helpText }) => ({ label, type, required, options, helpText }))
      }, null, 2));
    }
  }, [selected]);

  async function save() {
    try {
      setError("");
      const advanced = JSON.parse(jsonAdvanced);
      await api.saveAdminProduct({ ...draft, ...advanced, basePrice: Number(draft.basePrice) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Button variant="contained" onClick={() => { setSelectedId(""); setDraft({ ...emptyProduct, categoryId: categories[0]?.id ?? "" }); setJsonAdvanced(JSON.stringify({ images: [], priceTiers: [], extras: [], customFields: [] }, null, 2)); }}>
              Nuevo producto
            </Button>
            {products.map((product) => (
              <Button key={product.id} color={product.id === selectedId ? "secondary" : "primary"} onClick={() => setSelectedId(product.id)} sx={{ justifyContent: "flex-start" }}>
                {product.name}
              </Button>
            ))}
          </Stack>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={900}>{selectedId ? "Editar producto" : "Nuevo producto"}</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Slug" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></Grid>
              <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label="Descripción" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select fullWidth label="Categoría" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
                  {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="number" label="Precio base" value={draft.basePrice} onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Material" value={draft.material ?? ""} onChange={(event) => setDraft({ ...draft, material: event.target.value })} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Tamaño" value={draft.size ?? ""} onChange={(event) => setDraft({ ...draft, size: event.target.value })} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Técnica" value={draft.technique ?? ""} onChange={(event) => setDraft({ ...draft, technique: event.target.value })} /></Grid>
            </Grid>
            <Stack direction="row" spacing={2}>
              <FormControlLabel control={<Checkbox checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} />} label="Publicado" />
              <FormControlLabel control={<Checkbox checked={draft.isFeatured} onChange={(event) => setDraft({ ...draft, isFeatured: event.target.checked })} />} label="Destacado" />
            </Stack>
            <TextField
              label="Imágenes, precios por cantidad, extras y campos personalizados (JSON)"
              value={jsonAdvanced}
              onChange={(event) => setJsonAdvanced(event.target.value)}
              multiline
              minRows={12}
              helperText="Mantiene flexible la administración avanzada en v1."
            />
            <Button variant="contained" onClick={save}>Guardar producto</Button>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}
