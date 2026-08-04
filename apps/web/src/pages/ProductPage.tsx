import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Container, Grid, Paper, Rating, Stack, Typography } from "@mui/material";
import { MessageCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { formatCurrency, type Product, type SiteSettings } from "@artenova/shared";
import { ProductGallery } from "../components/ProductGallery";
import { ProductReviews } from "../components/ProductReviews";
import { ProductPageSkeleton } from "../components/SkeletonStates";
import { api } from "../lib/api";
import { whatsappHref } from "../lib/contact";
import { applySeo, productSeoDescription } from "../lib/seo";

export function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

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
        setSelectedVariantId(nextProduct.variants[0]?.id ?? "");
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

  const selectedVariant = product?.variants.find((variant) => variant.id === selectedVariantId) ?? product?.variants[0] ?? null;
  const activeImages = selectedVariant?.images.length ? selectedVariant.images : product?.images ?? [];
  const activePricing = selectedVariant?.pricingSummary ?? product?.pricingSummary ?? null;
  const activePriceTiers = selectedVariant?.priceTiers.length ? selectedVariant.priceTiers : product?.priceTiers ?? [];
  const variantAttributeGroups = useMemo(() => {
    if (!product?.variants.length) return [] as Array<{ name: string; values: string[] }>;
    const grouped = new Map<string, Set<string>>();
    product.variants.forEach((variant) => {
      variant.attributes.forEach((attribute) => {
        if (!grouped.has(attribute.name)) grouped.set(attribute.name, new Set<string>());
        grouped.get(attribute.name)?.add(attribute.value);
      });
    });
    return Array.from(grouped.entries()).map(([name, values]) => ({ name, values: Array.from(values) }));
  }, [product?.variants]);

  useEffect(() => {
    if (!product || !activePricing) return;
    applySeo({
      title: product.name,
      description: productSeoDescription({ name: product.name, description: product.description, price: activePricing.finalPrice }),
      path: `/producto/${product.slug}`,
      image: activeImages[0]?.url ?? product.images[0]?.url,
      type: "product",
    });
  }, [activeImages, activePricing, product]);

  if (loading) return <ProductPageSkeleton />;

  if (!product || !activePricing) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="h3">Producto no disponible</Typography>
            <Typography color="text.secondary">{loadError || "Este enlace ya no esta publicado."}</Typography>
            <Button component={Link} to="/" variant="contained">
              Ver catálogo
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const consultUrl = whatsappHref(
    settings?.whatsapp,
    `Hola, estoy interesado en ${product.name}${selectedVariant ? ` - ${selectedVariant.name}` : ""}${product.sku ? ` (REF ${product.sku})` : ""}.`
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 5 } }}>
      <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ProductGallery
            productName={selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name}
            images={activeImages}
            galleryKey={selectedVariant?.id ?? product.id}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={{ xs: 2.5, md: 3 }}>
            <Box>
              <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 56 }, overflowWrap: "anywhere" }}>
                {product.name}
              </Typography>
              {(selectedVariant?.sku ?? product.sku) && (
                <Typography variant="overline" color="text.secondary" fontWeight={900}>
                  REF {selectedVariant?.sku ?? product.sku}
                </Typography>
              )}
              {product.reviewSummary.reviewCount > 0 && (
                <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                  <Rating value={product.reviewSummary.averageRating} precision={0.5} readOnly size="small" />
                  <Typography variant="body2" color="text.secondary" fontWeight={800}>
                    {product.reviewSummary.averageRating.toFixed(1)} ({product.reviewSummary.reviewCount})
                  </Typography>
                </Stack>
              )}
              <Typography color="text.secondary" mt={1}>
                {product.description}
              </Typography>
              {product.variants.length > 0 && (
                <Stack spacing={1.25} mt={2}>
                  <Typography variant="caption" color="text.secondary" fontWeight={900}>
                    Variantes disponibles
                  </Typography>
                  <Stack direction="row" gap={0.75} flexWrap="wrap">
                    {product.variants.map((variant) => (
                      <Chip
                        key={variant.id}
                        clickable
                        color={variant.id === selectedVariant?.id ? "secondary" : "default"}
                        variant={variant.id === selectedVariant?.id ? "filled" : "outlined"}
                        label={variant.name}
                        onClick={() => setSelectedVariantId(variant.id)}
                      />
                    ))}
                  </Stack>
                  {variantAttributeGroups.map((group) => (
                    <Stack key={group.name} direction="row" gap={0.75} flexWrap="wrap" alignItems="center">
                      <Typography variant="caption" color="text.secondary" fontWeight={900}>
                        {group.name}
                      </Typography>
                      {group.values.map((value) => (
                        <Chip
                          key={`${group.name}-${value}`}
                          label={value}
                          size="small"
                          variant={selectedVariant?.attributes.some((attribute) => attribute.name === group.name && attribute.value === value) ? "filled" : "outlined"}
                        />
                      ))}
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <Paper className="soft-panel" sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <ProductInfo label="Material" value={product.material ?? "A confirmar"} />
                <ProductInfo label="Tamaño" value={product.size ?? "A confirmar"} />
                <ProductInfo label="Técnica" value={product.technique ?? "A confirmar"} />
                <ProductInfo label={selectedVariant ? "Variante" : "Desde"} value={selectedVariant?.name ?? formatCurrency(activePricing.finalPrice)} />
              </Grid>
              <Stack direction="row" spacing={1} alignItems="baseline" mt={2}>
                <Typography variant="h4" fontWeight={900}>
                  {formatCurrency(activePricing.finalPrice)}
                </Typography>
                {activePricing.hasDiscount && (
                  <Typography color="text.secondary" sx={{ textDecoration: "line-through" }}>
                    {formatCurrency(activePricing.originalPrice)}
                  </Typography>
                )}
              </Stack>
            </Paper>

            {activePriceTiers.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={900}>
                  Precios por cantidad
                </Typography>
                <Stack spacing={1} mt={1.25}>
                  {activePriceTiers.map((tier) => (
                    <Stack key={tier.id ?? tier.minQuantity} direction="row" justifyContent="space-between" gap={2}>
                      <Typography>{tier.label ?? `${tier.minQuantity}+ unidades`}</Typography>
                      <Stack spacing={0.25} alignItems="flex-end">
                        <Typography fontWeight={900} textAlign="right">
                          {tier.finalTotalPrice != null ? formatCurrency(tier.finalTotalPrice) : `${formatCurrency(tier.finalUnitPrice ?? tier.unitPrice)} c/u`}
                        </Typography>
                        {tier.hasDiscount && (
                          <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                            {tier.originalTotalPrice != null ? formatCurrency(tier.originalTotalPrice) : `${formatCurrency(tier.originalUnitPrice ?? tier.unitPrice)} c/u`}
                          </Typography>
                        )}
                      </Stack>
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

            <ProductReviews
              product={product}
              onReviewCreated={(review) =>
                setProduct((current) => {
                  if (!current) return current;
                  const reviews = [review, ...current.reviews];
                  const averageRating = Number((reviews.reduce((total, item) => total + item.rating, 0) / reviews.length).toFixed(1));
                  return { ...current, reviews, reviewSummary: { averageRating, reviewCount: reviews.length } };
                })
              }
            />

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
