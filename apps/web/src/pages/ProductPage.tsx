import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Container, Grid, Paper, Rating, Stack, Typography } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import { formatCurrency, resolveFirstStillUrl, resolveMediaStillUrl, type Product, type ProductOption, type ProductVariant, type SiteSettings } from "@artenova/shared";
import { ProductGallery, type ProductGalleryItem } from "../components/ProductGallery";
import { ProductReviews } from "../components/ProductReviews";
import { ProductPageSkeleton } from "../components/SkeletonStates";
import { WhatsAppIcon } from "../components/WhatsAppIcon";
import { api } from "../lib/api";
import { whatsappHref } from "../lib/contact";
import { applySeo, productSeoDescription } from "../lib/seo";

type SelectionState = Record<string, string>;
type GalleryImageItem = ProductGalleryItem & {
  variantId: string | null;
  visualGroupKey: string;
};
type GalleryGroupMap = Map<string, GalleryImageItem[]>;

function resolveVisualGroupKey(variant: ProductVariant | null | undefined) {
  return variant?.visualGroupKey?.trim() || variant?.id || "base";
}

function variantSelectionMap(variant: ProductVariant) {
  return Object.fromEntries(variant.selections.map((selection) => [selection.optionId, selection.optionValueId]));
}

function matchesSelection(variant: ProductVariant, selection: SelectionState) {
  const byOptionId = variantSelectionMap(variant);
  return Object.entries(selection).every(([optionId, optionValueId]) => !optionValueId || byOptionId[optionId] === optionValueId);
}

function matchesSelectionForOptionIds(variant: ProductVariant, selection: SelectionState, optionIds: Set<string>) {
  const byOptionId = variantSelectionMap(variant);
  return Object.entries(selection).every(([optionId, optionValueId]) => !optionIds.has(optionId) || !optionValueId || byOptionId[optionId] === optionValueId);
}

function completeSelectionFromVariant(variant: ProductVariant) {
  return Object.fromEntries(variant.selections.map((selection) => [selection.optionId, selection.optionValueId]));
}

function resolveNextSelection(options: ProductOption[], variants: ProductVariant[], currentSelection: SelectionState, optionId: string, optionValueId: string) {
  const draftSelection = { ...currentSelection, [optionId]: optionValueId };
  const exactMatches = variants.filter((variant) => matchesSelection(variant, draftSelection));
  if (exactMatches.length === 0) {
    return currentSelection;
  }

  const anchorVariant = exactMatches[0]!;
  const completed = completeSelectionFromVariant(anchorVariant);
  return options.reduce<SelectionState>((acc, option) => ({
    ...acc,
    [option.id]: draftSelection[option.id] ?? completed[option.id] ?? ""
  }), {});
}

function resolveGalleryItemsForGroup(groups: GalleryGroupMap, groupKey: string) {
  const scoped = groups.get(groupKey);
  if (scoped && scoped.length > 0) return scoped;
  const baseGroup = groups.get("base");
  if (baseGroup && baseGroup.length > 0) return baseGroup;
  return groups.values().next().value ?? [];
}

export function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<SelectionState>({});
  const [activeVisualGroup, setActiveVisualGroup] = useState("");
  const [activeGalleryKey, setActiveGalleryKey] = useState("");

  useEffect(() => {
    if (!slug) return;

    let active = true;
    setLoading(true);
    setLoadError("");
    void Promise.all([api.product(slug), api.settings()])
      .then(([nextProduct, nextSettings]) => {
        if (!active) return;
        const defaultVariant = nextProduct.defaultVariant ?? nextProduct.variants.find((variant) => variant.isActive) ?? nextProduct.variants[0] ?? null;
        const defaultVisualGroup = resolveVisualGroupKey(defaultVariant);
        setProduct(nextProduct);
        setSettings(nextSettings);
        setSelectedOptions(defaultVariant ? completeSelectionFromVariant(defaultVariant) : {});
        setActiveVisualGroup(defaultVisualGroup);
        setActiveGalleryKey("");
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

  const productOptions = product?.productOptions ?? [];
  const activeVariants = useMemo(() => product?.variants.filter((variant) => variant.isActive) ?? [], [product?.variants]);
  const visualOptionIds = useMemo(
    () => new Set(productOptions.filter((option) => option.drivesVisualGroup).map((option) => option.id)),
    [productOptions],
  );
  const nonVisualOptionIds = useMemo(
    () => new Set(productOptions.filter((option) => !option.drivesVisualGroup).map((option) => option.id)),
    [productOptions],
  );
  const hasOptionSelection = useMemo(() => productOptions.some((option) => Boolean(selectedOptions[option.id])), [productOptions, selectedOptions]);

  const selectedVariant = useMemo(() => {
    if (!product) return null;
    if (productOptions.length === 0) return product.defaultVariant ?? activeVariants[0] ?? product.variants[0] ?? null;
    if (!hasOptionSelection) return product.defaultVariant ?? activeVariants[0] ?? product.variants[0] ?? null;
    return activeVariants.find((variant) => {
      const selectionMap = variantSelectionMap(variant);
      return productOptions.every((option) => selectionMap[option.id] === selectedOptions[option.id]);
    }) ?? null;
  }, [activeVariants, hasOptionSelection, product, productOptions, selectedOptions]);

  const visualGalleryMap = useMemo<GalleryGroupMap>(() => {
    if (!product) return new Map<string, GalleryImageItem[]>();
    const groups = new Map<string, GalleryImageItem[]>();
    if (product.media.length > 0) {
      groups.set("base", product.media.map((media, index) => ({
        key: `base:${media.id ?? index}`,
        media,
        variantId: null,
        visualGroupKey: "base",
      })));
    }
    for (const variant of activeVariants) {
      const groupKey = resolveVisualGroupKey(variant);
      const existingItems = groups.get(groupKey) ?? [];
      const seenUrls = new Set(existingItems.map((item) => item.media.url));
      for (const [index, media] of variant.media.entries()) {
        if (seenUrls.has(media.url)) continue;
        existingItems.push({
          key: `visual:${groupKey}:${media.id ?? index}`,
          media,
          variantId: variant.id,
          visualGroupKey: groupKey,
        });
        seenUrls.add(media.url);
      }
      groups.set(groupKey, existingItems);
    }
    return groups;
  }, [activeVariants, product]);

  const galleryItems = useMemo<GalleryImageItem[]>(() => {
    return resolveGalleryItemsForGroup(visualGalleryMap, activeVisualGroup);
  }, [activeVisualGroup, visualGalleryMap]);

  const galleryThumbnailItems = useMemo<GalleryImageItem[]>(() => {
    if (galleryItems.length > 1) return galleryItems;
    return Array.from(visualGalleryMap.values())
      .map((groupItems) => groupItems[0] ?? null)
      .filter((item): item is GalleryImageItem => Boolean(item));
  }, [galleryItems, visualGalleryMap]);

  useEffect(() => {
    if (!selectedVariant) return;
    const nextGroup = resolveVisualGroupKey(selectedVariant);
    setActiveVisualGroup((current) => current || nextGroup);
  }, [selectedVariant]);

  useEffect(() => {
    if (!galleryItems.length) {
      setActiveGalleryKey("");
      return;
    }
    if (!activeGalleryKey || !galleryItems.some((item) => item.key === activeGalleryKey)) {
      setActiveGalleryKey(galleryItems[0]!.key);
    }
  }, [activeGalleryKey, galleryItems]);

  const activeGalleryItem = useMemo(
    () => galleryItems.find((item) => item.key === activeGalleryKey) ?? galleryItems[0] ?? null,
    [activeGalleryKey, galleryItems]
  );

  const activeThumbnailKey = useMemo(() => {
    if (galleryItems.length > 1) return activeGalleryItem?.key ?? "";
    return galleryItems[0]?.key ?? activeGalleryItem?.key ?? "";
  }, [activeGalleryItem, galleryItems]);

  function handleGalleryKeyChange(nextKey: string) {
    const nextInActiveGroup = galleryItems.find((item) => item.key === nextKey);
    if (nextInActiveGroup) {
      setActiveGalleryKey(nextKey);
      return;
    }

    const nextThumbnailItem = galleryThumbnailItems.find((item) => item.key === nextKey);
    if (!nextThumbnailItem) return;

    const nextVisualGroup = nextThumbnailItem.visualGroupKey;
    if (nextVisualGroup === "base" || visualOptionIds.size === 0) {
      const nextGalleryItems = resolveGalleryItemsForGroup(visualGalleryMap, nextVisualGroup);
      const nextGalleryItem = nextGalleryItems[0];
      setActiveVisualGroup(nextVisualGroup);
      if (nextGalleryItem) {
        setActiveGalleryKey(nextGalleryItem.key);
      }
      return;
    }

    const groupVariants = activeVariants.filter((variant) => resolveVisualGroupKey(variant) === nextVisualGroup);
    const preferredVariant = nextThumbnailItem.variantId
      ? groupVariants.find((variant) => variant.id === nextThumbnailItem.variantId)
      : null;
    const compatibleVariant = groupVariants.find((variant) => matchesSelectionForOptionIds(variant, selectedOptions, nonVisualOptionIds));
    const defaultVariantInGroup = groupVariants.find((variant) => variant.id === product?.defaultVariant?.id) ?? groupVariants[0] ?? null;
    const nextVariant =
      (preferredVariant && matchesSelectionForOptionIds(preferredVariant, selectedOptions, nonVisualOptionIds) ? preferredVariant : null)
      ?? compatibleVariant
      ?? defaultVariantInGroup;

    const nextGalleryItems = resolveGalleryItemsForGroup(visualGalleryMap, nextVisualGroup);
    const nextGalleryItem = nextGalleryItems.find((item) => item.key === nextKey) ?? nextGalleryItems[0];

    if (nextVariant) {
      setSelectedOptions(completeSelectionFromVariant(nextVariant));
    }
    setActiveVisualGroup(nextVisualGroup);
    if (nextGalleryItem) {
      setActiveGalleryKey(nextGalleryItem.key);
    }
  }

  const activePricing = selectedVariant?.pricingSummary ?? product?.pricingSummary ?? null;
  const activePriceTiers = selectedVariant?.priceTiers ?? [];

  const availabilityByOption = useMemo(() => {
    if (!product) return new Map<string, Set<string>>();
    const result = new Map<string, Set<string>>();
    productOptions.forEach((option) => {
      option.values.forEach((value) => {
        const withoutCurrent = Object.fromEntries(Object.entries(selectedOptions).filter(([key]) => key !== option.id));
        const isAvailable = activeVariants.some((variant) => {
          if (!variant.selections.some((selection) => selection.optionId === option.id && selection.optionValueId === value.id)) return false;
          return matchesSelection(variant, withoutCurrent);
        });
        if (!result.has(option.id)) result.set(option.id, new Set<string>());
        if (isAvailable) result.get(option.id)?.add(value.id);
      });
    });
    return result;
  }, [activeVariants, product, productOptions, selectedOptions]);

  useEffect(() => {
    if (!product || !activePricing) return;
    applySeo({
      title: product.name,
      description: productSeoDescription({
        name: product.name,
        description: product.description,
        price: activePricing.finalPrice,
        currencySymbol: product.currencySymbol,
      }),
      path: `/producto/${product.slug}`,
      image: resolveMediaStillUrl(activeGalleryItem?.media) ?? resolveFirstStillUrl(galleryItems.map((item) => item.media)) ?? resolveFirstStillUrl(product.media),
      type: "product",
    });
  }, [activeGalleryItem, activePricing, galleryItems, product]);

  if (loading) return <ProductPageSkeleton />;

  if (!product || !activePricing) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="h3">Producto no disponible</Typography>
            <Typography color="text.secondary">{loadError || "Este enlace ya no está publicado."}</Typography>
            <Button component={Link} to="/catalogo" variant="contained">
              Ver catálogo
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const hasVariants = productOptions.length > 0;
  const consultUrl = whatsappHref(
    settings?.whatsapp,
    `Hola, estoy interesado en ${product.name}${selectedVariant ? ` - ${selectedVariant.name}` : ""}${(selectedVariant?.sku ?? product.sku) ? ` (REF ${selectedVariant?.sku ?? product.sku})` : ""}.`
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 5 } }}>
      <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ProductGallery
            productName={selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name}
            items={galleryItems}
            thumbnailItems={galleryThumbnailItems}
            activeKey={activeGalleryItem?.key ?? ""}
            activeThumbnailKey={activeThumbnailKey}
            onActiveKeyChange={handleGalleryKeyChange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={{ xs: 2.5, md: 3 }}>
            <Box>
              <Typography variant="h2" sx={{ fontSize: { xs: 30, md: 44 }, lineHeight: { xs: 1.05, md: 1.02 }, overflowWrap: "anywhere", maxWidth: "12ch" }}>
                {product.name}
              </Typography>
              {product.reviewSummary.reviewCount > 0 && (
                <Stack direction="row" spacing={1} alignItems="center" mt={1.25}>
                  <Rating value={product.reviewSummary.averageRating} precision={0.5} readOnly size="small" />
                  <Typography variant="body2" color="text.secondary" fontWeight={800}>
                    {product.reviewSummary.averageRating.toFixed(1)} ({product.reviewSummary.reviewCount})
                  </Typography>
                </Stack>
              )}
              <Typography color="text.secondary" mt={1.5} sx={{ maxWidth: "62ch", lineHeight: 1.75 }}>
                {product.description}
              </Typography>

              {hasVariants && (
                <Stack spacing={1.5} mt={2.5}>
                  {productOptions.map((option) => (
                    <Stack key={option.id} spacing={0.85}>
                      <Typography variant="caption" color="text.secondary" fontWeight={900} sx={{ letterSpacing: 0.4 }}>
                        {option.name}
                      </Typography>
                      <Stack direction="row" gap={0.75} flexWrap="wrap">
                        {option.values.map((value) => {
                          const isSelected = selectedOptions[option.id] === value.id;
                          const isAvailable = availabilityByOption.get(option.id)?.has(value.id) ?? false;
                          return (
                            <Chip
                              key={value.id}
                              clickable={isAvailable}
                              disabled={!isAvailable}
                              color={isSelected ? "secondary" : "default"}
                              variant={isSelected ? "filled" : "outlined"}
                              label={value.value}
                              onClick={() => {
                                const nextSelection = resolveNextSelection(productOptions, activeVariants, selectedOptions, option.id, value.id);
                                setSelectedOptions(nextSelection);
                                const matchingVariant = activeVariants.find((variant) =>
                                  productOptions.every((productOption) => variantSelectionMap(variant)[productOption.id] === nextSelection[productOption.id])
                                ) ?? null;
                                if (matchingVariant) {
                                  const nextVisualGroup = resolveVisualGroupKey(matchingVariant);
                                  const nextGalleryItems = resolveGalleryItemsForGroup(visualGalleryMap, nextVisualGroup);
                                  const nextGalleryItem = nextGalleryItems[0];
                                  setActiveVisualGroup(nextVisualGroup);
                                  if (nextGalleryItem) {
                                    setActiveGalleryKey(nextGalleryItem.key);
                                  }
                                }
                              }}
                            />
                          );
                        })}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <Paper className="soft-panel" sx={{ p: { xs: 2.5, md: 3 }, border: "1px solid rgba(64,44,37,.08)" }}>
              <Stack spacing={1.25}>
                <Typography variant="caption" color="text.secondary" fontWeight={900} sx={{ letterSpacing: 0.4 }}>
                  {"Precio"}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                  <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: 32, md: 36 } }}>
                    {formatCurrency(activePricing.finalPrice, product.currencySymbol)}
                  </Typography>
                  {activePricing.hasDiscount && (
                    <Typography color="text.secondary" sx={{ textDecoration: "line-through" }}>
                      {formatCurrency(activePricing.originalPrice, product.currencySymbol)}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Paper>

            {activePriceTiers.length > 0 && (
              <Paper sx={{ p: { xs: 2.5, md: 3 }, border: "1px solid rgba(64,44,37,.08)" }}>
                <Typography variant="h6" fontWeight={900}>
                  Precios por cantidad
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Ideal si necesitas varias piezas del mismo diseño.
                </Typography>
                <Stack spacing={1.1} mt={1.5}>
                  {activePriceTiers.map((tier) => (
                    <Stack
                      key={tier.id ?? tier.minQuantity}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap={2}
                      sx={{ py: 1.1, borderBottom: "1px solid rgba(64,44,37,.08)" }}
                    >
                      <Typography>{tier.label ?? `${tier.minQuantity}+ unidades`}</Typography>
                      <Stack spacing={0.25} alignItems="flex-end">
                        <Typography fontWeight={900} textAlign="right">
                          {tier.finalTotalPrice != null ? formatCurrency(tier.finalTotalPrice, product.currencySymbol) : `${formatCurrency(tier.finalUnitPrice ?? tier.unitPrice, product.currencySymbol)} c/u`}
                        </Typography>
                        {tier.hasDiscount && (
                          <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                            {tier.originalTotalPrice != null ? formatCurrency(tier.originalTotalPrice, product.currencySymbol) : `${formatCurrency(tier.originalUnitPrice ?? tier.unitPrice, product.currencySymbol)} c/u`}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}

            {product.extras.length > 0 && (
              <Paper sx={{ p: { xs: 2.5, md: 3 }, border: "1px solid rgba(64,44,37,.08)" }}>
                <Typography variant="h6" fontWeight={900}>
                  Opciones adicionales
                </Typography>
                <Stack spacing={1} mt={1.25}>
                  {product.extras.map((extra) => (
                    <Stack key={extra.id ?? extra.name} direction="row" justifyContent="space-between" gap={2}>
                      <Typography>{extra.name}</Typography>
                      <Typography fontWeight={900} textAlign="right">
                        {extra.priceDelta > 0 ? `+${formatCurrency(extra.priceDelta, product.currencySymbol)}` : "Incluido"}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              {consultUrl ? (
                <Button href={consultUrl} target="_blank" rel="noreferrer" size="large" variant="contained" startIcon={<WhatsAppIcon size={20} />}>
                  Consultar por WhatsApp
                </Button>
              ) : (
                <Button component={Link} to="/contacto" size="large" variant="contained">
                  Contactar
                </Button>
              )}
              <Button component={Link} to="/catalogo" size="large" variant="outlined">
                Ver más productos
              </Button>
            </Stack>

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
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
