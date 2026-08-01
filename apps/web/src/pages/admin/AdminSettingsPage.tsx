import { useEffect, useState } from "react";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import type { SiteSettings } from "@artenova/shared";
import { api } from "../../lib/api";

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void api.settings().then(setSettings);
  }, []);

  if (!settings) return null;

  async function save() {
    if (!settings) return;
    setSettings(await api.updateSettings(settings));
    setSaved(true);
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={900}>Ajustes públicos</Typography>
        {saved && <Alert severity="success" onClose={() => setSaved(false)}>Ajustes guardados</Alert>}
        <TextField label="Marca" value={settings.brandName} onChange={(event) => setSettings({ ...settings, brandName: event.target.value })} />
        <TextField label="Título de inicio" value={settings.heroTitle} onChange={(event) => setSettings({ ...settings, heroTitle: event.target.value })} />
        <TextField label="Subtítulo de inicio" value={settings.heroSubtitle} onChange={(event) => setSettings({ ...settings, heroSubtitle: event.target.value })} />
        <TextField label="Banner" value={settings.bannerText} onChange={(event) => setSettings({ ...settings, bannerText: event.target.value })} />
        <TextField label="WhatsApp" value={settings.whatsapp} onChange={(event) => setSettings({ ...settings, whatsapp: event.target.value })} />
        <TextField label="Email" value={settings.email ?? ""} onChange={(event) => setSettings({ ...settings, email: event.target.value })} />
        <TextField label="Dirección" value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} />
        <Button variant="contained" onClick={save}>Guardar ajustes</Button>
      </Stack>
    </Paper>
  );
}
