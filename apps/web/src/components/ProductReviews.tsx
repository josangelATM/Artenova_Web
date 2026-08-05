import { useMemo, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper, Rating, Stack, TextField, Typography } from "@mui/material";
import { Send } from "lucide-react";
import type { Product, ProductReview } from "@artenova/shared";
import { api } from "../lib/api";

export function ProductReviews({ product, onReviewCreated }: { product: Product; onReviewCreated: (review: ProductReview) => void }) {
  const [rating, setRating] = useState<number | null>(5);
  const [customerName, setCustomerName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const summaryText = useMemo(() => {
    if (product.reviewSummary.reviewCount === 0) return "Sin reseñas todavía";
    return `${product.reviewSummary.averageRating.toFixed(1)} de 5 · ${product.reviewSummary.reviewCount} reseña${product.reviewSummary.reviewCount === 1 ? "" : "s"}`;
  }, [product.reviewSummary.averageRating, product.reviewSummary.reviewCount]);

  async function submitReview() {
    if (!rating) return;
    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      const review = await api.createProductReview(product.slug, { rating, customerName, comment });
      onReviewCreated(review);
      setCustomerName("");
      setComment("");
      setRating(5);
      setMessage("Gracias. Tu reseña ya está publicada.");
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la reseña");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Paper sx={{ p: { xs: 2.25, md: 3 }, border: "1px solid rgba(64,44,37,.10)" }}>
        <Stack spacing={2.25}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1.5}>
            <Box>
              <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 32 }, overflowWrap: "anywhere" }}>
                Reseñas
              </Typography>
              <Stack direction="row" spacing={1.25} alignItems="center" mt={0.75}>
                <Rating value={product.reviewSummary.averageRating} precision={0.5} readOnly />
                <Typography color="text.secondary">{summaryText}</Typography>
              </Stack>
            </Box>
            <Button
              variant="contained"
              startIcon={<Send size={18} />}
              onClick={() => {
                setDialogOpen(true);
                setMessage("");
                setError("");
              }}
            >
              Deja tu reseña
            </Button>
          </Stack>

          <Stack spacing={1.75} divider={<Divider flexItem />}>
            {product.reviews.length === 0 ? (
              <Box sx={{ py: { xs: 1, md: 3 } }}>
                <Typography fontWeight={900}>Aún no hay opiniones publicadas.</Typography>
                <Typography color="text.secondary">Cuéntales a otros clientes cómo fue tu experiencia con este producto.</Typography>
              </Box>
            ) : (
              product.reviews.map((review) => (
                <Stack key={review.id} spacing={0.75}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.75}>
                    <Typography fontWeight={900} sx={{ overflowWrap: "anywhere" }}>{review.customerName}</Typography>
                    <Rating value={review.rating} readOnly size="small" />
                  </Stack>
                  <Typography color="text.secondary" sx={{ overflowWrap: "anywhere", lineHeight: 1.65 }}>{review.comment}</Typography>
                </Stack>
              ))
            )}
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Deja tu reseña</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
            <Typography color="text.secondary">Tu opinión ayuda a otras personas a elegir mejor.</Typography>
            <Rating value={rating} onChange={(_, value) => setRating(value)} />
            <TextField label="Tu nombre" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            <TextField label="Comentario" value={comment} onChange={(event) => setComment(event.target.value)} multiline minRows={4} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="text" disabled={submitting} onClick={() => setDialogOpen(false)}>
            Cerrar
          </Button>
          <Button variant="contained" startIcon={<Send size={18} />} disabled={submitting || !rating} onClick={submitReview}>
            {submitting ? "Publicando..." : "Publicar reseña"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
