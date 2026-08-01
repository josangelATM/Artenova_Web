import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { Plus } from "lucide-react";
import type { Tag } from "@artenova/shared";
import { api } from "../../lib/api";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusChip, adminSurfaceSx } from "./adminUi";

const emptyTag = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
};

export function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyTag);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return tags;
    return tags.filter((tag) => [tag.name, tag.slug, tag.description ?? ""].some((value) => value.toLowerCase().includes(term)));
  }, [tags, query]);

  async function load() {
    setTags(await api.adminTags());
  }

  useEffect(() => {
    void load();
  }, []);

  function reset() {
    setSelectedId("");
    setDraft(emptyTag);
    setMessage("");
    setError("");
  }

  function select(tag: Tag) {
    setSelectedId(tag.id);
    setDraft({
      name: tag.name,
      slug: tag.slug,
      description: tag.description ?? "",
      isActive: tag.isActive,
    });
    setMessage("");
    setError("");
  }

  async function save() {
    try {
      setError("");
      await api.saveAdminTag({ id: selectedId || undefined, ...draft });
      const nextMessage = selectedId ? "Etiqueta actualizada" : "Etiqueta guardada";
      reset();
      setMessage(nextMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la etiqueta");
    }
  }

  async function pause() {
    if (!selectedId) return;
    try {
      setError("");
      await api.pauseAdminTag(selectedId);
      reset();
      setMessage("Etiqueta pausada");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pausar la etiqueta");
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader title="Etiquetas" subtitle="Palabras para filtrar y destacar productos." action={<Button variant="contained" startIcon={<Plus size={18} />} onClick={reset}>Nueva etiqueta</Button>} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 2, md: 1 } }}>
          <Paper sx={{ ...adminSurfaceSx, p: 2 }}>
            <Stack spacing={1.5}>
              <TextField size="small" label="Buscar etiqueta" value={query} onChange={(event) => setQuery(event.target.value)} />
              {filtered.length === 0 ? (
                <AdminEmptyState title="Sin etiquetas" description="Crea etiquetas para filtrar el catálogo." />
              ) : (
                filtered.map((tag) => (
                  <Button key={tag.id} variant={tag.id === selectedId ? "contained" : "text"} onClick={() => select(tag)} sx={{ justifyContent: "space-between", borderRadius: 2 }}>
                    <Typography noWrap fontWeight={900}>{tag.name}</Typography>
                    <StatusChip status={tag.isActive ? "active" : "paused"} />
                  </Button>
                ))
              )}
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 1, md: 2 } }}>
          <AdminSection title={selectedId ? "Editar etiqueta" : "Nueva etiqueta"} description="Ayudan a filtrar y destacar productos.">
            {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
            <TextField label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <TextField label="Enlace corto" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} helperText="Ejemplo: regalo" />
            <TextField label="Descripción" multiline minRows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            <FormControlLabel control={<Checkbox checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />} label="Activa en tienda" />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={save}>Guardar etiqueta</Button>
              {selectedId && <Button color="warning" onClick={pause}>Pausar</Button>}
            </Stack>
          </AdminSection>
        </Grid>
      </Grid>
    </Stack>
  );
}
