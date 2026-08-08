import { useEffect, useMemo, useState } from "react";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { FilterX, Plus } from "lucide-react";
import { formatCurrency, resolveMediaStillUrl, type Category, type Product } from "@artenova/shared";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, StatusChip } from "./adminUi";
import { AdminDataGrid, AdminListToolbar, adminViewEditColumns } from "./adminCrudUi";

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const actions = adminViewEditColumns("/admin/productos");
  const hasFilters = Boolean(query.trim() || statusFilter !== "all" || featuredFilter !== "all" || categoryFilter !== "all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([api.adminProducts(), api.adminCategories()]).then(([items, nextCategories]) => {
      if (!active) return;
      setProducts(items);
      setCategories(nextCategories);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const defaultVariant = product.defaultVariant ?? product.variants.find((variant) => variant.isActive) ?? product.variants[0] ?? null;
      const categoryName = categoryById.get(product.categoryId) ?? "";
      const matchesSearch = !term || [product.name, product.slug, defaultVariant?.sku ?? product.sku ?? "", product.description, categoryName].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || (statusFilter === "published" ? product.isPublished : !product.isPublished);
      const matchesFeatured = featuredFilter === "all" || (featuredFilter === "yes" ? product.isFeatured : !product.isFeatured);
      const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;
      return matchesSearch && matchesStatus && matchesFeatured && matchesCategory;
    });
  }, [categoryById, categoryFilter, featuredFilter, products, query, statusFilter]);

  const columns = useMemo<GridColDef<Product>[]>(
    () => [
      {
        field: "actions",
        headerName: "Acciones",
        minWidth: 112,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={0.5}>
            {actions.view(row.id)}
            {actions.edit(row.id)}
          </Stack>
        )
      },
      {
        field: "product",
        headerName: "Producto",
        flex: 1.35,
        minWidth: 300,
        renderCell: ({ row }) => {
          const defaultVariant = row.defaultVariant ?? row.variants.find((variant) => variant.isActive) ?? row.variants[0] ?? null;
          const previewMedia = defaultVariant?.media[0] ?? row.media[0];
          const image = resolveMediaStillUrl(previewMedia);
          return (
            <Stack spacing={0.25} minWidth={0}>
              <Tooltip
                arrow
                enterDelay={500}
                placement="right"
                title={
                  image ? (
                    <Box component="img" src={image} alt={previewMedia?.alt || row.name} sx={{ width: 180, height: 180, objectFit: "cover", borderRadius: 2, display: "block" }} />
                  ) : (
                    "Sin imagen"
                  )
                }
              >
                <Typography component="span" fontWeight={900} noWrap sx={{ cursor: image ? "zoom-in" : "default" }}>
                  {row.name}
                </Typography>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" noWrap>
                {defaultVariant?.sku ? `Ref. ${defaultVariant.sku}` : "Sin referencia"}
              </Typography>
            </Stack>
          );
        }
      },
      {
        field: "category",
        headerName: "Categoría",
        minWidth: 180,
        flex: 0.75,
        renderCell: ({ row }) => categoryById.get(row.categoryId) ?? "Sin categoría"
      },
      {
        field: "status",
        headerName: "Estado",
        minWidth: 140,
        renderCell: ({ row }) => <StatusChip status={row.isPublished ? "published" : "draft"} />
      },
      {
        field: "basePrice",
        headerName: "Precio desde",
        minWidth: 140,
        renderCell: ({ row }) => formatCurrency(row.pricingSummary.finalPrice, row.currencySymbol)
      },
      {
        field: "featured",
        headerName: "Destacado",
        minWidth: 112,
        renderCell: ({ row }) => (row.isFeatured ? "Sí" : "No")
      },
      {
        field: "variants",
        headerName: "Variantes",
        minWidth: 112,
        renderCell: ({ row }) => row.variants.length
      }
    ],
    [actions, categoryById]
  );

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setFeaturedFilter("all");
    setCategoryFilter("all");
  }

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Productos"
        subtitle="Explora el catálogo con filtros y acciones claras antes de abrir cada ficha."
        action={
          <Button component={RouterLink} to="/admin/productos/nuevo" variant="contained" startIcon={<Plus size={18} />}>
            Nuevo producto
          </Button>
        }
      />
      <AdminListToolbar
        search={query}
        onSearchChange={setQuery}
        searchLabel="Buscar producto"
        secondaryAction={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="published">Publicados</MenuItem>
              <MenuItem value="draft">Ocultos</MenuItem>
            </TextField>
            <TextField select size="small" label="Destacado" value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="yes">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
            <TextField select size="small" label="Categoría" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} sx={{ minWidth: 200 }}>
              <MenuItem value="all">Todas</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
              ))}
            </TextField>
            <Tooltip title="Limpiar filtros">
              <span>
                <IconButton aria-label="Limpiar filtros" onClick={clearFilters} disabled={!hasFilters} sx={{ border: "1px solid rgba(64,44,37,.18)", borderRadius: 2 }}>
                  <FilterX size={18} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        }
      />
      <AdminDataGrid rows={rows} columns={columns} loading={loading} emptyTitle="Sin productos" emptyDescription="Crea el primer producto del catálogo." />
    </Stack>
  );
}
