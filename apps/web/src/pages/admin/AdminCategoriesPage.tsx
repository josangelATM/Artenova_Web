import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { Plus } from "lucide-react";
import type { Category } from "@artenova/shared";
import { api } from "../../lib/api";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusChip, adminSurfaceSx } from "./adminUi";

const emptyCategory = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
};

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyCategory);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((category) => [category.name, category.slug, category.description ?? ""].some((value) => value.toLowerCase().includes(term)));
  }, [categories, query]);

  async function load() {
    setCategories(await api.adminCategories());
  }

  useEffect(() => {
    void load();
  }, []);

  function reset() {
    setSelectedId("");
    setDraft(emptyCategory);
    setMessage("");
    setError("");
  }

  function select(category: Category) {
    setSelectedId(category.id);
    setDraft({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      isActive: category.isActive,
    });
    setMessage("");
    setError("");
  }

  async function save() {
    try {
      setError("");
      await api.saveAdminCategory({ id: selectedId || undefined, ...draft });
      const nextMessage = selectedId ? "Categoría actualizada" : "Categoría guardada";
      reset();
      setMessage(nextMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la categoría");
    }
  }

  async function pause() {
    if (!selectedId) return;
    try {
      setError("");
      await api.pauseAdminCategory(selectedId);
      reset();
      setMessage("Categoría pausada");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pausar la categoría");
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader title="Categorías" subtitle="Colecciones para organizar los productos." action={<Button variant="contained" startIcon={<Plus size={18} />} onClick={reset}>Nueva categoría</Button>} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 2, md: 1 } }}>
          <Paper sx={{ ...adminSurfaceSx, p: 2 }}>
            <Stack spacing={1.5}>
              <TextField size="small" label="Buscar categoría" value={query} onChange={(event) => setQuery(event.target.value)} />
              {filtered.length === 0 ? (
                <AdminEmptyState title="Sin categorías" description="Crea una categoría para organizar el catálogo." />
              ) : (
                filtered.map((category) => (
                  <Button key={category.id} variant={category.id === selectedId ? "contained" : "text"} onClick={() => select(category)} sx={{ justifyContent: "space-between", borderRadius: 2 }}>
                    <Typography noWrap fontWeight={900}>{category.name}</Typography>
                    <StatusChip status={category.isActive ? "active" : "paused"} />
                  </Button>
                ))
              )}
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 1, md: 2 } }}>
          <AdminSection title={selectedId ? "Editar categoría" : "Nueva categoría"} description="Define cómo se agrupan los productos.">
            {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
            <TextField label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <TextField label="Enlace corto" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} helperText="Ejemplo: mascotas" />
            <TextField label="Descripción" multiline minRows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            <FormControlLabel control={<Checkbox checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />} label="Activa en tienda" />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={save}>Guardar categoría</Button>
              {selectedId && <Button color="warning" onClick={pause}>Pausar</Button>}
            </Stack>
          </AdminSection>
        </Grid>
      </Grid>
    </Stack>
  );
}
