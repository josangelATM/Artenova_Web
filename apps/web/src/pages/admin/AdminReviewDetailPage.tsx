import { useEffect, useState } from "react";
import { Alert, Button, Rating, Stack } from "@mui/material";
import { EyeOff, Pencil } from "lucide-react";
import type { ProductReview } from "@artenova/shared";
import { Link as RouterLink, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, StatusChip } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs, AdminDetailSection, AdminField } from "./adminCrudUi";

export function AdminReviewDetailPage() {
  const { id } = useParams();
  const [review, setReview] = useState<ProductReview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    void api.adminReview(id)
      .then((item) => {
        if (active) setReview(item);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar la reseña");
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function toggleApproval() {
    if (!review) return;
    try {
      const updated = await api.setAdminReviewApproval(review.id, !review.isApproved);
      setReview(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    }
  }

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Reseñas", to: "/admin/resenas" }, { label: review?.customerName ?? "Detalle" }]} />
      <AdminPageHeader
        title={review?.customerName ?? "Reseña"}
        subtitle="Revisión completa de la opinión y su contexto."
        action={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <AdminBackButton to="/admin/resenas" />
            {id && (
              <Button component={RouterLink} to={`/admin/resenas/${id}/editar`} variant="contained" startIcon={<Pencil size={18} />}>
                Editar
              </Button>
            )}
          </Stack>
        }
      />
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {review && (
        <>
          <AdminDetailSection title="Resumen">
            <AdminField label="Producto" value={review.productName ?? review.productId} />
            <AdminField label="Estado" value={<StatusChip status={review.isApproved ? "approved" : "hidden"} />} />
            <AdminField label="Calificación" value={<Rating value={review.rating} readOnly size="small" />} />
            <AdminField label="Comentario" value={review.comment} />
            <AdminField label="Fecha" value={new Date(review.createdAt).toLocaleString("es-PA")} />
          </AdminDetailSection>
          <Button variant="outlined" startIcon={<EyeOff size={18} />} onClick={() => void toggleApproval()}>
            {review.isApproved ? "Ocultar reseña" : "Publicar reseña"}
          </Button>
        </>
      )}
    </Stack>
  );
}
