import { useEffect, useMemo, useState } from "react";
import { Button, Grid, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { expenseCategoryLabels, expenseCategoryValues, formatCurrency, type AdminExpense } from "@artenova/shared";
import { FilterX, Plus } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminDataGrid, AdminListToolbar, adminViewEditColumns } from "./adminCrudUi";
import { AdminPageHeader, AdminStat } from "./adminUi";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PA", { year: "numeric", month: "short", day: "numeric" });
}

export function AdminExpensesPage() {
  const [items, setItems] = useState<AdminExpense[]>([]);
  const [queryDraft, setQueryDraft] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [rowCount, setRowCount] = useState(0);
  const [summary, setSummary] = useState({ todayTotal: 0, monthTotal: 0, filteredTotal: 0 });
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const actions = adminViewEditColumns("/admin/gastos");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery((current) => current === queryDraft.trim() ? current : queryDraft.trim());
      setPaginationModel((current) => current.page === 0 ? current : { ...current, page: 0 });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [queryDraft]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    params.set("page", String(paginationModel.page + 1));
    params.set("pageSize", String(paginationModel.pageSize));
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    setLoading(true);
    void api.adminExpenses(params)
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        setRowCount(response.totalItems);
        setSummary(response.summary);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, dateFrom, dateTo, paginationModel.page, paginationModel.pageSize, query]);

  const columns = useMemo<GridColDef<AdminExpense>[]>(() => [
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
      field: "expenseDate",
      headerName: "Fecha",
      minWidth: 140,
      renderCell: ({ row }) => formatDate(row.expenseDate)
    },
    {
      field: "category",
      headerName: "Categoría",
      minWidth: 170,
      renderCell: ({ row }) => expenseCategoryLabels[row.category]
    },
    {
      field: "description",
      headerName: "Descripción",
      flex: 1,
      minWidth: 260
    },
    {
      field: "amount",
      headerName: "Monto",
      minWidth: 140,
      renderCell: ({ row }) => formatCurrency(row.amount)
    }
  ], [actions]);

  const hasFilters = Boolean(queryDraft.trim() || category || dateFrom || dateTo);

  function clearFilters() {
    setQueryDraft("");
    setQuery("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Gastos"
        subtitle="Registra y revisa los gastos operativos sin salir del panel administrativo."
        action={
          <Button component={RouterLink} to="/admin/gastos/nuevo" variant="contained" startIcon={<Plus size={18} />}>
            Nuevo gasto
          </Button>
        }
      />

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <AdminStat label="Hoy" value={formatCurrency(summary.todayTotal)} detail="Basado en la fecha del gasto." />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AdminStat label="Mes actual" value={formatCurrency(summary.monthTotal)} detail="Excluye gastos con fecha futura." />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AdminStat label="Total filtrado" value={formatCurrency(summary.filteredTotal)} detail="Refleja los filtros y la búsqueda activos." />
        </Grid>
      </Grid>

      <AdminListToolbar
        search={queryDraft}
        onSearchChange={setQueryDraft}
        searchLabel="Buscar por descripción o referencia"
        secondaryAction={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              select
              size="small"
              label="Categoría"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPaginationModel((current) => ({ ...current, page: 0 }));
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todas</MenuItem>
              {expenseCategoryValues.map((value) => (
                <MenuItem key={value} value={value}>{expenseCategoryLabels[value]}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="date"
              label="Desde"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPaginationModel((current) => ({ ...current, page: 0 }));
              }}
              sx={{ minWidth: 150 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="Hasta"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPaginationModel((current) => ({ ...current, page: 0 }));
              }}
              sx={{ minWidth: 150 }}
              InputLabelProps={{ shrink: true }}
            />
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

      <AdminDataGrid
        rows={items}
        columns={columns}
        loading={loading}
        rowCount={rowCount}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[20, 50]}
        emptyTitle="Sin gastos"
        emptyDescription="Registra el primer gasto para empezar a llevar control operativo."
      />
    </Stack>
  );
}
