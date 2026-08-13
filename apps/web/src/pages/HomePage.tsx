import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowRight,
  CheckCircle2,
  Palette,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { resolveMediaStillUrl, type Product, type SiteSettings } from "@artenova/shared";
import { ProductCard } from "../components/ProductCard";
import { CatalogGridSkeleton } from "../components/SkeletonStates";
import { WhatsAppIcon } from "../components/WhatsAppIcon";
import { api } from "../lib/api";
import { whatsappHref } from "../lib/contact";
import { selectFeaturedProducts } from "../lib/featuredProducts";
import { applySeo } from "../lib/seo";

const trustItems = [
  { icon: CheckCircle2, text: "Diseño antes de fabricar" },
  { icon: WhatsAppIcon, text: "Atención directa por WhatsApp" },
  { icon: Truck, text: "Envios a todo el País" },
  { icon: Palette, text: "Personalización por pedido" },
];

export function HomePage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const featuredProducts = useMemo(() => selectFeaturedProducts(products, 4), [products]);
  const quoteUrl = whatsappHref(settings?.whatsapp, "Hola, quiero cotizar una pieza personalizada con Artenova.");
  const featuredProduct = featuredProducts[0] as (Product & { images?: Product["media"] }) | undefined;
  const featuredVariant = featuredProduct?.defaultVariant as (Product["defaultVariant"] & { images?: Product["media"] }) | undefined;
  const heroMedia = (featuredVariant?.media ?? featuredVariant?.images ?? [])[0]
    ?? (featuredProduct?.media ?? featuredProduct?.images ?? [])[0];

  useEffect(() => {
    void Promise.all([api.settings(), api.products(new URLSearchParams())])
      .then(([nextSettings, nextProducts]) => {
        setSettings(nextSettings);
        setProducts(nextProducts);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    applySeo({
      title: settings?.heroTitle ?? "Detalles personalizados en acrílico, madera y más",
      description:
        settings?.heroSubtitle ??
        "Diseñamos placas, recordatorios, regalos y artículos personalizados para mascotas, celebraciones y ocasiones especiales, hechos contigo antes de fabricar.",
      path: "/",
      image: resolveMediaStillUrl(heroMedia),
      type: "website",
    });
  }, [featuredProducts, heroMedia, settings]);

  return (
    <Box className="home-shell">
      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Paper className="home-hero-panel" elevation={0}>
            <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
              <Grid size={{ xs: 12, md: 6.5 }}>
                <Stack spacing={1.5} className="home-hero-copy">
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip label="Artenova" size="small" className="brand-chip" />
                    <Typography variant="caption" color="text.secondary" fontWeight={900}>
                      Detalles personalizados en acrílico, madera y más
                    </Typography>
                  </Stack>
                  <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 40 }, lineHeight: 1.04, maxWidth: 680 }}>
                    Creamos recuerdos que hacen especial cada momento.
                  </Typography>
                  <Typography color="text.secondary" sx={{ maxWidth: 620 }}>
                    Diseñamos placas, recordatorios, regalos y artículos personalizados para mascotas, celebraciones y ocasiones especiales, hechos contigo antes de fabricar.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                    {quoteUrl ? (
                      <Button href={quoteUrl} target="_blank" rel="noreferrer" variant="contained" startIcon={<WhatsAppIcon size={18} />}>
                        Cotizar por WhatsApp
                      </Button>
                    ) : (
                      <Button component={Link} to="/contacto" variant="contained">
                        Cotizar una idea
                      </Button>
                    )}
                    <Button component={Link} to="/catalogo" variant="outlined" endIcon={<ArrowRight size={18} />}>
                      Ver catálogo completo
                    </Button>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 5.5 }}>
                <Box
                  component="a"
                  href="https://artenovapty.com/producto/cedulas-personalizadas-mascotas"
                  aria-label="Ver cédulas personalizadas para mascotas"
                  sx={{
                    display: "block",
                    borderRadius: 2,
                    "&:focus-visible": {
                      outline: "3px solid rgba(196,110,78,.42)",
                      outlineOffset: 4,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src="/seed/mascotas/cedulas-personalizadas-mascotas-hero.png"
                    alt="Ejemplos de identificaciones personalizadas para mascotas"
                    className="home-hero-image"
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Paper className="home-featured-panel" elevation={0}>
            <Stack spacing={2.5}>
              <Stack spacing={0.75}>
                <Typography variant="caption" color="text.secondary" fontWeight={900} letterSpacing={0.8}>
                  Destacados
                </Typography>
              </Stack>

              {loading ? (
                <CatalogGridSkeleton />
              ) : featuredProducts.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center", border: "1px dashed rgba(64,44,37,.18)", borderRadius: 3, bgcolor: "rgba(255,250,245,.72)" }}>
                  <Stack spacing={2} alignItems="center">
                    <Typography variant="h5" fontWeight={900}>
                      Pronto verás productos destacados aquí
                    </Typography>
                    <Button component={Link} to="/catalogo" variant="contained">
                      Ir al catálogo completo
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  {featuredProducts.map((product, index) => (
                    <Grid key={product.id} size={{ xs: 12, sm: 6, md: 3 }}>
                      <ProductCard product={product} index={index} />
                    </Grid>
                  ))}
                </Grid>
              )}

              <Button
                component={Link}
                to="/catalogo"
                variant="contained"
                size="large"
                endIcon={<ArrowRight size={18} />}
                className="home-catalog-banner-button"
                sx={{ alignSelf: "center" }}
              >
                Quiero ver más
              </Button>
            </Stack>
          </Paper>

          <Paper className="trust-panel" elevation={0}>
            <Grid container spacing={1.5}>
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Grid key={item.text} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Icon size={18} />
                      <Typography fontWeight={900}>{item.text}</Typography>
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
