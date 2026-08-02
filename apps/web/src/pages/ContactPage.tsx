import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Box, Button, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import { CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { SiteSettings } from "@artenova/shared";
import { api } from "../lib/api";
import { whatsappHref } from "../lib/contact";
import { applySeo } from "../lib/seo";

export function ContactPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    void api.settings().then(setSettings);
  }, []);

  useEffect(() => {
    applySeo({
      title: "Contacto",
      description: "Contacta a Artenova por WhatsApp para consultar regalos personalizados, diseño, disponibilidad y entregas.",
      path: "/contacto",
      type: "website",
    });
  }, []);

  const whatsappUrl = whatsappHref(settings?.whatsapp, "Hola, quiero consultar una pieza personalizada con Artenova.");

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Grid container spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 54 }, lineHeight: 1 }}>
                Contacto
              </Typography>
              <Typography color="text.secondary" mt={1.5}>
                Escríbenos para consultar disponibilidad, entrega o una pieza personalizada.
              </Typography>
            </Box>

            <Stack spacing={1.25}>
              {settings?.address && <ContactInfo icon={<MapPin size={19} />} label="Dirección" value={settings.address} />}
              {settings?.businessHours && <ContactInfo icon={<Clock size={19} />} label="Horario" value={settings.businessHours} />}
              {settings?.whatsapp && <ContactInfo icon={<Phone size={19} />} label="WhatsApp" value={settings.whatsapp} />}
              {settings?.email && <ContactInfo icon={<Mail size={19} />} label="Email" value={settings.email} href={`mailto:${settings.email}`} />}
            </Stack>

            <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1.25} alignItems="stretch">
              {whatsappUrl && (
                <Button href={whatsappUrl} target="_blank" rel="noreferrer" variant="contained" startIcon={<MessageCircle size={18} />}>
                  Contactar por WhatsApp
                </Button>
              )}
              {settings?.mapsUrl && (
                <Button href={settings.mapsUrl} target="_blank" rel="noreferrer" variant="outlined" startIcon={<MapPin size={18} />}>
                  Cómo llegar
                </Button>
              )}
            </Stack>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              border: "1px solid rgba(64,44,37,.1)",
              bgcolor: "rgba(255,250,245,.92)",
            }}
          >
            <Stack spacing={2.25}>
              {!whatsappUrl && (
                <Alert severity="info">
                  WhatsApp no está configurado. {settings?.email ? `Puedes escribir a ${settings.email}.` : "Agrega un número de contacto para activar el contacto directo."}
                </Alert>
              )}

              <Box>
                <Typography variant="h4" fontWeight={900} lineHeight={1.05}>
                  Cuéntanos qué quieres personalizar.
                </Typography>
                <Typography color="text.secondary" mt={1}>
                  Atendemos directo por WhatsApp para coordinar modelos, cantidades, diseño, entrega y cualquier detalle especial.
                </Typography>
              </Box>

              <Stack spacing={1.25}>
                <ContactBullet>Modelo o idea que tienes en mente</ContactBullet>
                <ContactBullet>Nombre, fecha, foto o frase para personalizar</ContactBullet>
                <ContactBullet>Cantidad aproximada y fecha en que lo necesitas</ContactBullet>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                {whatsappUrl && (
                  <Button href={whatsappUrl} target="_blank" rel="noreferrer" variant="contained" size="large" startIcon={<MessageCircle size={18} />}>
                    Abrir WhatsApp
                  </Button>
                )}
                {settings?.email && (
                  <Button href={`mailto:${settings.email}`} variant="outlined" size="large" startIcon={<Mail size={18} />}>
                    Escribir por email
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

function ContactBullet({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <CheckCircle2 size={18} />
      <Typography fontWeight={800}>{children}</Typography>
    </Stack>
  );
}

function ContactInfo({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minHeight: 44 }}>
      <Box sx={{ color: "primary.main", flexShrink: 0, pt: 0.2 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={900}>
          {label}
        </Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>{value}</Typography>
      </Box>
    </Stack>
  );

  if (!href) return content;

  return (
    <Box component="a" href={href}>
      {content}
    </Box>
  );
}
