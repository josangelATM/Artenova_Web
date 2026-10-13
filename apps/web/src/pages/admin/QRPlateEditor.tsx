import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { qrCodePlateSchema, qrPlateSizeOptions, type QRCodePlate } from "@artenova/shared";
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
        <TextField select fullWidth label="Tamaño de la plaquita" value={value.size}
          error={Boolean(fieldError("size"))} helperText={fieldError("size")}
          onChange={(event) => onChange({ ...value, size: event.target.value as QRCodePlate["size"] })}>
          {qrPlateSizeOptions.map((option) => <MenuItem key={option.value} value={option.value}>
            {option.label} — {option.widthMm.toFixed(2).replace(".", ",")} × {option.heightMm.toFixed(2).replace(".", ",")} mm
          </MenuItem>)}
        </TextField>
        <TextField fullWidth multiline label="Mensaje de la placa" value={value.message} onChange={(event) => onChange({ ...value, message: event.target.value })}
          slotProps={{ htmlInput: { maxLength: 120 } }} error={Boolean(fieldError("message"))} helperText={fieldError("message") ?? `${value.message.length}/120 caracteres`} />
        <TextField fullWidth multiline minRows={5} label="Datos de contacto" value={value.contactText}
          slotProps={{ htmlInput: { maxLength: 200 } }} error={Boolean(fieldError("contactText"))}
          helperText={fieldError("contactText") ?? `${value.contactText.length}/200 caracteres`}
          onChange={(event) => onChange({ ...value, contactText: event.target.value })} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="color" label="Color del texto y QR" value={value.foregroundColor}
            error={Boolean(fieldError("foregroundColor"))} helperText={fieldError("foregroundColor")}
            onChange={(event) => onChange({ ...value, foregroundColor: event.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="color" label="Fondo de la plaquita" value={value.backgroundColor}
            disabled={value.transparentBackground} error={Boolean(fieldError("backgroundColor"))} helperText={fieldError("backgroundColor")}
            onChange={(event) => onChange({ ...value, backgroundColor: event.target.value })} /></Grid>
        </Grid>
        <FormControlLabel label="Fondo transparente de la plaquita" control={<Checkbox checked={value.transparentBackground}
          onChange={(event) => onChange({ ...value, transparentBackground: event.target.checked })} />} />
        <Typography variant="body2" color="text.secondary">Guarda los cambios antes de descargar la placa.</Typography>
        <Button variant="outlined" sx={{ alignSelf: "flex-start" }} disabled={loading || !qrCodePlateSchema.safeParse(value).success} onClick={() => void generate()}>
          {loading ? "Generando placa…" : generated ? "Actualizar vista previa de la placa" : "Generar vista previa de la placa"}
        </Button>
        {!qrCodePlateSchema.safeParse(value).success && <Typography color="text.secondary">Completa el mensaje y los datos de contacto de la placa.</Typography>}
        {generated && !preview && <Typography color="text.secondary">La vista previa de la placa quedó desactualizada. Vuelve a generarla para revisar los cambios.</Typography>}
        {error && <Alert severity="error">{error}</Alert>}
        {preview && <Box component="img" alt="Vista previa de la placa" src={`data:image/svg+xml;utf8,${encodeURIComponent(preview)}`} sx={{ width: "100%", maxWidth: 700, borderRadius: 1, bgcolor: "#263238" }} />}
      </>}
    </Stack>
  </AdminSection>;
}
