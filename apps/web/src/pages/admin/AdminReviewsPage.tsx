import { useEffect, useMemo, useState } from "react";
import { Button, MenuItem, Rating, Stack, TextField } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { Plus } from "lucide-react";
import type { Product, ProductReview } from "@artenova/shared";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, StatusChip } from "./adminUi";
import { AdminDataGrid, AdminListToolbar, adminViewEditColumns } from "./adminCrudUi";

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [productFilter, setProductFilter] = useState("");
  const actions = adminViewEditColumns("/admin/resenas");

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (productFilter) params.set("productId", productFilter);
    if (query.trim()) params.set("q", query.trim());
    void Promise.all([api.adminReviews(params), api.adminProducts()]).then(([items, allProducts]) => {
      if (!active) return;
      setReviews(items);
      setProducts(allProducts);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [productFilter, query, status]);

  const columns = useMemo<GridColDef<ProductReview>[]>(
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
      { field: "customerName", headerName: "Cliente", flex: 1, minWidth: 180 },
      { field: "productName", headerName: "Producto", flex: 1.1, minWidth: 220 },
      {
        field: "rating",
        headerName: "Calificación",
        minWidth: 150,
        renderCell: ({ row }) => <Rating value={row.rating} readOnly size="small" />
      },
      {
        field: "isApproved",
        headerName: "Estado",
        minWidth: 130,
        renderCell: ({ row }) => <StatusChip status={row.isApproved ? "approved" : "hidden"} />
      },
      {
        field: "comment",
        headerName: "Comentario",
        flex: 1.5,
        minWidth: 240,
        renderCell: ({ row }) => row.comment
      }
    ],
    [actions]
  );

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Reseñas"
        subtitle="Modera opiniones con un flujo limpio de listado, detalle y edición."
        action={
          <Button component={RouterLink} to="/admin/resenas/nuevo" variant="contained" startIcon={<Plus size={18} />}>
            Nueva reseña
          </Button>
        }
      />
      <AdminListToolbar
        search={query}
        onSearchChange={setQuery}
        searchLabel="Buscar reseña"
        secondaryAction={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Estado" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="approved">Publicadas</MenuItem>
              <MenuItem value="hidden">Ocultas</MenuItem>
            </TextField>
            <TextField select size="small" label="Producto" value={productFilter} onChange={(event) => setProductFilter(event.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">Todos</MenuItem>
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      />
      <AdminDataGrid rows={reviews} columns={columns} loading={loading} emptyTitle="Sin reseñas" emptyDescription="Cuando lleguen opiniones, aparecerán aquí." />
    </Stack>
  );
}
