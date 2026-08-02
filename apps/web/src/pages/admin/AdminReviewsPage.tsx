import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Grid, IconButton, MenuItem, Paper, Rating, Stack, TextField, Typography } from "@mui/material";
import { CheckCircle2, EyeOff, MessageSquareText, Plus, Trash2 } from "lucide-react";
import type { Product, ProductReview } from "@artenova/shared";
import { api } from "../../lib/api";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusChip, adminSurfaceSx } from "./adminUi";

const emptyReview = {
  productId: "",
  rating: 5,
  customerName: "",
  comment: "",
  isApproved: true
};

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyReview);
  const [status, setStatus] = useState("all");
  const [productFilter, setProductFilter] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(() => reviews.find((review) => review.id === selectedId), [reviews, selectedId]);
  const approvedCount = reviews.filter((review) => review.isApproved).length;
  const hiddenCount = reviews.length - approvedCount;

  async function load() {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (productFilter) params.set("productId", productFilter);
    if (query.trim()) params.set("q", query.trim());
    const [nextReviews, nextProducts] = await Promise.all([api.adminReviews(params), api.adminProducts()]);
    setReviews(nextReviews);
    setProducts(nextProducts);
    setDraft((current) => ({ ...current, productId: current.productId || nextProducts[0]?.id || "" }));
  }

  useEffect(() => {
    void load();
  }, [status, productFilter]);

  useEffect(() => {
    if (!selected) return;
    setDraft({
      productId: selected.productId,
      rating: selected.rating,
      customerName: selected.customerName,
      comment: selected.comment,
      isApproved: selected.isApproved
    });
    setError("");
    setMessage("");
  }, [selected]);

  function resetForm() {
    setSelectedId("");
    setDraft({ ...emptyReview, productId: products[0]?.id ?? "" });
    setError("");
    setMessage("");
  }

  async function save() {
    try {
      setError("");
      await api.saveAdminReview({ ...draft, id: selectedId || undefined });
      setMessage(selectedId ? "Reseña actualizada" : "Reseña creada");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la reseña");
    }
  }

  async function setApproval(review: ProductReview, isApproved: boolean) {
    try {
      setError("");
      await api.setAdminReviewApproval(review.id, isApproved);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    }
  }

  async function remove(review: ProductReview) {
    try {
      setError("");
      await api.deleteAdminReview(review.id);
      if (selectedId === review.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la reseña");
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Reseñas"
        subtitle="Modera opiniones y crea reseñas visibles por producto."
        action={
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={resetForm}>
            Nueva reseña
          </Button>
        }
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ ...adminSurfaceSx, p: 2 }}>
            <Typography variant="body2" color="text.secondary">Total</Typography>
            <Typography variant="h4" fontWeight={900}>{reviews.length}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ ...adminSurfaceSx, p: 2 }}>
            <Typography variant="body2" color="text.secondary">Publicadas</Typography>
            <Typography variant="h4" fontWeight={900}>{approvedCount}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ ...adminSurfaceSx, p: 2 }}>
            <Typography variant="body2" color="text.secondary">Ocultas</Typography>
            <Typography variant="h4" fontWeight={900}>{hiddenCount}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            <Paper sx={{ ...adminSurfaceSx, p: 2 }}>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField select fullWidth size="small" label="Estado" value={status} onChange={(event) => setStatus(event.target.value)}>
                    <MenuItem value="all">Todas</MenuItem>
                    <MenuItem value="approved">Publicadas</MenuItem>
                    <MenuItem value="hidden">Ocultas</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField select fullWidth size="small" label="Producto" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                    <MenuItem value="">Todos</MenuItem>
                    {products.map((product) => (
                      <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" spacing={1}>
                    <TextField fullWidth size="small" label="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} />
                    <Button variant="outlined" onClick={() => void load()}>Filtrar</Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {reviews.length === 0 ? (
              <AdminEmptyState title="Sin reseñas" description="Cuando lleguen opiniones, aparecerán aquí." />
            ) : (
              reviews.map((review) => (
                <Paper key={review.id} sx={{ ...adminSurfaceSx, p: 2, borderColor: review.id === selectedId ? "primary.main" : "rgba(64,44,37,.10)" }}>
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" gap={1.5}>
                      <Box minWidth={0}>
                        <Typography fontWeight={900} sx={{ overflowWrap: "anywhere" }}>{review.customerName}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{review.productName}</Typography>
                      </Box>
                      <StatusChip status={review.isApproved ? "approved" : "hidden"} />
                    </Stack>
                    <Rating value={review.rating} readOnly size="small" />
                    <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{review.comment}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button size="small" variant="outlined" onClick={() => setSelectedId(review.id)}>Editar</Button>
                      {review.isApproved ? (
                        <Button size="small" variant="text" startIcon={<EyeOff size={16} />} onClick={() => void setApproval(review, false)}>Ocultar</Button>
                      ) : (
                        <Button size="small" variant="text" startIcon={<CheckCircle2 size={16} />} onClick={() => void setApproval(review, true)}>Publicar</Button>
                      )}
                      <IconButton aria-label="Eliminar reseña" size="small" onClick={() => void remove(review)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
            <AdminSection
              title={selectedId ? "Editar reseña" : "Nueva reseña"}
              description="Publica una opinión asociada a un producto."
              action={<MessageSquareText size={22} />}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField select fullWidth label="Producto" value={draft.productId} onChange={(event) => setDraft({ ...draft, productId: event.target.value })}>
                    {products.map((product) => (
                      <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Nombre visible" value={draft.customerName} onChange={(event) => setDraft({ ...draft, customerName: event.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select fullWidth label="Estado" value={draft.isApproved ? "approved" : "hidden"} onChange={(event) => setDraft({ ...draft, isApproved: event.target.value === "approved" })}>
                    <MenuItem value="approved">Publicada</MenuItem>
                    <MenuItem value="hidden">Oculta</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Stack spacing={0.75}>
                    <Typography variant="body2" color="text.secondary">Calificación</Typography>
                    <Rating value={draft.rating} onChange={(_, value) => setDraft({ ...draft, rating: value ?? 1 })} />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth multiline minRows={4} label="Comentario" value={draft.comment} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} />
                </Grid>
              </Grid>
              <Button variant="contained" size="large" onClick={save}>
                Guardar reseña
              </Button>
            </AdminSection>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
