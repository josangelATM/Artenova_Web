import { useEffect, useState } from "react";
import { Button, Checkbox, FormControlLabel, Grid, Stack, TextField } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { clearFormErrorField, createFormErrorState, emptyFormErrorState, getFieldError } from "../../lib/formErrors";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";
import { AdminFormErrorAlert } from "./adminFormErrors";
import { AdminPageHeader, AdminSection } from "./adminUi";

const emptyCategory = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
};

const fieldLabels: Record<string, string> = {
  name: "Nombre",
  slug: "Enlace corto",
  description: "Descripción",
  isActive: "Estado",
};

export function AdminCategoryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(emptyCategory);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(emptyFormErrorState);
  const isEdit = Boolean(id);

  function updateField<K extends keyof typeof emptyCategory>(field: K, value: (typeof emptyCategory)[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError((current) => clearFormErrorField(current, String(field)));
  }

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
        setFormError(createFormErrorState(err, { fallbackMessage: "No se pudo cargar la categoría" }));
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
      setFormError(emptyFormErrorState);
      const saved = await api.saveAdminCategory({ id, ...draft });
      navigate(`/admin/categorias/${saved.id}`, { replace: true });
    } catch (err) {
      setFormError(createFormErrorState(err, {
        fallbackMessage: "No se pudo guardar la categoría",
        getFieldLabel: (field) => fieldLabels[field] ?? field,
      }));
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
        <AdminFormErrorAlert error={formError} onClose={() => setFormError(emptyFormErrorState)} />
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth disabled={loading} label="Nombre" value={draft.name} onChange={(event) => updateField("name", event.target.value)} error={Boolean(getFieldError(formError, "name"))} helperText={getFieldError(formError, "name")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth disabled={loading} label="Enlace corto" value={draft.slug} onChange={(event) => updateField("slug", event.target.value)} error={Boolean(getFieldError(formError, "slug"))} helperText={getFieldError(formError, "slug") || "Ejemplo: mascotas"} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel disabled={loading} control={<Checkbox checked={draft.isActive} onChange={(event) => updateField("isActive", event.target.checked)} />} label="Activa en tienda" />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth disabled={loading} label="Descripción" multiline minRows={4} value={draft.description} onChange={(event) => updateField("description", event.target.value)} error={Boolean(getFieldError(formError, "description"))} helperText={getFieldError(formError, "description")} />
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
