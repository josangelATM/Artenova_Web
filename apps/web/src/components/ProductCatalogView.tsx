import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
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
import { resolveMediaStillUrl, type CatalogProductCard, type Category, type SiteSettings } from "@artenova/shared";
import { api } from "../lib/api";
import { applySeo } from "../lib/seo";
import { ProductCard } from "./ProductCard";
import { CatalogGridSkeleton } from "./SkeletonStates";

const catalogPageSize = 24;

export function ProductCatalogView() {
  const navigate = useNavigate();
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<CatalogProductCard[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [requestKey, setRequestKey] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const activeRequestKeyRef = useRef("");
  const isAppendingRef = useRef(false);

  const queryCategory = searchParams.get("category") ?? "";
  const category = categorySlug ?? queryCategory;
  const q = searchParams.get("q") ?? "";
  const [searchDraft, setSearchDraft] = useState(q);
  const hasFilters = Boolean(q || category);
  const activeCategory = categories.find((item) => item.slug === category);
  const catalogHeroProduct = products[0];
  const catalogHeroMedia = catalogHeroProduct?.defaultVariant?.media[0] ?? catalogHeroProduct?.media[0];

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

  useEffect(() => {
    void Promise.all([api.categories(), api.settings()]).then(([nextCategories, nextSettings]) => {
      setCategories(nextCategories);
      setSettings(nextSettings);
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
    const nextRequestKey = JSON.stringify({ category, q });
    activeRequestKeyRef.current = nextRequestKey;
    setRequestKey(nextRequestKey);
    setProducts([]);
    setNextCursor(null);
    setHasMore(false);
    setIsAppending(false);
    isAppendingRef.current = false;
    setIsInitialLoading(true);

    const nextParams = new URLSearchParams(params);
    nextParams.set("limit", String(catalogPageSize));

    void api.products(nextParams)
      .then((response) => {
        if (activeRequestKeyRef.current !== nextRequestKey) return;
        setProducts(response.items);
        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
      })
      .finally(() => {
        if (activeRequestKeyRef.current === nextRequestKey) {
          setIsInitialLoading(false);
        }
      });
  }, [category, params, q]);

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
      image: resolveMediaStillUrl(catalogHeroMedia),
      robots: q ? "noindex,follow" : "index,follow",
      type: "website",
    });
  }, [activeCategory, catalogHeroMedia, category, categorySlug, products, q, settings]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isInitialLoading || isAppending || !nextCursor) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        if (activeRequestKeyRef.current !== requestKey) return;
        if (isAppendingRef.current) return;

        isAppendingRef.current = true;
        setIsAppending(true);
        const nextParams = new URLSearchParams(params);
        nextParams.set("limit", String(catalogPageSize));
        nextParams.set("cursor", nextCursor);

        void api.products(nextParams)
          .then((response) => {
            if (activeRequestKeyRef.current !== requestKey) return;
            setProducts((current) => [...current, ...response.items]);
            setNextCursor(response.nextCursor);
            setHasMore(response.hasMore);
          })
          .finally(() => {
            if (activeRequestKeyRef.current === requestKey) {
              isAppendingRef.current = false;
              setIsAppending(false);
            }
          });
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isAppending, isInitialLoading, nextCursor, params, requestKey]);

  return (
    <Box className="catalog-shell">
      <Container id="catalogo" maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        <Stack spacing={{ xs: 2.5, md: 3.5 }}>
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
              {isInitialLoading ? (
                <CatalogGridSkeleton />
              ) : products.length === 0 ? (
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
                <Stack spacing={2.5}>
                  <Grid container spacing={{ xs: 2, md: 3 }}>
                    {products.map((product, index) => (
                      <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <ProductCard product={product} index={index} />
                      </Grid>
                    ))}
                  </Grid>

                  {hasMore ? (
                    <Box
                      ref={sentinelRef}
                      data-testid="catalog-load-more-sentinel"
                      sx={{ display: "flex", justifyContent: "center", py: 1.5, minHeight: 36 }}
                    >
                      {isAppending ? <CircularProgress size={24} aria-label="Cargando más productos" /> : null}
                    </Box>
                  ) : null}
                </Stack>
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
