import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import type { Category } from "@artenova/shared";
import { api } from "../../lib/api";

const emptyCategory = {
  name: "",
  slug: "",
  description: "",
  accentColor: "#b982d9",
  isActive: true
};

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyCategory);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setCategories(await api.adminCategories());
  }

  useEffect(() => {
    void load();
  }, []);

  function select(category: Category) {
    setSelectedId(category.id);
    setDraft({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      accentColor: category.accentColor ?? "#b982d9",
      isActive: category.isActive
    });
    setMessage("");
    setError("");
  }

  async function save() {
    try {
      setError("");
      await api.saveAdminCategory({ id: selectedId || undefined, ...draft });
      setMessage("Categoría guardada");
      setSelectedId("");
      setDraft(emptyCategory);
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
      setMessage("Categoría pausada");
      setSelectedId("");
      setDraft(emptyCategory);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pausar la categoría");
    }
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Button variant="contained" onClick={() => { setSelectedId(""); setDraft(emptyCategory); }}>
              Nueva categoría
            </Button>
            {categories.map((category) => (
              <Button key={category.id} color={category.id === selectedId ? "secondary" : "primary"} onClick={() => select(category)} sx={{ justifyContent: "space-between" }}>
                <span>{category.name}</span>
                <span>{category.isActive ? "Activa" : "Pausada"}</span>
              </Button>
            ))}
          </Stack>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={900}>{selectedId ? "Editar categoría" : "Nueva categoría"}</Typography>
            {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
            <TextField label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <TextField label="Slug" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} helperText="Se usa en filtros y URLs. Ejemplo: mascotas" />
            <TextField label="Descripción" multiline minRows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            <TextField label="Color de acento" value={draft.accentColor ?? ""} onChange={(event) => setDraft({ ...draft, accentColor: event.target.value })} />
            <FormControlLabel control={<Checkbox checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />} label="Activa en tienda" />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={save}>Guardar categoría</Button>
              {selectedId && <Button color="warning" onClick={pause}>Pausar</Button>}
            </Stack>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}

