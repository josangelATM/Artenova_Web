import { useMemo, useState } from "react";
import { Alert, Box, Button, Divider, Grid, Paper, Rating, Stack, TextField, Typography } from "@mui/material";
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la reseña");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper sx={{ p: { xs: 2.25, md: 3 }, border: "1px solid rgba(64,44,37,.10)" }}>
      <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2.25}>
            <Box>
              <Typography variant="h4" sx={{ fontSize: { xs: 28, md: 36 }, overflowWrap: "anywhere" }}>
                Reseñas
              </Typography>
              <Stack direction="row" spacing={1.25} alignItems="center" mt={0.75}>
                <Rating value={product.reviewSummary.averageRating} precision={0.5} readOnly />
                <Typography color="text.secondary">{summaryText}</Typography>
              </Stack>
            </Box>

            <Stack spacing={1.5}>
              {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
              {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
              <Rating value={rating} onChange={(_, value) => setRating(value)} />
              <TextField label="Tu nombre" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
              <TextField label="Comentario" value={comment} onChange={(event) => setComment(event.target.value)} multiline minRows={3} />
              <Button variant="contained" startIcon={<Send size={18} />} disabled={submitting || !rating} onClick={submitReview}>
                {submitting ? "Publicando..." : "Publicar reseña"}
              </Button>
            </Stack>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={1.75} divider={<Divider flexItem />}>
            {product.reviews.length === 0 ? (
              <Box sx={{ py: { xs: 1, md: 4 } }}>
                <Typography fontWeight={900}>Sé la primera persona en reseñar este producto.</Typography>
                <Typography color="text.secondary">Una opinión corta ayuda a otros clientes a elegir mejor.</Typography>
              </Box>
            ) : (
              product.reviews.map((review) => (
                <Stack key={review.id} spacing={0.75}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.75}>
                    <Typography fontWeight={900} sx={{ overflowWrap: "anywhere" }}>{review.customerName}</Typography>
                    <Rating value={review.rating} readOnly size="small" />
                  </Stack>
                  <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{review.comment}</Typography>
                </Stack>
              ))
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}
