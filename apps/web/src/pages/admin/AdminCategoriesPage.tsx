import { useEffect, useMemo, useState } from "react";
import { Button, Stack } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { Plus } from "lucide-react";
import type { Category } from "@artenova/shared";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, StatusChip } from "./adminUi";
import { AdminDataGrid, AdminListToolbar, adminViewEditColumns } from "./adminCrudUi";

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const actions = adminViewEditColumns("/admin/categorias");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void api.adminCategories().then((items) => {
      if (!active) return;
      setCategories(items);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((category) => [category.name, category.slug, category.description ?? ""].some((value) => value.toLowerCase().includes(term)));
  }, [categories, query]);

  const columns = useMemo<GridColDef<Category>[]>(
    () => [
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        minWidth: 172,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={0.5}>
            {actions.view(row.id)}
            {actions.edit(row.id)}
          </Stack>
        )
      },
      { field: "name", headerName: "Nombre", flex: 1.1, minWidth: 220 },
      { field: "slug", headerName: "Enlace corto", flex: 0.9, minWidth: 180 },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1.4,
        minWidth: 240,
        renderCell: ({ row }) => row.description || "Sin descripción"
      },
      {
        field: "isActive",
        headerName: "Estado",
        minWidth: 130,
        renderCell: ({ row }) => <StatusChip status={row.isActive ? "active" : "paused"} />
      }
    ],
    [actions]
  );

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Categorías"
        subtitle="Explora, revisa y administra las colecciones del catálogo."
        action={
          <Button component={RouterLink} to="/admin/categorias/nuevo" variant="contained" startIcon={<Plus size={18} />}>
            Nueva categoría
          </Button>
        }
      />
      <AdminListToolbar search={query} onSearchChange={setQuery} searchLabel="Buscar categoría" />
      <AdminDataGrid rows={rows} columns={columns} loading={loading} emptyTitle="Sin categorías" emptyDescription="Crea una categoría para organizar el catálogo." />
    </Stack>
  );
}
