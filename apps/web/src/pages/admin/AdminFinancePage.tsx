import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Grid, Link, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { expenseCategoryLabels, expensePaymentMethodLabels, formatCurrency, orderStatusLabels, type AdminFinanceOverview, type AdminFinanceRangePreset } from "@artenova/shared";
import type { LucideIcon } from "lucide-react";
import { ArrowRightLeft, BadgeDollarSign, CalendarRange, HandCoins, Info, Landmark, PiggyBank, ReceiptText, Wallet } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, AdminSection, StatusChip, adminSurfaceSx } from "./adminUi";

const rangeOptions: Array<{ value: AdminFinanceRangePreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "last7", label: "7 dias" },
  { value: "thisMonth", label: "Mes" },
  { value: "last30", label: "30 dias" },
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

type FinanceStatTone = "success" | "primary" | "warning" | "expense" | "profit";

const financeToneSx: Record<FinanceStatTone, { border: string; background: string; chipBg: string; chipColor: string; accent: string }> = {
  success: {
    border: "rgba(36,119,68,.16)",
    background: "linear-gradient(180deg, rgba(244,252,247,.98) 0%, rgba(236,248,240,.94) 100%)",
    chipBg: "rgba(36,119,68,.10)",
    chipColor: "#247744",
    accent: "#247744",
  },
  primary: {
    border: "rgba(77,104,186,.16)",
    background: "linear-gradient(180deg, rgba(246,248,255,.98) 0%, rgba(237,241,252,.94) 100%)",
    chipBg: "rgba(77,104,186,.10)",
    chipColor: "#4d68ba",
    accent: "#4d68ba",
  },
  warning: {
    border: "rgba(191,120,28,.18)",
    background: "linear-gradient(180deg, rgba(255,250,242,.98) 0%, rgba(252,244,228,.94) 100%)",
    chipBg: "rgba(191,120,28,.12)",
    chipColor: "#bf781c",
    accent: "#bf781c",
  },
  expense: {
    border: "rgba(164,85,44,.16)",
    background: "linear-gradient(180deg, rgba(255,247,244,.98) 0%, rgba(249,239,233,.94) 100%)",
    chipBg: "rgba(164,85,44,.10)",
    chipColor: "#a4552c",
    accent: "#a4552c",
  },
  profit: {
    border: "rgba(28,138,95,.18)",
    background: "linear-gradient(135deg, rgba(242,253,247,.99) 0%, rgba(228,247,237,.96) 100%)",
    chipBg: "rgba(28,138,95,.12)",
    chipColor: "#1c8a5f",
    accent: "#1c8a5f",
  },
};

function FinanceStatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  href,
  highlight = false,
  helper,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: FinanceStatTone;
  href?: string;
  highlight?: boolean;
  helper?: string;
}) {
  const toneSx = financeToneSx[tone];
  const content = (
    <Paper
      sx={{
        ...adminSurfaceSx,
        p: 2.5,
        borderColor: toneSx.border,
        background: toneSx.background,
        boxShadow: highlight ? "0 18px 38px rgba(28,138,95,.16)" : "0 10px 26px rgba(64,44,37,.06)",
        minHeight: "100%",
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: 34, md: highlight ? 42 : 38 }, lineHeight: 1.05 }}>
              {value}
            </Typography>
          </Stack>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              bgcolor: toneSx.chipBg,
              color: toneSx.chipColor,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={22} />
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Box sx={{ width: 28, height: 4, borderRadius: 999, bgcolor: toneSx.accent }} />
          <Typography variant="caption" color="text.secondary">{detail}</Typography>
          {helper ? (
            <Tooltip title={helper}>
              <Box component="span" sx={{ display: "inline-grid", placeItems: "center", color: "text.secondary" }}>
                <Info size={14} />
              </Box>
            </Tooltip>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );

  return href ? (
    <Link component={RouterLink} to={href} underline="none" color="inherit" sx={{ display: "block", height: "100%" }}>
      {content}
    </Link>
  ) : content;
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
    <AdminSection title="Evolucion diaria" description="Cobros reales frente a gastos del rango activo.">
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
        subtitle="Consolida cobros, pendientes y gastos operativos en una vista mas clara para tomar decisiones."
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
                sx={{
                  borderRadius: 999,
                  px: 1.5,
                  ...(rangePreset === option.value
                    ? { boxShadow: "0 10px 22px rgba(145,70,199,.20)" }
                    : { bgcolor: "rgba(255,255,255,.66)" }),
                }}
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
          <FinanceStatCard
            label="Ingresos cobrados"
            value={overview ? formatCurrency(overview.summary.paidIncome) : "..."}
            detail="Dinero que ya entro realmente en el rango."
            icon={HandCoins}
            tone="success"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <FinanceStatCard
            label="Ventas comprometidas"
            value={overview ? formatCurrency(overview.summary.committedSales) : "..."}
            detail="Valor vendido en pedidos creados dentro del rango."
            icon={ReceiptText}
            tone="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <FinanceStatCard
            label="Cuentas por cobrar"
            value={overview ? formatCurrency(overview.summary.outstandingBalance) : "..."}
            detail="Saldo pendiente por cobrar en pedidos del rango."
            icon={Landmark}
            tone="warning"
            href={buildOrdersLink(dateFrom, dateTo, { hasBalance: "true" })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <FinanceStatCard
            label="Gastos"
            value={overview ? formatCurrency(overview.summary.expenseTotal) : "..."}
            detail="Dinero que salio segun la fecha registrada del gasto."
            icon={Wallet}
            tone="expense"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <FinanceStatCard
            label="Ganancia Neta"
            value={overview ? formatCurrency(overview.summary.netProfit) : "..."}
            detail="Cobrado menos gastado dentro del periodo."
            icon={PiggyBank}
            tone="profit"
            highlight
            helper="Ganancia neta operativa del rango. No reemplaza una utilidad contable completa."
          />
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
                <Stack spacing={1.1}>
                  <Stack spacing={0.35}>
                    <Typography variant="body2" color="text.secondary">Flujo neto operativo</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <BadgeDollarSign size={18} color="#1c8a5f" />
                      <Typography variant="h5" fontWeight={900}>{formatCurrency(overview.summary.netCashflow)}</Typography>
                    </Stack>
                  </Stack>
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
                title="Gastos por categoria"
                rows={overview.expenseBreakdown.map((item) => ({
                  key: item.category,
                  label: expenseCategoryLabels[item.category],
                  total: item.total,
                  count: item.count,
                }))}
                emptyLabel="Aun no hay gastos en este rango."
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
                title="Cobros por metodo"
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
                  <Table size="small" sx={{ "& .MuiTableCell-head": { fontWeight: 900, color: "text.secondary" } }}>
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
              <AdminSection title="Ultimos gastos" description="Movimientos recientes dentro del rango.">
                {overview.recentExpenses.length === 0 ? (
                  <Typography color="text.secondary">No hay gastos recientes para mostrar.</Typography>
                ) : (
                  <Table size="small" sx={{ "& .MuiTableCell-head": { fontWeight: 900, color: "text.secondary" } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Categoria</TableCell>
                        <TableCell>Descripcion</TableCell>
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
