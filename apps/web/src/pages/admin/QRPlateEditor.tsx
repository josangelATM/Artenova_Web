import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Grid, Stack, TextField, Typography } from "@mui/material";
import { qrCodePlateSchema, type QRCodePlate } from "@artenova/shared";
import { api } from "../../lib/api";
import { AdminSection } from "./adminUi";

export function QRPlateEditor({ id, enabled, value, onToggle, onChange, fieldError }: {
  id?: string;
  enabled: boolean;
  value: QRCodePlate;
  onToggle: (enabled: boolean) => void;
  onChange: (value: QRCodePlate) => void;
  fieldError: (field: string) => string | undefined;
}) {
  const [preview, setPreview] = useState("");
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);
  useEffect(() => {
    revision.current++;
    setPreview("");
    setError("");
  }, [value, enabled, id]);
  useEffect(() => () => { revision.current++; }, []);

  async function generate() {
    const version = revision.current;
    setLoading(true);
    setError("");
    try {
      const result = await api.previewQRPlate(id, value);
      if (version !== revision.current) return;
      setPreview(result.svg);
      setGenerated(true);
    } catch (err) {
      if (version === revision.current) setError(err instanceof Error ? err.message : "No se pudo generar la placa");
    } finally {
      setLoading(false);
    }
  }

  return <AdminSection title="Placa con QR">
    <Stack spacing={2}>
      <FormControlLabel label="Habilitar placa con QR" control={<Checkbox checked={enabled} onChange={(event) => onToggle(event.target.checked)} />} />
      {enabled && <>
        <TextField fullWidth multiline label="Mensaje de la placa" value={value.message} onChange={(event) => onChange({ ...value, message: event.target.value })}
          slotProps={{ htmlInput: { maxLength: 120 } }} error={Boolean(fieldError("message"))} helperText={fieldError("message") ?? `${value.message.length}/120 caracteres`} />
        {value.contacts.map((contact, index) => <Grid container spacing={2} key={index}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth multiline minRows={2} label={`Nombre del contacto ${index + 1}`} value={contact.name}
            slotProps={{ htmlInput: { maxLength: 60 } }} error={Boolean(fieldError(`contacts.${index}.name`))} helperText={fieldError(`contacts.${index}.name`)}
            onChange={(event) => onChange({ ...value, contacts: value.contacts.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label={`Teléfono del contacto ${index + 1}`} value={contact.phone}
            slotProps={{ htmlInput: { maxLength: 32 } }} error={Boolean(fieldError(`contacts.${index}.phone`))} helperText={fieldError(`contacts.${index}.phone`)}
            onChange={(event) => onChange({ ...value, contacts: value.contacts.map((item, i) => i === index ? { ...item, phone: event.target.value } : item) })} /></Grid>
        </Grid>)}
        <Button sx={{ alignSelf: "flex-start" }} onClick={() => onChange({ ...value, contacts: value.contacts.length === 1 ? [...value.contacts, { name: "", phone: "" }] : value.contacts.slice(0, 1) })}>
          {value.contacts.length === 1 ? "Agregar segundo contacto" : "Quitar segundo contacto"}
        </Button>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="color" label="Fondo de la placa" value={value.backgroundColor} error={Boolean(fieldError("backgroundColor"))} helperText={fieldError("backgroundColor")}
            onChange={(event) => onChange({ ...value, backgroundColor: event.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="color" label="Color del contenido de la placa" value={value.foregroundColor} error={Boolean(fieldError("foregroundColor"))} helperText={fieldError("foregroundColor")}
            onChange={(event) => onChange({ ...value, foregroundColor: event.target.value })} /></Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary">Guarda los cambios antes de descargar la placa.</Typography>
        <Button variant="outlined" sx={{ alignSelf: "flex-start" }} disabled={loading || !qrCodePlateSchema.safeParse(value).success} onClick={() => void generate()}>
          {loading ? "Generando placa…" : generated ? "Actualizar vista previa de la placa" : "Generar vista previa de la placa"}
        </Button>
        {!qrCodePlateSchema.safeParse(value).success && <Typography color="text.secondary">Completa el mensaje y todos los contactos de la placa.</Typography>}
        {generated && !preview && <Typography color="text.secondary">La vista previa de la placa quedó desactualizada. Vuelve a generarla para revisar los cambios.</Typography>}
        {error && <Alert severity="error">{error}</Alert>}
        {preview && <Box component="img" alt="Vista previa de la placa" src={`data:image/svg+xml;utf8,${encodeURIComponent(preview)}`} sx={{ width: "100%", maxWidth: 700, borderRadius: 1 }} />}
      </>}
    </Stack>
  </AdminSection>;
}
