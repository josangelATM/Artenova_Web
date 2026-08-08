import type { ReactNode } from "react";
import { Box, Breadcrumbs, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel, type GridRowsProp } from "@mui/x-data-grid";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, CheckCheck, Eye, HandCoins, Pencil } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { AdminEmptyState, adminSurfaceSx } from "./adminUi";

export function AdminBreadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <Breadcrumbs aria-label="breadcrumb">
      {items.map((item) =>
        item.to ? (
          <Typography key={`${item.label}-${item.to}`} component={RouterLink} to={item.to} color="inherit" sx={{ textDecoration: "none" }}>
            {item.label}
          </Typography>
        ) : (
          <Typography key={item.label} color="text.primary">
            {item.label}
          </Typography>
        )
      )}
    </Breadcrumbs>
  );
}

export function AdminListToolbar({
  search,
  onSearchChange,
  searchLabel,
  primaryAction,
  secondaryAction
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <Paper sx={{ ...adminSurfaceSx, p: 1.5 }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "center" }}>
        <TextField size="small" label={searchLabel} value={search} onChange={(event) => onSearchChange(event.target.value)} sx={{ maxWidth: { lg: 380 } }} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {secondaryAction}
          {primaryAction}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function AdminDataGrid({
  rows,
  columns,
  loading,
  emptyTitle,
  emptyDescription,
  getRowId,
  paginationMode,
  paginationModel,
  onPaginationModelChange,
  rowCount,
  pageSizeOptions
}: {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  getRowId?: (row: any) => string;
  paginationMode?: "client" | "server";
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  rowCount?: number;
  pageSizeOptions?: number[];
}) {
  return (
    <Paper sx={{ ...adminSurfaceSx, p: 1 }}>
      <Box sx={{ minHeight: 480 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={getRowId}
          paginationMode={paginationMode}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          rowCount={rowCount}
          disableRowSelectionOnClick
          pageSizeOptions={pageSizeOptions ?? [10, 25, 50]}
          initialState={paginationModel ? undefined : { pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          slots={{
            noRowsOverlay: () => <AdminEmptyState title={emptyTitle} description={emptyDescription} />,
            noResultsOverlay: () => <AdminEmptyState title="Sin resultados" description="Ajusta los filtros o la búsqueda." />
          }}
          sx={{
            border: 0,
            "--DataGrid-overlayHeight": "280px",
            "& .MuiDataGrid-columnHeaders": { borderBottom: "1px solid rgba(64,44,37,.10)", backgroundColor: "rgba(255,255,255,.56)" },
            "& .MuiDataGrid-cell": { borderBottom: "1px solid rgba(64,44,37,.08)", alignItems: "center" },
            "& .MuiDataGrid-footerContainer": { borderTop: "1px solid rgba(64,44,37,.10)" }
          }}
        />
      </Box>
    </Paper>
  );
}

export function AdminDetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper sx={{ ...adminSurfaceSx, p: { xs: 2, md: 3 } }}>
      <Stack spacing={1.25}>
        <Typography variant="h6" fontWeight={900}>
          {title}
        </Typography>
        {children}
      </Stack>
    </Paper>
  );
}

export function AdminField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={800} sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function AdminBackButton({ to, label = "Volver" }: { to: string; label?: string }) {
  return (
    <Button component={RouterLink} to={to} variant="outlined" startIcon={<ArrowLeft size={18} />}>
      {label}
    </Button>
  );
}

export function AdminGridAction({
  label,
  icon: Icon,
  to,
  onClick,
  disabled = false
}: {
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          component={to ? RouterLink : "button"}
          to={to}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          size="small"
          sx={{ borderRadius: 2 }}
        >
          <Icon size={16} />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function adminViewEditColumns(basePath: string) {
  return {
    view: (id: string) => (
      <AdminGridAction label="Ver" icon={Eye} to={`${basePath}/${id}`} />
    ),
    edit: (id: string) => (
      <AdminGridAction label="Editar" icon={Pencil} to={`${basePath}/${id}/editar`} />
    )
  };
}

export const adminGridActionIcons = {
  view: Eye,
  edit: Pencil,
  markPaid: HandCoins,
  markDelivered: CheckCheck
} as const;
