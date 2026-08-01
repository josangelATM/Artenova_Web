import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { CheckCircle2, MessageCircle, Palette, Search, Sparkles, Truck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { formatCurrency, type Category, type Product, type SiteSettings, type Tag } from "@artenova/shared";
import { api } from "../lib/api";
import { whatsappHref } from "../lib/contact";
import { visiblePublicTags } from "../lib/tags";
import { ProductCard } from "./ProductCard";
import { CatalogGridSkeleton } from "./SkeletonStates";

const processSteps = [
  { title: "Elige un modelo", text: "Parte de una pieza del catálogo o usa una como referencia." },
  { title: "Cuéntanos los detalles", text: "Nombre, fecha, foto, cantidad y cualquier idea especial." },
  { title: "Aprueba tu diseño", text: "Confirmamos el diseño final antes de fabricar." },
];

const trustItems = [
  { icon: CheckCircle2, text: "Diseño antes de fabricar" },
  { icon: MessageCircle, text: "Atención directa por WhatsApp" },
  { icon: Truck, text: "Coordinación en Panamá" },
  { icon: Palette, text: "Personalización por pedido" },
];

export function ProductCatalogView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const category = searchParams.get("category") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const q = searchParams.get("q") ?? "";
  const categorySlugs = new Set(categories.map((item) => item.slug));
  const publicTags = visiblePublicTags(tags).filter((item) => !categorySlugs.has(item.slug));
  const hasFilters = Boolean(q || category || tag);
  const activeCategory = categories.find((item) => item.slug === category);
  const displayedProducts = hasFilters ? products : catalogProducts.length > 0 ? catalogProducts : products;
  const featuredProduct = useMemo(
    () => catalogProducts.find((product) => product.isHero) ?? catalogProducts.find((product) => product.isFeatured) ?? catalogProducts[0],
    [catalogProducts],
  );
  const collectionSections = useMemo(() => buildCollectionSections(categories, publicTags, catalogProducts), [categories, publicTags, catalogProducts]);
  const quoteUrl = whatsappHref(settings?.whatsapp, "Hola, quiero cotizar una pieza personalizada con Artenova.");

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (category) search.set("category", category);
    if (tag) search.set("tag", tag);
    if (q) search.set("q", q);
    return search;
  }, [category, tag, q]);

  function updateFilter(key: "category" | "tag" | "q", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  function selectCategory(slug: string) {
    const next = new URLSearchParams(searchParams);
    next.delete("tag");
    if (slug) {
      next.set("category", slug);
    } else {
      next.delete("category");
    }
    setSearchParams(next);
    document.getElementById("catalog-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectCuratedSection(key: "category" | "tag", value: string) {
    const next = new URLSearchParams(searchParams);
    next.delete(key === "category" ? "tag" : "category");
    next.set(key, value);
    setSearchParams(next);
    document.getElementById("catalog-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const allParams = new URLSearchParams();
    void Promise.all([api.categories(), api.tags(), api.settings(), api.products(allParams)]).then(([nextCategories, nextTags, nextSettings, nextProducts]) => {
      setCategories(nextCategories);
      setTags(nextTags);
      setSettings(nextSettings);
      setCatalogProducts(nextProducts);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    void api.products(params)
      .then((nextProducts) => {
        setProducts(nextProducts);
        if (!hasFilters) setCatalogProducts(nextProducts);
      })
      .finally(() => setLoading(false));
  }, [hasFilters, params]);

  return (
    <Box className="catalog-shell">
      <Container id="catalogo" maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Paper className="catalog-commerce-band" elevation={0}>
            <Grid container spacing={{ xs: 2.5, md: 3 }} alignItems="center">
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip label="Artenova" size="small" className="brand-chip" />
                    <Typography variant="caption" color="text.secondary" fontWeight={900}>
                      Corte, grabado y detalles personalizados
                    </Typography>
                  </Stack>
                  <Typography variant="h3" sx={{ fontSize: { xs: 30, md: 48 }, lineHeight: 1.02, maxWidth: 760 }}>
                    Regalos y recuerdos hechos para contar una historia.
                  </Typography>
                  <Typography color="text.secondary" sx={{ maxWidth: 660 }}>
                    Elige una pieza, comparte los datos y aprobamos el diseño contigo antes de producir.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                    {quoteUrl ? (
                      <Button href={quoteUrl} target="_blank" rel="noreferrer" variant="contained" startIcon={<MessageCircle size={18} />}>
                        Cotizar por WhatsApp
                      </Button>
                    ) : (
                      <Button component={Link} to="/contacto" variant="contained">
                        Cotizar una idea
                      </Button>
                    )}
                    <Button component="a" href="#catalog-products" variant="outlined">
                      Ver modelos
                    </Button>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack className="process-strip" spacing={1}>
                  <Typography variant="caption" color="text.secondary" fontWeight={900} letterSpacing={0.8}>
                    Cómo trabajamos
                  </Typography>
                  {processSteps.map((step, index) => (
                    <Box key={step.title} className="process-step">
                      <Typography className="process-number">{index + 1}</Typography>
                      <Box minWidth={0}>
                        <Typography fontWeight={900}>{step.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {step.text}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {categories.length > 0 && (
            <Stack spacing={1.5}>
              <SectionHeading eyebrow="Colecciones" title="Explora por ocasión" actionLabel="Ver todo" onAction={() => selectCategory("")} />
              <Grid container spacing={{ xs: 1.5, md: 2 }}>
                {categories.map((item) => {
                  const sample = catalogProducts.find((product) => product.categoryId === item.id);
                  return (
                    <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Button className="collection-card" onClick={() => selectCategory(item.slug)} fullWidth>
                        {sample?.images[0] && <Box component="img" src={sample.images[0].url} alt={sample.images[0].alt || item.name} />}
                        <Box className="collection-card-copy">
                          <Typography variant="h6" fontWeight={900}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2">{item.description ?? "Modelos personalizados para esta ocasión."}</Typography>
                        </Box>
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          )}

          {featuredProduct && (
            <Paper className="featured-product-panel" elevation={0}>
              <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box className="featured-product-image">
                    {featuredProduct.images[0] && <Box component="img" src={featuredProduct.images[0].url} alt={featuredProduct.images[0].alt || featuredProduct.name} />}
                    <Chip icon={<Sparkles size={14} />} label="Destacado" size="small" />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="overline" color="text.secondary" fontWeight={900}>
                      Idea para personalizar
                    </Typography>
                    <Typography variant="h4" fontWeight={900} lineHeight={1.05}>
                      {featuredProduct.name}
                    </Typography>
                    <Typography color="text.secondary">{featuredProduct.description}</Typography>
                    <Typography className="featured-product-price" fontWeight={900}>
                      Desde {formatCurrency(featuredProduct.basePrice)}
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                      <Button component={Link} to={`/producto/${featuredProduct.slug}`} variant="contained">
                        Ver detalles
                      </Button>
                    </Stack>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          )}

          {collectionSections.length > 0 && (
            <Stack spacing={2}>
              <SectionHeading eyebrow="Modelos rápidos" title="Piezas para empezar" />
              {collectionSections.map((section) => (
                <Stack key={section.id} spacing={1.5}>
                  <SectionHeading title={section.title} actionLabel="Ver más modelos" onAction={() => selectCuratedSection(section.filterKey, section.filterValue)} compact />
                  <Grid container spacing={{ xs: 2, md: 3 }}>
                    {section.products.map((product, index) => (
                      <Grid key={product.id} size={{ xs: 12, sm: 6, md: 3 }}>
                        <ProductCard product={product} index={index} />
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              ))}
            </Stack>
          )}

          <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Box className="filter-dock">
                <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 1.75, lg: 2.5 }} alignItems={{ xs: "stretch", lg: "flex-start" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography className="filter-label">Categorías</Typography>
                    <ToggleButtonGroup
                      exclusive
                      value={category}
                      onChange={(_event, value) => updateFilter("category", value ?? "")}
                      aria-label="Filtrar por categoría"
                      className="mobile-scroll-strip"
                      sx={{ flexWrap: { xs: "nowrap", md: "wrap" }, gap: 0.75, "& .MuiToggleButton-root": categoryFilterButtonSx }}
                    >
                      <ToggleButton value="">Todo</ToggleButton>
                      {categories.map((item) => (
                        <ToggleButton key={item.id} value={item.slug}>
                          {item.name}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>

                  {publicTags.length > 0 && (
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography className="filter-label filter-label--tag">Tags</Typography>
                      <ToggleButtonGroup
                        exclusive
                        value={tag}
                        onChange={(_event, value) => updateFilter("tag", value ?? "")}
                        aria-label="Filtrar por tag"
                        className="mobile-scroll-strip"
                        sx={{ flexWrap: { xs: "nowrap", md: "wrap" }, gap: 0.75, "& .MuiToggleButton-root": tagFilterButtonSx }}
                      >
                        <ToggleButton value="">Todos</ToggleButton>
                        {publicTags.map((item) => (
                          <ToggleButton key={item.id} value={item.slug}>
                            {item.name}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Box>
                  )}

                  {hasFilters && (
                    <Button onClick={() => setSearchParams(new URLSearchParams())} sx={{ alignSelf: { xs: "flex-start", lg: "center" }, flexShrink: 0 }}>
                      Limpiar
                    </Button>
                  )}
                </Stack>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                placeholder="Buscar por producto o referencia"
                value={q}
                onChange={(event) => updateFilter("q", event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={18} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "rgba(255,250,245,.94)",
                    boxShadow: "0 18px 45px rgba(64,44,37,.08)",
                  },
                }}
              />
            </Grid>
          </Grid>

          <Box id="catalog-products">
            <Stack spacing={2}>
              <SectionHeading eyebrow="Catálogo" title={activeCategory ? activeCategory.name : hasFilters ? "Resultados" : "Todos los modelos"} />
              {loading ? (
                <CatalogGridSkeleton />
              ) : displayedProducts.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center", border: "1px dashed rgba(64,44,37,.18)", borderRadius: 3, bgcolor: "rgba(255,250,245,.72)" }}>
                  <Stack spacing={2} alignItems="center">
                    <Typography variant="h5" fontWeight={900}>
                      No hay productos con esos filtros
                    </Typography>
                    <Button onClick={() => setSearchParams(new URLSearchParams())} variant="contained">
                      Limpiar filtros
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  {displayedProducts.map((product, index) => (
                    <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <ProductCard product={product} index={index} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          </Box>

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

function SectionHeading({ eyebrow, title, actionLabel, onAction, compact = false }: { eyebrow?: string; title: string; actionLabel?: string; onAction?: () => void; compact?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="end" gap={2}>
      <Box>
        {eyebrow && (
          <Typography variant="caption" color="text.secondary" fontWeight={900} letterSpacing={0.8}>
            {eyebrow}
          </Typography>
        )}
        <Typography variant={compact ? "h6" : "h4"} fontWeight={900} lineHeight={1.08}>
          {title}
        </Typography>
      </Box>
      {actionLabel && (
        <Button onClick={onAction} variant="text" sx={{ flexShrink: 0 }}>
          {actionLabel}
        </Button>
      )}
    </Stack>
  );
}

function buildCollectionSections(categories: Category[], tags: Tag[], products: Product[]) {
  const categorySections = categories
    .map((categoryItem) => {
      const sectionProducts = products.filter((product) => product.categoryId === categoryItem.id).slice(0, 4);
      const title = categoryItem.slug === "mascotas" ? "Para mascotas" : categoryItem.slug === "bodas" ? "Bodas y recuerdos" : categoryItem.name;
      return {
        id: `category-${categoryItem.id}`,
        title,
        filterKey: "category" as const,
        filterValue: categoryItem.slug,
        products: sectionProducts,
      };
    })
    .filter((section) => section.products.length > 0);

  const giftTag = tags.find((item) => item.slug === "recuerdo") ?? tags.find((item) => item.slug.includes("regalo"));
  const giftProducts = giftTag ? products.filter((product) => product.tags.some((item) => item.id === giftTag.id)).slice(0, 4) : [];
  const giftSection =
    giftTag && giftProducts.length > 0
      ? [
          {
            id: `tag-${giftTag.id}`,
            title: "Regalos personalizados",
            filterKey: "tag" as const,
            filterValue: giftTag.slug,
            products: giftProducts,
          },
        ]
      : [];

  return [...categorySections, ...giftSection].slice(0, 3);
}

const categoryFilterButtonSx = {
  minHeight: 42,
  flexShrink: 0,
  border: "1px solid rgba(64,44,37,.16) !important",
  borderRadius: "8px !important",
  px: 1.5,
  bgcolor: "rgba(255,250,245,.92)",
  transition: "transform 180ms ease, background-color 180ms ease, box-shadow 180ms ease",
  "&.Mui-selected": {
    bgcolor: "rgba(143,85,189,.16) !important",
    color: "primary.dark",
    borderColor: "rgba(143,85,189,.42) !important",
    boxShadow: "0 10px 24px rgba(143,85,189,.14)",
  },
  "&:hover": {
    transform: "translateY(-1px)",
    bgcolor: "rgba(255,250,245,.98)",
  },
};

const tagFilterButtonSx = {
  ...categoryFilterButtonSx,
  minHeight: 36,
  borderRadius: "999px !important",
  px: 1.35,
  fontSize: 13,
  bgcolor: "rgba(255,255,255,.56)",
  borderColor: "rgba(239,121,138,.28) !important",
  "&.Mui-selected": {
    bgcolor: "rgba(239,121,138,.13) !important",
    color: "secondary.dark",
    borderColor: "rgba(239,121,138,.48) !important",
    boxShadow: "none",
  },
  "&:hover": {
    transform: "translateY(-1px)",
    bgcolor: "rgba(255,250,245,.98)",
  },
};
