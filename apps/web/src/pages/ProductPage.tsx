import { useEffect, useState } from "react";
import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import { MessageCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { formatCurrency, type Product, type SiteSettings } from "@artenova/shared";
import { ProductGallery } from "../components/ProductGallery";
import { ProductPageSkeleton } from "../components/SkeletonStates";
import { api } from "../lib/api";
import { whatsappHref } from "../lib/contact";
import { visiblePublicTags } from "../lib/tags";

export function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!slug) return;

    let active = true;
    setLoading(true);
    setLoadError("");
    void Promise.all([api.product(slug), api.settings()])
      .then(([nextProduct, nextSettings]) => {
        if (!active) return;
        setProduct(nextProduct);
        setSettings(nextSettings);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : "No se pudo encontrar el producto");
        setProduct(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) return <ProductPageSkeleton />;

  if (!product) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="h3">Producto no disponible</Typography>
            <Typography color="text.secondary">{loadError || "Este enlace ya no está publicado."}</Typography>
            <Button component={Link} to="/" variant="contained">
              Ver catálogo
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const tags = visiblePublicTags(product.tags);
  const consultUrl = whatsappHref(settings?.whatsapp, `Hola, estoy interesado en ${product.name}${product.sku ? ` (REF ${product.sku})` : ""}.`);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 5 } }}>
      <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ProductGallery product={product} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={{ xs: 2.5, md: 3 }}>
            <Box>
              <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 56 }, overflowWrap: "anywhere" }}>
                {product.name}
              </Typography>
              {product.sku && (
                <Typography variant="overline" color="text.secondary" fontWeight={900}>
                  REF {product.sku}
                </Typography>
              )}
              <Typography color="text.secondary" mt={1}>
                {product.description}
              </Typography>
              {tags.length > 0 && (
                <Stack direction="row" gap={0.75} flexWrap="wrap" mt={2}>
                  {tags.map((tag) => (
                    <Chip key={tag.id} label={tag.name} size="small" variant="outlined" />
                  ))}
                </Stack>
              )}
            </Box>

            <Paper className="soft-panel" sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <ProductInfo label="Material" value={product.material ?? "A confirmar"} />
                <ProductInfo label="Tamaño" value={product.size ?? "A confirmar"} />
                <ProductInfo label="Técnica" value={product.technique ?? "A confirmar"} />
                <ProductInfo label="Desde" value={formatCurrency(product.basePrice)} />
              </Grid>
            </Paper>

            {product.priceTiers.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={900}>
                  Precios por cantidad
                </Typography>
                <Stack spacing={1} mt={1.25}>
                  {product.priceTiers.map((tier) => (
                    <Stack key={tier.id ?? tier.minQuantity} direction="row" justifyContent="space-between" gap={2}>
                      <Typography>{tier.label ?? `${tier.minQuantity}+ unidades`}</Typography>
                      <Typography fontWeight={900} textAlign="right">
                        {tier.totalPrice != null ? formatCurrency(tier.totalPrice) : `${formatCurrency(tier.unitPrice)} c/u`}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}

            {product.extras.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={900}>
                  Opciones disponibles
                </Typography>
                <Stack spacing={1} mt={1.25}>
                  {product.extras.map((extra) => (
                    <Stack key={extra.id ?? extra.name} direction="row" justifyContent="space-between" gap={2}>
                      <Typography>{extra.name}</Typography>
                      <Typography fontWeight={900} textAlign="right">
                        {extra.priceDelta > 0 ? `+${formatCurrency(extra.priceDelta)}` : "Incluido"}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              {consultUrl ? (
                <Button href={consultUrl} target="_blank" rel="noreferrer" size="large" variant="contained" startIcon={<MessageCircle size={20} />}>
                  Consultar por WhatsApp
                </Button>
              ) : (
                <Button component={Link} to="/contacto" size="large" variant="contained">
                  Contactar
                </Button>
              )}
              <Button component={Link} to="/" size="large" variant="outlined">
                Ver más productos
              </Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}

function ProductInfo({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 6 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={900}>{value}</Typography>
    </Grid>
  );
}
