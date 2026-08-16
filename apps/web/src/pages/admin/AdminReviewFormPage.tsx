import { useEffect, useState } from "react";
import { Box, Button, Grid, MenuItem, Rating, Stack, TextField, Typography } from "@mui/material";
import type { Product } from "@artenova/shared";
import { useNavigate, useParams } from "react-router-dom";
import { toastNavigationState, useToast } from "../../components/ToastProvider";
import { api } from "../../lib/api";
import { clearFormErrorField, createFormErrorState, emptyFormErrorState, getFieldError } from "../../lib/formErrors";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";
import { AdminFormErrorAlert } from "./adminFormErrors";
import { AdminPageHeader, AdminSection } from "./adminUi";

const emptyReview = {
  productId: "",
  rating: 5,
  customerName: "",
  comment: "",
  isApproved: true,
};

const fieldLabels: Record<string, string> = {
  productId: "Producto",
  rating: "Calificación",
  customerName: "Nombre visible",
  comment: "Comentario",
  isApproved: "Estado",
};

export function AdminReviewFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(emptyReview);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(emptyFormErrorState);
  const isEdit = Boolean(id);

  function updateField<K extends keyof typeof emptyReview>(field: K, value: (typeof emptyReview)[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError((current) => clearFormErrorField(current, String(field)));
  }

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
          isApproved: review.isApproved,
        });
      } else {
        setDraft((current) => ({ ...current, productId: allProducts[0]?.id ?? "" }));
      }
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setFormError(createFormErrorState(err, { fallbackMessage: "No se pudo cargar la reseña" }));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  async function save() {
    try {
      setSaving(true);
      setFormError(emptyFormErrorState);
      const saved = await api.saveAdminReview({ id, ...draft });
      if (isEdit) {
        setDraft({
          productId: saved.productId,
          rating: saved.rating,
          customerName: saved.customerName,
          comment: saved.comment,
          isApproved: saved.isApproved,
        });
        showToast({ message: "Reseña guardada", severity: "success" });
        return;
      }
      navigate(`/admin/resenas/${saved.id}`, {
        replace: true,
        state: toastNavigationState({ message: "Reseña guardada", severity: "success" }),
      });
    } catch (err) {
      setFormError(createFormErrorState(err, {
        fallbackMessage: "No se pudo guardar la reseña",
        getFieldLabel: (field) => fieldLabels[field] ?? field,
      }));
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
        <AdminFormErrorAlert error={formError} onClose={() => setFormError(emptyFormErrorState)} />
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField fullWidth select disabled={loading} label="Producto" value={draft.productId} onChange={(event) => updateField("productId", event.target.value)} error={Boolean(getFieldError(formError, "productId"))} helperText={getFieldError(formError, "productId")}>
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth select disabled={loading} label="Estado" value={draft.isApproved ? "approved" : "hidden"} onChange={(event) => updateField("isApproved", event.target.value === "approved")} error={Boolean(getFieldError(formError, "isApproved"))} helperText={getFieldError(formError, "isApproved")}>
                <MenuItem value="approved">Publicada</MenuItem>
                <MenuItem value="hidden">Oculta</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", pt: { xs: 0, md: 0.5 } }}>
                <Typography variant="body2" color="text.secondary">Calificación</Typography>
                <Rating value={draft.rating} onChange={(_event, value) => updateField("rating", value ?? 1)} />
                {getFieldError(formError, "rating") ? <Typography variant="caption" color="error">{getFieldError(formError, "rating")}</Typography> : null}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth disabled={loading} label="Nombre visible" value={draft.customerName} onChange={(event) => updateField("customerName", event.target.value)} error={Boolean(getFieldError(formError, "customerName"))} helperText={getFieldError(formError, "customerName")} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth disabled={loading} label="Comentario" multiline minRows={5} value={draft.comment} onChange={(event) => updateField("comment", event.target.value)} error={Boolean(getFieldError(formError, "comment"))} helperText={getFieldError(formError, "comment")} />
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
