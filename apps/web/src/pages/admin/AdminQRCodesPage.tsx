import { useEffect, useMemo, useState } from "react";
import { Button, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { FilterX, Plus } from "lucide-react";
import type { QRCode } from "@artenova/shared";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminDataGrid, AdminListToolbar, adminViewEditColumns } from "./adminCrudUi";
import { AdminPageHeader, StatusChip } from "./adminUi";

const qrTypeLabels: Record<QRCode["type"], string> = {
  url: "URL",
  whatsapp: "WhatsApp",
  vcard: "vCard",
};

function formatDate(value?: string | null) {
  if (!value) return "Sin escaneos";
  return new Date(value).toLocaleString("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminQRCodesPage() {
  const [codes, setCodes] = useState<QRCode[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const actions = adminViewEditColumns("/admin/qrs");
  const hasFilters = Boolean(query.trim() || statusFilter !== "all" || typeFilter !== "all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void api.adminQRCodes().then((items) => {
      if (!active) return;
      setCodes(items);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return codes.filter((item) => {
      const matchesSearch = !term || [item.name, item.token, item.publicUrl, item.resolvedTarget ?? ""].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [codes, query, statusFilter, typeFilter]);

  const columns = useMemo<GridColDef<QRCode>[]>(() => [
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
      ),
    },
    {
      field: "name",
      headerName: "Nombre",
      minWidth: 220,
      flex: 1,
      renderCell: ({ row }) => (
        <Stack spacing={0.25} minWidth={0}>
          <Typography fontWeight={900} noWrap>{row.name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {row.publicUrl}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "token",
      headerName: "Token",
      minWidth: 130,
    },
    {
      field: "type",
      headerName: "Tipo",
      minWidth: 120,
      renderCell: ({ row }) => qrTypeLabels[row.type],
    },
    {
      field: "status",
      headerName: "Estado",
      minWidth: 120,
      renderCell: ({ row }) => <StatusChip status={row.status} />,
    },
    {
      field: "scanCount",
      headerName: "Escaneos",
      minWidth: 110,
    },
    {
      field: "lastScannedAt",
      headerName: "Último escaneo",
      minWidth: 190,
      flex: 0.7,
      renderCell: ({ row }) => formatDate(row.lastScannedAt),
    },
  ], [actions]);

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  }

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="QR"
        subtitle="Gestiona códigos QR dinámicos independientes del catálogo y revisa su actividad básica."
        action={(
          <Button component={RouterLink} to="/admin/qrs/nuevo" variant="contained" startIcon={<Plus size={18} />}>
            Nuevo QR
          </Button>
        )}
      />
      <AdminListToolbar
        search={query}
        onSearchChange={setQuery}
        searchLabel="Buscar QR"
        secondaryAction={(
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="inactive">Inactivos</MenuItem>
            </TextField>
            <TextField select size="small" label="Tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="url">URL</MenuItem>
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
              <MenuItem value="vcard">vCard</MenuItem>
            </TextField>
            <Tooltip title="Limpiar filtros">
              <span>
                <IconButton aria-label="Limpiar filtros" onClick={clearFilters} disabled={!hasFilters} sx={{ border: "1px solid rgba(64,44,37,.18)", borderRadius: 2 }}>
                  <FilterX size={18} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        )}
      />
      <AdminDataGrid rows={rows} columns={columns} loading={loading} emptyTitle="Sin QR" emptyDescription="Crea el primer QR independiente para empezar a operarlo desde Admin." />
    </Stack>
  );
}
