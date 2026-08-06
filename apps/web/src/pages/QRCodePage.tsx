import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, Typography } from "@mui/material";
import type { QRCodeResolveResponse, QRCodeVCardDestination } from "@artenova/shared";
import { Download, ExternalLink } from "lucide-react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { applySeo } from "../lib/seo";

type ResolveState =
  | { mode: "loading" }
  | { mode: "error"; message: string }
  | { mode: "redirect"; payload: QRCodeResolveResponse }
  | { mode: "vcard"; payload: QRCodeResolveResponse & { vcard: QRCodeVCardDestination } };

export function QRCodePage() {
  const { token = "" } = useParams();
  const [state, setState] = useState<ResolveState>({ mode: "loading" });

  useEffect(() => {
    applySeo({
      title: "QR Artenova",
      description: "Resolución pública de códigos QR de Artenova.",
      path: `/q/${token}`,
      robots: "noindex,nofollow",
      type: "website",
    });
  }, [token]);

  useEffect(() => {
    let active = true;

    void api.resolveQRCode(token).then((response) => {
      if (!active) return;

      if (!response.ok) {
        const message = response.status === 410
          ? "Este QR está inactivo."
          : response.status === 404
            ? "No encontramos este QR."
            : "No se pudo resolver este QR.";
        setState({ mode: "error", message });
        return;
      }

      const payload = response.data as QRCodeResolveResponse;
      if ((payload.type === "url" || payload.type === "whatsapp") && payload.targetUrl) {
        setState({ mode: "redirect", payload });
        window.location.replace(payload.targetUrl);
        return;
      }

      if (payload.type === "vcard" && payload.vcard) {
        setState({ mode: "vcard", payload: payload as QRCodeResolveResponse & { vcard: QRCodeVCardDestination } });
        return;
      }

      setState({ mode: "error", message: "Este QR no tiene un destino válido." });
    });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 9 } }}>
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid rgba(64,44,37,.10)", boxShadow: "0 16px 40px rgba(64,44,37,.08)" }}>
        {state.mode === "loading" && (
          <Stack spacing={2} alignItems="center" textAlign="center">
            <CircularProgress />
            <Typography variant="h5" fontWeight={900}>Abriendo QR</Typography>
            <Typography color="text.secondary">Estamos verificando el destino configurado.</Typography>
          </Stack>
        )}

        {state.mode === "error" && (
          <Stack spacing={2}>
            <Alert severity="warning">{state.message}</Alert>
            <Typography color="text.secondary">
              Si este código debería funcionar, revisa su estado desde el panel admin de Artenova.
            </Typography>
          </Stack>
        )}

        {state.mode === "redirect" && (
          <Stack spacing={2} alignItems="center" textAlign="center">
            <CircularProgress />
            <Typography variant="h5" fontWeight={900}>Redirigiendo…</Typography>
            <Typography color="text.secondary">
              Si tu navegador no continúa automáticamente, usa el botón manual.
            </Typography>
            {state.payload.targetUrl && (
              <Button component="a" href={state.payload.targetUrl} target="_blank" rel="noreferrer" variant="contained" startIcon={<ExternalLink size={18} />}>
                Abrir destino
              </Button>
            )}
          </Stack>
        )}

        {state.mode === "vcard" && (
          <Stack spacing={2.25}>
            <Typography variant="h4" fontWeight={900}>{state.payload.vcard.fullName}</Typography>
            {state.payload.vcard.jobTitle && <Typography>{state.payload.vcard.jobTitle}</Typography>}
            {state.payload.vcard.company && <Typography color="text.secondary">{state.payload.vcard.company}</Typography>}

            <Stack spacing={1}>
              {state.payload.vcard.phone && <Typography>Teléfono: {state.payload.vcard.phone}</Typography>}
              {state.payload.vcard.email && <Typography>Email: {state.payload.vcard.email}</Typography>}
              {state.payload.vcard.website && <Typography>Sitio web: {state.payload.vcard.website}</Typography>}
              {state.payload.vcard.address && <Typography>Dirección: {state.payload.vcard.address}</Typography>}
            </Stack>

            <Box>
              <Button component="a" href={api.qrVCardUrl(token)} variant="contained" startIcon={<Download size={18} />}>
                Guardar contacto
              </Button>
            </Box>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
