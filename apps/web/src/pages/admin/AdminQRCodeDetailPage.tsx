import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Grid, Stack, Typography } from "@mui/material";
import { ExternalLink, Pencil } from "lucide-react";
import type { QRCode, QRCodeUrlDestination, QRCodeVCardDestination, QRCodeWhatsappDestination } from "@artenova/shared";
import { Link as RouterLink, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminBackButton, AdminBreadcrumbs, AdminDetailSection, AdminField } from "./adminCrudUi";
import { AdminPageHeader, AdminSection, StatusChip } from "./adminUi";

const qrTypeLabels: Record<QRCode["type"], string> = {
  url: "URL",
  whatsapp: "WhatsApp",
  vcard: "vCard",
};

function renderDestination(qrCode: QRCode) {
  if (qrCode.type === "url") {
    const destination = qrCode.destinationConfig as QRCodeUrlDestination;
    return destination.url;
  }
  if (qrCode.type === "whatsapp") {
    const destination = qrCode.destinationConfig as QRCodeWhatsappDestination;
    return `${destination.phone}${destination.message ? ` | ${destination.message}` : ""}`;
  }
  const destination = qrCode.destinationConfig as QRCodeVCardDestination;
  return [
    destination.fullName,
    destination.company,
    destination.jobTitle,
    destination.phone,
    destination.email,
    destination.website,
    destination.address,
  ].filter(Boolean).join(" | ");
}

function ReadonlyBlock({ value, helper }: { value: string; helper?: string }) {
  return (
    <Stack spacing={0.5}>
      <Box sx={{ p: 1.5, border: "1px solid rgba(64,44,37,.12)", borderRadius: 2, bgcolor: "rgba(255,255,255,.62)", fontFamily: "monospace", overflowWrap: "anywhere" }}>
        {value}
      </Box>
      {helper && (
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
      )}
    </Stack>
  );
}

export function AdminQRCodeDetailPage() {
  const { id } = useParams();
  const [qrCode, setQrCode] = useState<QRCode | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void api.adminQRCode(id)
      .then((item) => {
        if (active) setQrCode(item);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar el QR");
      });
    return () => {
      active = false;
    };
  }, [id]);

  const svgPreviewUrl = useMemo(() => (id ? api.qrCodeSvgUrl(id) : ""), [id]);

  async function toggleStatus() {
    if (!qrCode || !id) return;
    setSaving(true);
    try {
      const updated = await api.updateAdminQRCodeStatus(id, {
        status: qrCode.status === "active" ? "inactive" : "active",
      });
      setQrCode(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "QR", to: "/admin/qrs" }, { label: qrCode?.name ?? "Detalle" }]} />
      <AdminPageHeader
        title={qrCode?.name ?? "QR"}
        subtitle="Revisa el destino, la URL pública y la actividad acumulada antes de descargar o editar."
        action={(
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <AdminBackButton to="/admin/qrs" />
            {id && (
              <Button component={RouterLink} to={`/admin/qrs/${id}/editar`} variant="contained" startIcon={<Pencil size={18} />}>
                Editar
              </Button>
            )}
          </Stack>
        )}
      />
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {qrCode && (
        <>
          <AdminDetailSection title="Resumen">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <AdminField label="Estado" value={<StatusChip status={qrCode.status} />} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <AdminField label="Tipo" value={qrTypeLabels[qrCode.type]} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <AdminField label="Escaneos" value={String(qrCode.scanCount)} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AdminField label="Token" value={<ReadonlyBlock value={qrCode.token} helper="Generado automáticamente." />} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AdminField label="Último escaneo" value={qrCode.lastScannedAt ? new Date(qrCode.lastScannedAt).toLocaleString("es-PA") : "Sin escaneos"} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <AdminField label="URL pública" value={<ReadonlyBlock value={qrCode.publicUrl} helper="Solo lectura." />} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <AdminField label="Destino configurado" value={renderDestination(qrCode)} />
              </Grid>
              {qrCode.resolvedTarget && (
                <Grid size={{ xs: 12 }}>
                  <AdminField label="Destino resuelto" value={qrCode.resolvedTarget} />
                </Grid>
              )}
            </Grid>
          </AdminDetailSection>

          <AdminSection
            title="Código"
            action={(
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button component="a" href={api.qrCodePngUrl(qrCode.id, true)} variant="outlined">Descargar PNG</Button>
                <Button component="a" href={api.qrCodeSvgUrl(qrCode.id, true)} variant="outlined">Descargar SVG</Button>
                <Button component="a" href={qrCode.publicUrl} target="_blank" rel="noreferrer" variant="outlined" startIcon={<ExternalLink size={16} />}>
                  Abrir QR
                </Button>
                <Button onClick={() => void toggleStatus()} disabled={saving} variant="contained" color={qrCode.status === "active" ? "inherit" : "primary"}>
                  {qrCode.status === "active" ? "Inactivar" : "Activar"}
                </Button>
              </Stack>
            )}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ xs: "flex-start", md: "center" }}>
              <Box component="img" src={svgPreviewUrl} alt={`QR ${qrCode.name}`} sx={{ width: 260, maxWidth: "100%", borderRadius: 2, border: "1px solid rgba(64,44,37,.10)", bgcolor: "#fff", p: 1.5 }} />
              <Stack spacing={1}>
                <Typography color="text.secondary">
                  Color principal: {qrCode.designConfig.foregroundColor} | Fondo: {qrCode.designConfig.transparentBackground ? "Transparente" : qrCode.designConfig.backgroundColor}
                </Typography>
                <Typography color="text.secondary">
                  Margen: {qrCode.designConfig.margin}
                </Typography>
                {!qrCode.designConfig.transparentBackground && (
                  <Typography color="text.secondary">
                    Color de fondo visible: {qrCode.designConfig.backgroundColor}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </AdminSection>
        </>
      )}
    </Stack>
  );
}
