import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Grid, Link, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { expenseCategoryLabels, expensePaymentMethodLabels, formatCurrency, orderStatusLabels, type AdminFinanceOverview, type AdminFinanceRangePreset } from "@artenova/shared";
import { ArrowRightLeft, CalendarRange, HandCoins, ReceiptText, Wallet } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, AdminSection, AdminStat, StatusChip, adminSurfaceSx } from "./adminUi";

const rangeOptions: Array<{ value: AdminFinanceRangePreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "last7", label: "7 días" },
  { value: "thisMonth", label: "Mes" },
  { value: "last30", label: "30 días" },
];

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, days: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days, 0, 0, 0, 0));
}

function resolveRange(preset: AdminFinanceRangePreset) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayValue = formatDateInput(today);

  switch (preset) {
    case "today":
      return { dateFrom: todayValue, dateTo: todayValue };
    case "last7":
      return { dateFrom: formatDateInput(addUtcDays(today, -6)), dateTo: todayValue };
    case "last30":
      return { dateFrom: formatDateInput(addUtcDays(today, -29)), dateTo: todayValue };
    case "custom":
      return { dateFrom: todayValue, dateTo: todayValue };
    case "thisMonth":
    default:
      return { dateFrom: formatDateInput(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 0, 0, 0, 0))), dateTo: todayValue };
  }
}

function buildFinanceParams(rangePreset: AdminFinanceRangePreset, dateFrom: string, dateTo: string) {
  const params = new URLSearchParams();
  params.set("rangePreset", rangePreset);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  return params;
}

function buildOrdersLink(dateFrom: string, dateTo: string, extra?: Record<string, string>) {
  const params = new URLSearchParams(extra ?? {});
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  return `/admin/pedidos?${params.toString()}`;
}

function buildExpensesLink(dateFrom: string, dateTo: string, extra?: Record<string, string>) {
  const params = new URLSearchParams(extra ?? {});
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  return `/admin/gastos?${params.toString()}`;
}

function BreakdownBars({ title, rows, emptyLabel, valueLabel, actionBuilder }: {
  title: string;
  rows: Array<{ key: string; label: string; total: number; count: number }>;
  emptyLabel: string;
  valueLabel: string;
  actionBuilder?: (key: string) => string;
}) {
  const maxValue = Math.max(...rows.map((row) => row.total), 0);

  return (
    <AdminSection title={title}>
      <Stack spacing={1.1}>
        {rows.length === 0 && <Typography color="text.secondary">{emptyLabel}</Typography>}
        {rows.map((row) => {
          const content = (
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography fontWeight={800}>{row.label}</Typography>
                <Typography variant="body2" color="text.secondary">{formatCurrency(row.total)} • {row.count} {valueLabel}</Typography>
              </Stack>
              <Box sx={{ height: 10, borderRadius: 999, bgcolor: "rgba(145,70,199,.10)", overflow: "hidden" }}>
                <Box sx={{ width: `${maxValue > 0 ? (row.total / maxValue) * 100 : 0}%`, height: "100%", bgcolor: "primary.main" }} />
              </Box>
            </Stack>
          );

          return actionBuilder ? (
            <Link key={row.key} component={RouterLink} to={actionBuilder(row.key)} color="inherit" underline="none">
              {content}
            </Link>
          ) : (
            <Box key={row.key}>{content}</Box>
          );
        })}
      </Stack>
    </AdminSection>
  );
}

function CashflowChart({ overview }: { overview: AdminFinanceOverview }) {
  const maxValue = Math.max(
    ...overview.timeSeries.flatMap((point) => [point.paidIncome, point.expenseTotal, Math.abs(point.net)]),
    0,
  );

  return (
    <AdminSection title="Evolución diaria" description="Cobros reales frente a gastos del rango activo.">
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip icon={<HandCoins size={14} />} label="Cobrado" size="small" color="success" variant="outlined" />
          <Chip icon={<Wallet size={14} />} label="Gasto" size="small" color="warning" variant="outlined" />
          <Chip icon={<ArrowRightLeft size={14} />} label="Neto" size="small" color="primary" variant="outlined" />
        </Stack>
        <Stack spacing={1}>
          {overview.timeSeries.map((point) => (
            <Box key={point.date}>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography variant="caption" color="text.secondary">{point.date}</Typography>
                <Typography variant="caption" color="text.secondary">Neto {formatCurrency(point.net)}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ height: 8, borderRadius: 999, bgcolor: "rgba(43,138,62,.12)", overflow: "hidden", mb: 0.5 }}>
                    <Box sx={{ width: `${maxValue > 0 ? (point.paidIncome / maxValue) * 100 : 0}%`, height: "100%", bgcolor: "success.main" }} />
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 999, bgcolor: "rgba(217,164,65,.12)", overflow: "hidden" }}>
                    <Box sx={{ width: `${maxValue > 0 ? (point.expenseTotal / maxValue) * 100 : 0}%`, height: "100%", bgcolor: "warning.main" }} />
                  </Box>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </AdminSection>
  );
}

export function AdminFinancePage() {
  const defaultRange = useMemo(() => resolveRange("thisMonth"), []);
  const [rangePreset, setRangePreset] = useState<AdminFinanceRangePreset>("thisMonth");
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [overview, setOverview] = useState<AdminFinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = buildFinanceParams(rangePreset, dateFrom, dateTo);
    let active = true;

    setLoading(true);
    setError("");
    void api.adminFinanceOverview(params)
      .then((response) => {
        if (!active) return;
        setOverview(response);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las finanzas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, rangePreset]);

  function applyPreset(nextPreset: AdminFinanceRangePreset) {
    const nextRange = resolveRange(nextPreset);
    setRangePreset(nextPreset);
    setDateFrom(nextRange.dateFrom);
    setDateTo(nextRange.dateTo);
  }

  function resetRange() {
    applyPreset("thisMonth");
  }

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Finanzas"
        subtitle="Consolida cobros, ventas pendientes y gastos operativos desde una sola vista."
      />

      <Paper sx={{ ...adminSurfaceSx, p: 1.5 }}>
        <Stack direction={{ xs: "column", xl: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ xs: "stretch", xl: "center" }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {rangeOptions.map((option) => (
              <Button
                key={option.value}
                size="small"
                variant={rangePreset === option.value ? "contained" : "outlined"}
                startIcon={<CalendarRange size={16} />}
                onClick={() => applyPreset(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              type="date"
              label="Desde"
              value={dateFrom}
              onChange={(event) => {
                setRangePreset("custom");
                setDateFrom(event.target.value);
              }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="Hasta"
              value={dateTo}
              onChange={(event) => {
                setRangePreset("custom");
                setDateTo(event.target.value);
              }}
              InputLabelProps={{ shrink: true }}
            />
            <Button size="small" variant="text" onClick={resetRange}>Limpiar</Button>
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AdminStat label="Ingresos cobrados" value={overview ? formatCurrency(overview.summary.paidIncome) : "…"} detail="Pagos reales registrados por fecha de cobro." />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AdminStat label="Ventas comprometidas" value={overview ? formatCurrency(overview.summary.committedSales) : "…"} detail="Total de pedidos creados en el rango." />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Link component={RouterLink} to={buildOrdersLink(dateFrom, dateTo, { hasBalance: "true" })} underline="none" color="inherit">
            <AdminStat label="Cuentas por cobrar" value={overview ? formatCurrency(overview.summary.outstandingBalance) : "…"} detail="Pedidos del rango con saldo pendiente." />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <AdminStat label="Gastos" value={overview ? formatCurrency(overview.summary.expenseTotal) : "…"} detail="Egresos por fecha del gasto." />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <AdminStat label="Flujo neto" value={overview ? formatCurrency(overview.summary.netCashflow) : "…"} detail="Cobrado menos gastado." />
        </Grid>
      </Grid>

      {overview && (
        <>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <CashflowChart overview={overview} />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <AdminSection title="Resumen operativo" description={`Del ${overview.dateFrom} al ${overview.dateTo}.`}>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">Pedidos en rango</Typography>
                  <Typography variant="h5" fontWeight={900}>{overview.summary.orderCount}</Typography>
                  <Typography variant="body2" color="text.secondary">Gastos en rango</Typography>
                  <Typography variant="h5" fontWeight={900}>{overview.summary.expenseCount}</Typography>
                  <Button component={RouterLink} to={buildOrdersLink(dateFrom, dateTo)} variant="outlined" startIcon={<ReceiptText size={16} />}>
                    Ver pedidos filtrados
                  </Button>
                  <Button component={RouterLink} to={buildExpensesLink(dateFrom, dateTo)} variant="outlined" startIcon={<Wallet size={16} />}>
                    Ver gastos filtrados
                  </Button>
                </Stack>
              </AdminSection>
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, lg: 4 }}>
              <BreakdownBars
                title="Gastos por categoría"
                rows={overview.expenseBreakdown.map((item) => ({
                  key: item.category,
                  label: expenseCategoryLabels[item.category],
                  total: item.total,
                  count: item.count,
                }))}
                emptyLabel="Aún no hay gastos en este rango."
                valueLabel="gastos"
                actionBuilder={(category) => buildExpensesLink(dateFrom, dateTo, { category })}
              />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <BreakdownBars
                title="Pedidos por estado"
                rows={overview.orderStatusBreakdown.map((item) => ({
                  key: item.status,
                  label: orderStatusLabels[item.status],
                  total: item.total,
                  count: item.count,
                }))}
                emptyLabel="No hay pedidos en este rango."
                valueLabel="pedidos"
                actionBuilder={(status) => buildOrdersLink(dateFrom, dateTo, { status })}
              />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <BreakdownBars
                title="Cobros por método"
                rows={overview.paymentMethodBreakdown.map((item) => ({
                  key: item.method,
                  label: expensePaymentMethodLabels[item.method],
                  total: item.total,
                  count: item.count,
                }))}
                emptyLabel="No hay cobros en este rango."
                valueLabel="pagos"
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, xl: 6 }}>
              <AdminSection title="Pedidos con mayor saldo" description="Prioriza seguimiento de cobro.">
                {overview.topOutstandingOrders.length === 0 ? (
                  <Typography color="text.secondary">No hay pedidos con saldo pendiente en este rango.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Pedido</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Saldo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overview.topOutstandingOrders.map((order) => (
                        <TableRow key={order.id} hover>
                          <TableCell>
                            <Link component={RouterLink} to={`/admin/pedidos/${order.id}`} color="inherit" underline="none">
                            <Stack spacing={0.25}>
                              <Typography fontWeight={800}>{order.code}</Typography>
                              <Typography variant="caption" color="text.secondary">{order.createdAt.slice(0, 10)}</Typography>
                            </Stack>
                            </Link>
                          </TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell><StatusChip status={order.status} /></TableCell>
                          <TableCell align="right">{formatCurrency(order.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AdminSection>
            </Grid>
            <Grid size={{ xs: 12, xl: 6 }}>
              <AdminSection title="Últimos gastos" description="Movimientos recientes dentro del rango.">
                {overview.recentExpenses.length === 0 ? (
                  <Typography color="text.secondary">No hay gastos recientes para mostrar.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Categoría</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Monto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overview.recentExpenses.map((expense) => (
                        <TableRow key={expense.id} hover>
                          <TableCell>
                            <Link component={RouterLink} to={`/admin/gastos/${expense.id}`} color="inherit" underline="none">
                              {expense.expenseDate.slice(0, 10)}
                            </Link>
                          </TableCell>
                          <TableCell>{expenseCategoryLabels[expense.category]}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell align="right">{formatCurrency(expense.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AdminSection>
            </Grid>
          </Grid>
        </>
      )}

      {!overview && !loading && !error && (
        <Paper sx={{ ...adminSurfaceSx, p: 2.5 }}>
          <Typography color="text.secondary">No hay datos financieros para este rango.</Typography>
        </Paper>
      )}
    </Stack>
  );
}
