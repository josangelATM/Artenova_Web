import { useEffect, useState } from "react";
import { Alert, Box, Button, Grid, MenuItem, Rating, Stack, TextField, Typography } from "@mui/material";
import type { Product } from "@artenova/shared";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, AdminSection } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";

const emptyReview = {
  productId: "",
  rating: 5,
  customerName: "",
  comment: "",
  isApproved: true
};

export function AdminReviewFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(emptyReview);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(id);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([api.adminProducts(), id ? api.adminReview(id) : Promise.resolve(null)]).then(([allProducts, review]) => {
      if (!active) return;
      setProducts(allProducts);
      if (review) {
        setDraft({
          productId: review.productId,
          rating: review.rating,
          customerName: review.customerName,
          comment: review.comment,
          isApproved: review.isApproved
        });
      } else {
        setDraft((current) => ({ ...current, productId: allProducts[0]?.id ?? "" }));
      }
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "No se pudo cargar la reseña");
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
      const saved = await api.saveAdminReview({ id, ...draft });
      navigate(`/admin/resenas/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la reseña");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Reseñas", to: "/admin/resenas" }, { label: isEdit ? "Editar" : "Nueva" }]} />
      <AdminPageHeader
        title={isEdit ? "Editar reseña" : "Nueva reseña"}
        subtitle="Crea o ajusta opiniones visibles del catálogo con contexto del producto."
        action={<AdminBackButton to={id ? `/admin/resenas/${id}` : "/admin/resenas"} />}
      />
      <AdminSection title="Contenido" description="Asocia la reseña al producto correcto y revisa su estado de publicación.">
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField fullWidth select disabled={loading} label="Producto" value={draft.productId} onChange={(event) => setDraft({ ...draft, productId: event.target.value })}>
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth select disabled={loading} label="Estado" value={draft.isApproved ? "approved" : "hidden"} onChange={(event) => setDraft({ ...draft, isApproved: event.target.value === "approved" })}>
                <MenuItem value="approved">Publicada</MenuItem>
                <MenuItem value="hidden">Oculta</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", pt: { xs: 0, md: 0.5 } }}>
                <Typography variant="body2" color="text.secondary">Calificación</Typography>
                <Rating value={draft.rating} onChange={(_event, value) => setDraft({ ...draft, rating: value ?? 1 })} />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth disabled={loading} label="Nombre visible" value={draft.customerName} onChange={(event) => setDraft({ ...draft, customerName: event.target.value })} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth disabled={loading} label="Comentario" multiline minRows={5} value={draft.comment} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} />
            </Grid>
          </Grid>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" disabled={loading || saving} onClick={() => void save()}>
              {saving ? "Guardando..." : "Guardar reseña"}
            </Button>
            <AdminBackButton to={id ? `/admin/resenas/${id}` : "/admin/resenas"} label="Cancelar" />
          </Stack>
        </Stack>
      </AdminSection>
    </Stack>
  );
}
