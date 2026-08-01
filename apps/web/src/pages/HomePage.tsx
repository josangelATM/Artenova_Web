import { useEffect, useState } from "react";
import { Box, Button, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import { Gift, HeartHandshake, MessageCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product, SiteSettings } from "@artenova/shared";
import { api } from "../lib/api";
import { ProductCard } from "../components/ProductCard";

export function HomePage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    void Promise.all([api.settings(), api.products(new URLSearchParams())]).then(([site, products]) => {
      setSettings(site);
      setFeatured(products.filter((product) => product.isFeatured).slice(0, 3));
    });
  }, []);

  return (
    <Box>
      <Box className="hero-shell" sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="xl" sx={{ position: "relative" }}>
          <Grid container spacing={5} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3} alignItems="flex-start">
                <Chip color="secondary" icon={<Sparkles size={16} />} label={settings?.bannerText ?? "Pedidos personalizados con confirmacion por WhatsApp"} />
                <Typography variant="h1" sx={{ fontSize: { xs: 44, md: 72 }, lineHeight: 0.95, maxWidth: 720 }}>
                  {settings?.heroTitle ?? "Regalos personalizados que guardan historias"}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 620 }}>
                  {settings?.heroSubtitle ?? "Corte y grabado laser para mascotas, bodas y recuerdos hechos con carino."}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button component={Link} to="/catalogo" size="large" variant="contained" startIcon={<Gift size={20} />}>
                    Ver catálogo
                  </Button>
                  <Button component={Link} to="/contacto" size="large" variant="outlined" startIcon={<MessageCircle size={20} />}>
                    Hablar con Artenova
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 0.78fr",
                  gap: 2,
                  alignItems: "end",
                  maxWidth: 640,
                  ml: "auto"
                }}
              >
                <Box component="img" src="/seed/mascotas/mascotas-2.jpg" alt="Retrato grabado de mascota" sx={{ borderRadius: 3, transform: "rotate(-2deg)", boxShadow: "0 28px 70px rgba(64,44,37,.22)" }} />
                <Stack spacing={2}>
                  <Box component="img" src="/seed/bodas/bodas-3.jpg" alt="Recordatorio de bodas" sx={{ borderRadius: 3, transform: "rotate(3deg)", boxShadow: "0 20px 55px rgba(64,44,37,.18)" }} />
                  <Box className="soft-panel" sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <HeartHandshake color="#ef798a" />
                      <Typography fontWeight={900}>Precio base visible, detalles confirmados por el taller.</Typography>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ pb: 8 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "end" }} mb={3} gap={2}>
          <Box>
            <Typography variant="h3" sx={{ fontSize: { xs: 32, md: 44 } }}>
              Detalles listos para personalizar
            </Typography>
            <Typography color="text.secondary">Mascotas, bodas y recuerdos con datos, fotos y acabados a tu medida.</Typography>
          </Box>
          <Button component={Link} to="/catalogo" variant="outlined">
            Explorar todo
          </Button>
        </Stack>
        <Grid container spacing={3}>
          {featured.map((product) => (
            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

