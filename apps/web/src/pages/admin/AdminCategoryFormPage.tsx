import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, Grid, Stack, TextField } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, AdminSection } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";

const emptyCategory = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
};

export function AdminCategoryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(emptyCategory);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(id);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    void api.adminCategory(id)
      .then((category) => {
        if (!active) return;
        setDraft({
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          isActive: category.isActive,
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la categoría");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function save() {
    try {
      setSaving(true);
      setError("");
      const saved = await api.saveAdminCategory({ id, ...draft });
      navigate(`/admin/categorias/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la categoría");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Categorías", to: "/admin/categorias" }, { label: isEdit ? "Editar" : "Nueva" }]} />
      <AdminPageHeader
        title={isEdit ? "Editar categoría" : "Nueva categoría"}
        subtitle="Usa una ficha dedicada para editar sin mezclar listado y formulario."
        action={<AdminBackButton to={id ? `/admin/categorias/${id}` : "/admin/categorias"} />}
      />
      <AdminSection title="Datos generales" description="Define cómo se agrupan los productos en el catálogo.">
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth disabled={loading} label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth disabled={loading} label="Enlace corto" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} helperText="Ejemplo: mascotas" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel disabled={loading} control={<Checkbox checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />} label="Activa en tienda" />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth disabled={loading} label="Descripción" multiline minRows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </Grid>
          </Grid>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={() => void save()} disabled={loading || saving}>
              {saving ? "Guardando..." : "Guardar categoría"}
            </Button>
            <AdminBackButton to={id ? `/admin/categorias/${id}` : "/admin/categorias"} label="Cancelar" />
          </Stack>
        </Stack>
      </AdminSection>
    </Stack>
  );
}
