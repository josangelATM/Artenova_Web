import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { FilterX, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { type Category, type Product, type SiteSettings } from "@artenova/shared";
import { api } from "../lib/api";
import { applySeo } from "../lib/seo";
import { ProductCard } from "./ProductCard";
import { CatalogGridSkeleton } from "./SkeletonStates";

export function ProductCatalogView() {
  const navigate = useNavigate();
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const queryCategory = searchParams.get("category") ?? "";
  const category = categorySlug ?? queryCategory;
  const q = searchParams.get("q") ?? "";
  const [searchDraft, setSearchDraft] = useState(q);
  const hasFilters = Boolean(q || category);
  const activeCategory = categories.find((item) => item.slug === category);
  const displayedProducts = hasFilters ? products : catalogProducts.length > 0 ? catalogProducts : products;

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (category) search.set("category", category);
    if (q) search.set("q", q);
    return search;
  }, [category, q]);

  function updateFilter(key: "category" | "q", value: string) {
    if (key === "category") {
      const next = new URLSearchParams(searchParams);
      next.delete("category");
      navigate({ pathname: value ? `/catalogo/${value}` : "/catalogo", search: next.toString() });
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete("category");
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  function clearFilters() {
    navigate("/catalogo");
  }

  function selectCategory(slug: string) {
    const next = new URLSearchParams(searchParams);
    next.delete("category");
    navigate({ pathname: slug ? `/catalogo/${slug}` : "/catalogo", search: next.toString() });
    document.getElementById("catalog-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const allParams = new URLSearchParams();
    void Promise.all([api.categories(), api.settings(), api.products(allParams)]).then(([nextCategories, nextSettings, nextProducts]) => {
      setCategories(nextCategories);
      setSettings(nextSettings);
      setCatalogProducts(nextProducts);
    });
  }, []);

  useEffect(() => {
    if (queryCategory && !categorySlug && !q) {
      navigate(`/catalogo/${queryCategory}`, { replace: true });
    }
  }, [categorySlug, navigate, q, queryCategory]);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    const nextQuery = searchDraft.trim();
    if (nextQuery === q) return;

    const timeoutId = window.setTimeout(() => {
      updateFilter("q", nextQuery);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [q, searchDraft, searchParams, setSearchParams]);

  useEffect(() => {
    const canonicalPath = categorySlug && category ? `/catalogo/${category}` : "/catalogo";
    const title = activeCategory ? `${activeCategory.name} personalizados` : "Catálogo de regalos personalizados";
    const description = activeCategory?.description
      ? `${activeCategory.description} Piezas personalizadas con corte y grabado láser en Panamá.`
      : settings?.heroSubtitle ?? "Taller creativo de corte y grabado láser para mascotas, bodas y detalles personalizados en Panamá.";

    applySeo({
      title,
      description,
      path: canonicalPath,
      image: catalogProducts[0]?.images[0]?.url,
      robots: q ? "noindex,follow" : "index,follow",
      type: "website",
    });
  }, [activeCategory, catalogProducts, category, categorySlug, q, settings]);

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
      <Container id="catalogo" maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        <Stack spacing={{ xs: 2.5, md: 3.5 }}>
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

          <Box className="catalog-premium-bar">
            <Grid container spacing={{ xs: 1.5, md: 2.5 }} alignItems="center">
              <Grid size={{ xs: 12, lg: 7 }}>
                <Stack spacing={1.1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box className="catalog-premium-icon">
                      <SlidersHorizontal size={16} />
                    </Box>
                    <Typography className="filter-label" sx={{ mb: 0 }}>
                      Categorías
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.9} alignItems="center" className="catalog-filter-row">
                    <Tooltip title="Limpiar filtros">
                      <span>
                        <IconButton
                          onClick={clearFilters}
                          disabled={!hasFilters}
                          className="catalog-clear-button"
                          aria-label="Limpiar filtros"
                        >
                          <FilterX size={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <ToggleButtonGroup
                      exclusive
                      value={category}
                      onChange={(_event, value) => updateFilter("category", value ?? "")}
                      aria-label="Filtrar por categoría"
                      className="catalog-premium-categories mobile-scroll-strip"
                      sx={{ flexWrap: { xs: "nowrap", md: "wrap" }, gap: 0.9, "& .MuiToggleButton-root": categoryFilterButtonSx }}
                    >
                      <ToggleButton value="">
                        <Sparkles size={14} />
                        Todo
                      </ToggleButton>
                      {categories.map((item) => (
                        <ToggleButton key={item.id} value={item.slug}>
                          {item.name}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, lg: 5 }}>
                <Stack spacing={1.1}>
                  <Typography className="filter-label" sx={{ mb: 0 }}>
                    Buscar
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Busca por nombre, referencia o idea"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    className="catalog-premium-search"
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
                        bgcolor: "#FFFDFC",
                        borderRadius: "999px",
                        boxShadow: "0 10px 24px rgba(63, 35, 27, 0.08)",
                      },
                    }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Box>

          <Box id="catalog-products">
            <Stack spacing={2}>
              <SectionHeading eyebrow="Catálogo" title={activeCategory ? activeCategory.name : hasFilters ? "Resultados" : "Todos los modelos"} />
              {loading ? (
                <CatalogGridSkeleton />
              ) : displayedProducts.length === 0 ? (
                <Box className="catalog-empty-state">
                  <Stack spacing={2} alignItems="center">
                    <Typography variant="h5" fontWeight={900}>
                      No hay productos con esos filtros
                    </Typography>
                    <Button onClick={clearFilters} variant="contained">
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

const categoryFilterButtonSx = {
  minHeight: 38,
  flexShrink: 0,
  border: "1px solid #E5D6DE !important",
  borderRadius: "999px !important",
  px: 1.15,
  gap: 0.5,
  fontSize: 13,
  fontWeight: 700,
  bgcolor: "#FFFDFC",
  color: "#74584E",
  transition: "transform 180ms ease, background-color 180ms ease, border-color 180ms ease",
  "&.Mui-selected": {
    bgcolor: "#F1E4F8 !important",
    color: "#6E2FA0",
    borderColor: "rgba(145,70,199,.34) !important",
  },
  "&:hover": {
    transform: "translateY(-1px)",
    bgcolor: "#F8F1EC",
  },
};
