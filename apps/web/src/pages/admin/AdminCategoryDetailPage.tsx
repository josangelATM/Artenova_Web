import { useEffect, useState } from "react";
import { Alert, Button, Stack } from "@mui/material";
import { Pencil, PauseCircle } from "lucide-react";
import type { Category } from "@artenova/shared";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, StatusChip } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs, AdminDetailSection, AdminField } from "./adminCrudUi";

export function AdminCategoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    void api.adminCategory(id)
      .then((item) => {
        if (active) setCategory(item);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar la categoría");
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function pause() {
    if (!category) return;
    try {
      const updated = await api.pauseAdminCategory(category.id);
      setCategory(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pausar la categoría");
    }
  }

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Categorías", to: "/admin/categorias" }, { label: category?.name ?? "Detalle" }]} />
      <AdminPageHeader
        title={category?.name ?? "Categoría"}
        subtitle="Vista de detalle para revisar la información antes de editar."
        action={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <AdminBackButton to="/admin/categorias" />
            {id && (
              <Button component={RouterLink} to={`/admin/categorias/${id}/editar`} variant="contained" startIcon={<Pencil size={18} />}>
                Editar
              </Button>
            )}
          </Stack>
        }
      />
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {category && (
        <>
          <AdminDetailSection title="Resumen">
            <AdminField label="Nombre" value={category.name} />
            <AdminField label="Enlace corto" value={category.slug} />
            <AdminField label="Estado" value={<StatusChip status={category.isActive ? "active" : "paused"} />} />
            <AdminField label="Descripción" value={category.description || "Sin descripción"} />
          </AdminDetailSection>
          {category.isActive && (
            <Button variant="outlined" color="warning" startIcon={<PauseCircle size={18} />} onClick={() => void pause()}>
              Pausar categoría
            </Button>
          )}
        </>
      )}
      {!category && !error && <AdminBackButton to="/admin/categorias" label="Volver al listado" />}
    </Stack>
  );
}
