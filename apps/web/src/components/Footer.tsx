import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Box, Button, Container, Divider, Grid, Stack, Typography } from "@mui/material";
import { Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { SiteSettings } from "@artenova/shared";
import { api } from "../lib/api";
import { whatsappHref } from "../lib/contact";

export function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    void api.settings().then(setSettings);
  }, []);

  const whatsappUrl = whatsappHref(settings?.whatsapp);

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "primary.dark",
        color: "primary.contrastText",
        mt: { xs: 5, md: 8 },
        py: { xs: 4, md: 5 },
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={{ xs: 3, md: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1.25}>
              <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: 28, md: 34 } }}>
                {settings?.brandName ?? "Artenova"}
              </Typography>
              <Typography sx={{ maxWidth: 420, opacity: 0.86 }}>
                {settings?.heroSubtitle ?? "Taller creativo de corte y grabado láser para regalos personalizados."}
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Stack spacing={1.35}>
              <Typography fontWeight={900}>Contacto</Typography>
              {settings?.address && <FooterInfo icon={<MapPin size={18} />} text={settings.address} />}
              {settings?.businessHours && <FooterInfo icon={<Clock size={18} />} text={settings.businessHours} />}
              {settings?.email && (
                <Stack component="a" href={`mailto:${settings.email}`} direction="row" spacing={1} alignItems="center" sx={{ minHeight: 44 }}>
                  <Mail size={18} />
                  <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{settings.email}</Typography>
                </Stack>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Stack spacing={0.5}>
              <Typography fontWeight={900} mb={0.75}>Tienda</Typography>
              <FooterLink to="/">Inicio</FooterLink>
              <FooterLink to="/catalogo">Catálogo</FooterLink>
              <FooterLink to="/contacto">Contacto</FooterLink>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1.5} alignItems="stretch">
              <Typography fontWeight={900}>Consulta por WhatsApp</Typography>
              <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1.25}>
                {whatsappUrl && (
                  <Button href={whatsappUrl} target="_blank" rel="noreferrer" color="secondary" variant="contained" startIcon={<MessageCircle size={18} />}>
                    WhatsApp
                  </Button>
                )}
                {settings?.mapsUrl && (
                  <Button href={settings.mapsUrl} target="_blank" rel="noreferrer" color="inherit" variant="outlined" startIcon={<MapPin size={18} />}>
                    Cómo llegar
                  </Button>
                )}
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: "rgba(255,255,255,.2)", my: 3 }} />
        <Typography variant="caption" sx={{ opacity: 0.74 }}>
          © {new Date().getFullYear()} {settings?.brandName ?? "Artenova"}. Todos los derechos reservados.
        </Typography>
      </Container>
    </Box>
  );
}

function FooterInfo({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minHeight: 44 }}>
      <Box sx={{ pt: 0.15, flexShrink: 0 }}>{icon}</Box>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Typography component={Link} to={to} variant="body2" sx={{ display: "flex", alignItems: "center", minHeight: 38 }}>
      {children}
    </Typography>
  );
}
