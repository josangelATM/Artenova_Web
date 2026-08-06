import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, FormControlLabel, IconButton, Menu, MenuItem, Paper, Stack, TextField, Tooltip, Typography, useMediaQuery } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import { FilterX, Plus } from "lucide-react";
import { formatCurrency, type AdminOrderPaymentInput, type Order } from "@artenova/shared";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, StatusChip, adminSurfaceSx } from "./adminUi";
import { AdminDataGrid, AdminListToolbar } from "./adminCrudUi";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PA", { year: "numeric", month: "short", day: "numeric" });
}

export function AdminOrdersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [balanceOnly, setBalanceOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [paymentMenuAnchor, setPaymentMenuAnchor] = useState<null | HTMLElement>(null);
  const [paymentOrderId, setPaymentOrderId] = useState("");

  const paymentMethods: Array<{ value: AdminOrderPaymentInput["method"]; label: string }> = [
    { value: "efectivo", label: "Efectivo" },
    { value: "yappy", label: "Yappy" },
    { value: "transferencia", label: "Transferencia" },
    { value: "otro", label: "Otro" },
  ];

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (balanceOnly) params.set("hasBalance", "true");
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    setLoading(true);
    void api.adminOrders(params).then((items) => {
      if (!active) return;
      setOrders(items);
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [balanceOnly, dateFrom, dateTo, query, statusFilter]);

  async function markDelivered(id: string) {
    setUpdatingId(id);
    try {
      const updated = await api.updateAdminOrderStatus(id, { status: "entregado" });
      setOrders((current) => current.map((order) => order.id === id ? updated : order));
    } finally {
      setUpdatingId("");
    }
  }

  function openPaymentMenu(event: MouseEvent<HTMLElement>, id: string) {
    setPaymentMenuAnchor(event.currentTarget);
    setPaymentOrderId(id);
  }

  function closePaymentMenu() {
    setPaymentMenuAnchor(null);
    setPaymentOrderId("");
  }

  async function markPaid(method: AdminOrderPaymentInput["method"]) {
    const order = orders.find((current) => current.id === paymentOrderId);
    if (!order || order.balance <= 0) {
      closePaymentMenu();
      return;
    }

    setUpdatingId(order.id);
    try {
      const updated = await api.createOrderPayment(order.id, {
        amount: order.balance,
        method,
        reference: null,
        note: "Pago completo registrado desde la lista de pedidos.",
      });
      setOrders((current) => current.map((item) => item.id === order.id ? updated : item));
    } finally {
      setUpdatingId("");
      closePaymentMenu();
    }
  }

  const columns = useMemo<GridColDef<Order>[]>(() => [
    {
      field: "actions",
      headerName: "Acciones",
      minWidth: 220,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Button component={RouterLink} to={`/admin/pedidos/${row.id}`} size="small" variant="text">
            Ver
          </Button>
          <Button component={RouterLink} to={`/admin/pedidos/${row.id}/editar`} size="small" variant="text">
            Editar
          </Button>
          {row.balance > 0 && (
            <Button size="small" variant="text" disabled={updatingId === row.id} onClick={(event) => openPaymentMenu(event, row.id)}>
              Pagado
            </Button>
          )}
          {row.status !== "entregado" && (
            <Button size="small" variant="text" disabled={updatingId === row.id} onClick={() => void markDelivered(row.id)}>
              Entregado
            </Button>
          )}
        </Stack>
      ),
    },
    {
      field: "code",
      headerName: "Pedido",
      minWidth: 140,
      renderCell: ({ row }) => (
        <Stack spacing={0.25}>
          <Typography component="span" fontWeight={900}>{row.code}</Typography>
          <Typography variant="caption" color="text.secondary">{formatDate(row.createdAt)}</Typography>
        </Stack>
      ),
    },
    {
      field: "customerName",
      headerName: "Cliente",
      minWidth: 230,
      flex: 1,
      renderCell: ({ row }) => (
        <Stack spacing={0.25} minWidth={0}>
          <Typography component="span" fontWeight={900} noWrap>{row.customerName}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{row.customerWhatsapp}</Typography>
        </Stack>
      ),
    },
    {
      field: "itemsCount",
      headerName: "Items",
      minWidth: 96,
      valueGetter: (_value, row) => row.items.length,
    },
    {
      field: "finalPrice",
      headerName: "Total",
      minWidth: 120,
      renderCell: ({ row }) => formatCurrency(row.finalPrice ?? row.itemsTotal),
    },
    {
      field: "paidTotal",
      headerName: "Abonado",
      minWidth: 120,
      renderCell: ({ row }) => formatCurrency(row.paidTotal),
    },
    {
      field: "balance",
      headerName: "Saldo",
      minWidth: 120,
      renderCell: ({ row }) => (
        <Typography color={row.balance > 0 ? "warning.main" : "success.main"} fontWeight={900}>
          {formatCurrency(row.balance)}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Estado",
      minWidth: 128,
      renderCell: ({ row }) => <StatusChip status={row.status} />,
    },
  ], [updatingId]);

  const hasFilters = Boolean(query.trim() || statusFilter !== "all" || balanceOnly || dateFrom || dateTo);

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setBalanceOnly(false);
    setDateFrom("");
    setDateTo("");
  }

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Pedidos"
        subtitle="Centraliza captura manual, cobros y seguimiento sin volver al Excel."
        action={
          <Button component={RouterLink} to="/admin/pedidos/nuevo" variant="contained" startIcon={<Plus size={18} />}>
            Nuevo pedido
          </Button>
        }
      />
      <AdminListToolbar
        search={query}
        onSearchChange={setQuery}
        searchLabel="Buscar por cliente, WhatsApp o código"
        secondaryAction={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="nuevo">Nuevo</MenuItem>
              <MenuItem value="pendiente_diseno">Pendiente por diseño</MenuItem>
              <MenuItem value="pendiente_aprobacion">Pendiente por aprobación</MenuItem>
              <MenuItem value="pendiente_fabricacion">Pendiente por fabricación</MenuItem>
              <MenuItem value="pendiente_imprimir">Pendiente por imprimir</MenuItem>
              <MenuItem value="listo_entrega">Listo para entrega</MenuItem>
              <MenuItem value="entregado">Entregado</MenuItem>
            </TextField>
            <TextField size="small" type="date" label="Desde" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} sx={{ minWidth: 150 }} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label="Hasta" value={dateTo} onChange={(event) => setDateTo(event.target.value)} sx={{ minWidth: 150 }} InputLabelProps={{ shrink: true }} />
            <FormControlLabel control={<Checkbox checked={balanceOnly} onChange={(event) => setBalanceOnly(event.target.checked)} />} label="Solo con saldo" />
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

      {isMobile ? (
        <Stack spacing={1.25}>
          {!loading && orders.length === 0 && (
            <Paper sx={{ ...adminSurfaceSx, p: 2.5 }}>
              <Typography fontWeight={900}>Sin pedidos</Typography>
              <Typography color="text.secondary">Crea el primer pedido manual para empezar a operar desde Admin.</Typography>
            </Paper>
          )}
          {orders.map((order) => (
            <Paper key={order.id} sx={{ ...adminSurfaceSx, p: 1.5 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
                  <Stack spacing={0.25}>
                    <Typography fontWeight={900}>{order.code}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(order.createdAt)}</Typography>
                  </Stack>
                  <StatusChip status={order.status} />
                </Stack>
                <Typography fontWeight={800}>{order.customerName}</Typography>
                <Typography variant="body2" color="text.secondary">{order.customerWhatsapp}</Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <Typography variant="body2">Items: <strong>{order.items.length}</strong></Typography>
                  <Typography variant="body2">Total: <strong>{formatCurrency(order.finalPrice ?? order.itemsTotal)}</strong></Typography>
                  <Typography variant="body2">Abonado: <strong>{formatCurrency(order.paidTotal)}</strong></Typography>
                  <Typography variant="body2">Saldo: <strong>{formatCurrency(order.balance)}</strong></Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button fullWidth component={RouterLink} to={`/admin/pedidos/${order.id}`} variant="outlined">
                    Ver
                  </Button>
                  <Button fullWidth component={RouterLink} to={`/admin/pedidos/${order.id}/editar`} variant="outlined">
                    Editar
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {order.balance > 0 && (
                    <Button variant="text" disabled={updatingId === order.id} onClick={(event) => openPaymentMenu(event, order.id)}>
                      Pagado
                    </Button>
                  )}
                  {order.status !== "entregado" && (
                    <Button variant="text" disabled={updatingId === order.id} onClick={() => void markDelivered(order.id)}>
                      Marcar entregado
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <AdminDataGrid rows={orders} columns={columns} loading={loading} emptyTitle="Sin pedidos" emptyDescription="Crea el primer pedido manual para empezar a operar desde Admin." />
      )}
      <Menu anchorEl={paymentMenuAnchor} open={Boolean(paymentMenuAnchor)} onClose={closePaymentMenu}>
        {paymentMethods.map((method) => (
          <MenuItem key={method.value} onClick={() => void markPaid(method.value)}>
            {method.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
