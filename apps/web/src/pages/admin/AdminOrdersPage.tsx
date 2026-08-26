import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Menu, MenuItem, Paper, Stack, TextField, Tooltip, Typography, useMediaQuery } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import { FilterX, Plus } from "lucide-react";
import { formatCurrency, orderContactMethodLabels, orderStatusLabels, orderStatusValues, type AdminOrderPaymentInput, type Order, type OrderStatus } from "@artenova/shared";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, StatusChip, adminSurfaceSx } from "./adminUi";
import { AdminDataGrid, AdminGridAction, AdminListToolbar, adminGridActionIcons } from "./adminCrudUi";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PA", { year: "numeric", month: "short", day: "numeric" });
}

function summarizeOrderItems(order: Order, limit = 2) {
  const visibleItems = order.items.slice(0, limit).map((item) => ({
    id: item.id,
    label: `${item.quantity} x ${item.productName}`,
  }));

  return {
    visibleItems,
    remainingCount: Math.max(0, order.items.length - visibleItems.length),
  };
}

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [balanceOnly, setBalanceOnly] = useState(searchParams.get("hasBalance") === "true");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [paymentMenuAnchor, setPaymentMenuAnchor] = useState<null | HTMLElement>(null);
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [statusOrder, setStatusOrder] = useState<Order | null>(null);
  const [statusDraft, setStatusDraft] = useState<OrderStatus | "">("");

  const paymentMethods: Array<{ value: AdminOrderPaymentInput["method"]; label: string }> = [
    { value: "efectivo", label: "Efectivo" },
    { value: "yappy", label: "Yappy" },
    { value: "transferencia", label: "Transferencia" },
    { value: "otro", label: "Otro" },
  ];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (debouncedQuery) nextParams.set("q", debouncedQuery);
    if (statusFilter !== "all") nextParams.set("status", statusFilter);
    if (balanceOnly) nextParams.set("hasBalance", "true");
    if (dateFrom) nextParams.set("dateFrom", dateFrom);
    if (dateTo) nextParams.set("dateTo", dateTo);
    setSearchParams(nextParams, { replace: true });
  }, [balanceOnly, dateFrom, dateTo, debouncedQuery, setSearchParams, statusFilter]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
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
  }, [balanceOnly, dateFrom, dateTo, debouncedQuery, statusFilter]);

  function openPaymentMenu(event: MouseEvent<HTMLElement>, id: string) {
    setPaymentMenuAnchor(event.currentTarget);
    setPaymentOrderId(id);
  }

  function closePaymentMenu() {
    setPaymentMenuAnchor(null);
    setPaymentOrderId("");
  }

  function openStatusDialog(order: Order) {
    setStatusOrder(order);
    setStatusDraft(order.status);
  }

  function closeStatusDialog() {
    if (updatingId) return;
    setStatusOrder(null);
    setStatusDraft("");
  }

  async function saveStatusChange() {
    if (!statusOrder || !statusDraft || statusDraft === statusOrder.status) return;

    setUpdatingId(statusOrder.id);
    try {
      const updated = await api.updateAdminOrderStatus(statusOrder.id, { status: statusDraft });
      setOrders((current) => current.map((order) => order.id === statusOrder.id ? updated : order));
      setStatusOrder(null);
      setStatusDraft("");
    } finally {
      setUpdatingId("");
    }
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

  const visibleOrders = useMemo(() => {
    const normalizedQuery = debouncedQuery.toLocaleLowerCase("es");
    if (!normalizedQuery) return orders;

    return orders.filter((order) => [
      order.code,
      order.customerName,
      order.customerWhatsapp ?? "",
      order.contactMethod,
      orderContactMethodLabels[order.contactMethod],
    ].some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery)));
  }, [debouncedQuery, orders]);

  const columns = useMemo<GridColDef<Order>[]>(() => [
    {
      field: "actions",
      headerName: "Acciones",
      minWidth: 180,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <AdminGridAction label="Editar" icon={adminGridActionIcons.edit} to={`/admin/pedidos/${row.id}/editar`} />
          {row.balance > 0 && (
            <AdminGridAction
              label="Registrar pago completo"
              icon={adminGridActionIcons.markPaid}
              disabled={updatingId === row.id}
              onClick={(event) => openPaymentMenu(event, row.id)}
            />
          )}
          <AdminGridAction
            label="Cambiar estado"
            icon={adminGridActionIcons.changeStatus}
            disabled={updatingId === row.id}
            onClick={() => openStatusDialog(row)}
          />
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
      minWidth: 200,
      flex: 1,
      renderCell: ({ row }) => (
        <Stack spacing={0.25} minWidth={0}>
          <Typography component="span" fontWeight={900} noWrap>{row.customerName}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{orderContactMethodLabels[row.contactMethod]}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{row.customerWhatsapp || "Sin cuenta"}</Typography>
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
      field: "itemsPreview",
      headerName: "Resumen",
      minWidth: 260,
      flex: 1.15,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => {
        const summary = summarizeOrderItems(row);

        return (
          <Stack spacing={0.4} minWidth={0} py={0.75}>
            {summary.visibleItems.map((item) => (
              <Typography key={item.id} variant="caption" noWrap title={item.label}>
                {item.label}
              </Typography>
            ))}
            {summary.remainingCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                +{summary.remainingCount} mÃ¡s
              </Typography>
            )}
          </Stack>
        );
      },
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
      minWidth: 220,
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
        action={
          <Button component={RouterLink} to="/admin/pedidos/nuevo" variant="contained" startIcon={<Plus size={18} />}>
            Nuevo pedido
          </Button>
        }
      />
      <AdminListToolbar
        search={query}
        onSearchChange={setQuery}
        searchLabel="Buscar por cliente, cuenta o código"
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
          {visibleOrders.map((order) => {
            const summary = summarizeOrderItems(order, 3);

            return (
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
                <Typography variant="body2" color="text.secondary">{orderContactMethodLabels[order.contactMethod]}</Typography>
                <Typography variant="body2" color="text.secondary">{order.customerWhatsapp || "Sin cuenta"}</Typography>
                <Stack spacing={0.35}>
                  {summary.visibleItems.map((item) => (
                    <Typography key={item.id} variant="caption" color="text.secondary" noWrap>
                      {item.label}
                    </Typography>
                  ))}
                  {summary.remainingCount > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      +{summary.remainingCount} mÃ¡s
                    </Typography>
                  )}
                </Stack>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <Typography variant="body2">Items: <strong>{order.items.length}</strong></Typography>
                  <Typography variant="body2">Total: <strong>{formatCurrency(order.finalPrice ?? order.itemsTotal)}</strong></Typography>
                  <Typography variant="body2">Abonado: <strong>{formatCurrency(order.paidTotal)}</strong></Typography>
                  <Typography variant="body2">Saldo: <strong>{formatCurrency(order.balance)}</strong></Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
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
                  <Button variant="text" disabled={updatingId === order.id} onClick={() => openStatusDialog(order)}>
                    Cambiar estado
                  </Button>
                </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      ) : (
        <AdminDataGrid rows={visibleOrders} columns={columns} loading={loading} emptyTitle="Sin pedidos" emptyDescription="Crea el primer pedido manual para empezar a operar desde Admin." />
      )}
      <Menu anchorEl={paymentMenuAnchor} open={Boolean(paymentMenuAnchor)} onClose={closePaymentMenu}>
        {paymentMethods.map((method) => (
          <MenuItem key={method.value} onClick={() => void markPaid(method.value)}>
            {method.label}
          </MenuItem>
        ))}
      </Menu>
      <Dialog open={Boolean(statusOrder)} onClose={closeStatusDialog} fullWidth maxWidth="xs">
        <DialogTitle>Cambiar estado</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            autoFocus
            margin="dense"
            label="Estado del pedido"
            value={statusDraft}
            onChange={(event) => setStatusDraft(event.target.value as OrderStatus)}
          >
            {orderStatusValues.map((status) => (
              <MenuItem key={status} value={status}>
                {orderStatusLabels[status]}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStatusDialog} disabled={Boolean(updatingId)}>Cancelar</Button>
          <Button onClick={() => void saveStatusChange()} variant="contained" disabled={!statusOrder || !statusDraft || statusDraft === statusOrder.status || Boolean(updatingId)}>
            Guardar cambio
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
