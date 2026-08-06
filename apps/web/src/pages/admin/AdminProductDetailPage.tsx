import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Grid, Stack, Typography } from "@mui/material";
import { Pencil } from "lucide-react";
import { formatCurrency, type Product } from "@artenova/shared";
import { Link as RouterLink, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, StatusChip } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs, AdminDetailSection, AdminField } from "./adminCrudUi";

export function AdminProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    void api.adminProduct(id)
      .then((item) => {
        if (active) setProduct(item);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar el producto");
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Productos", to: "/admin/productos" }, { label: product?.name ?? "Detalle" }]} />
      <AdminPageHeader
        title={product?.name ?? "Producto"}
        subtitle="Resumen útil para revisar la variante visible, las combinaciones y el estado."
        action={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <AdminBackButton to="/admin/productos" />
            {id && (
              <Button component={RouterLink} to={`/admin/productos/${id}/editar`} variant="contained" startIcon={<Pencil size={18} />}>
                Editar
              </Button>
            )}
          </Stack>
        }
      />
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {product && (
        <>
          {(() => {
            const defaultVariant = product.defaultVariant ?? product.variants.find((variant) => variant.isActive) ?? product.variants[0] ?? null;
            const hasOptions = product.productOptions.length > 0;
            return (
              <>
                <AdminDetailSection title="Datos base">
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <AdminField label="Slug" value={product.slug} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <AdminField label="Referencia visible" value={defaultVariant?.sku || "Sin referencia"} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <AdminField label="Estado" value={<StatusChip status={product.isPublished ? "published" : "draft"} />} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <AdminField label="Destacado" value={product.isFeatured ? "Sí" : "No"} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <AdminField label="Precio visible" value={formatCurrency(defaultVariant?.pricingSummary.finalPrice ?? product.pricingSummary.finalPrice, product.currencySymbol)} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <AdminField label="Descripción" value={product.description} />
                    </Grid>
                  </Grid>
                </AdminDetailSection>

                <AdminDetailSection title="Variante por defecto">
                  {!defaultVariant && <Typography color="text.secondary">Sin variante visible.</Typography>}
                  {defaultVariant && (
                    <Stack spacing={1}>
                      <AdminField label="Nombre" value={defaultVariant.name} />
                      <AdminField label="Descuento" value={defaultVariant.discountType ? `${defaultVariant.discountType} ${defaultVariant.discountValue ?? 0}` : "Sin descuento"} />
                      <Stack spacing={1}>
                        {defaultVariant.priceTiers.length === 0 && <Typography color="text.secondary">Sin precios por cantidad en la variante por defecto.</Typography>}
                        {defaultVariant.priceTiers.map((tier) => (
                          <Stack key={tier.id ?? tier.minQuantity} direction="row" justifyContent="space-between" gap={2}>
                            <Typography>{tier.label ?? `${tier.minQuantity}+ unidades`}</Typography>
                            <Typography fontWeight={900}>
                              {tier.finalTotalPrice != null ? formatCurrency(tier.finalTotalPrice, product.currencySymbol) : `${formatCurrency(tier.finalUnitPrice ?? tier.unitPrice, product.currencySymbol)} c/u`}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Stack>
                  )}
                </AdminDetailSection>

                <AdminDetailSection title={hasOptions ? "Galería descriptiva del producto" : "Galería de la variante única"}>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {product.media.length === 0 && !defaultVariant?.media.length && <Typography color="text.secondary">Sin media.</Typography>}
                    {(hasOptions ? product.media : defaultVariant?.media ?? []).map((item) => (
                      <Box
                        key={item.id}
                        component={item.type === "video" ? "video" : "img"}
                        src={item.type === "image" ? item.url : undefined}
                        poster={item.type === "video" ? item.posterUrl ?? undefined : undefined}
                        controls={item.type === "video" ? true : undefined}
                        playsInline={item.type === "video" ? true : undefined}
                        alt={item.alt}
                        sx={{ width: 120, height: 120, objectFit: "cover", borderRadius: 2, border: "1px solid rgba(64,44,37,.10)" }}
                      />
                    ))}
                  </Stack>
                </AdminDetailSection>

                <AdminDetailSection title="Variantes">
                  {!hasOptions && <Typography color="text.secondary">Producto simple con una sola variante automática.</Typography>}
                  {hasOptions && (
                    <Stack direction="row" gap={0.75} flexWrap="wrap" mb={2}>
                      {product.productOptions.map((option) => (
                        <Chip key={option.id} label={`${option.name}: ${option.values.map((value) => value.value).join(", ")}`} size="small" />
                      ))}
                    </Stack>
                  )}
                  <Stack spacing={2}>
                    {product.variants.map((variant) => (
                      <Box key={variant.id} sx={{ border: "1px solid rgba(64,44,37,.10)", borderRadius: 2, p: 2 }}>
                        <Stack spacing={1}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography fontWeight={900}>{variant.name}</Typography>
                              {product.defaultVariantId === variant.id && <Chip size="small" color="secondary" label="Por defecto" />}
                            </Stack>
                            <StatusChip status={variant.isActive ? "active" : "paused"} />
                          </Stack>
                          <Typography color="text.secondary">Precio: {formatCurrency(variant.pricingSummary.finalPrice, product.currencySymbol)}</Typography>
                          <Stack direction="row" gap={0.75} flexWrap="wrap">
                            {variant.selections.map((selection) => <Chip key={`${variant.id}-${selection.optionValueId}`} label={`${selection.optionName}: ${selection.value}`} size="small" variant="outlined" />)}
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </AdminDetailSection>
              </>
            );
          })()}
        </>
      )}
    </Stack>
  );
}
