import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Divider, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { formatCurrency, type Order, type Product } from "@artenova/shared";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, AdminSection } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";
import { buildDraftItemsPayload, emptyPaymentDraft, getBalance, getItemsTotal, orderToDraft, OrderItemsEditor, OrderSummaryStrip, toNumberOrZero, type DraftOrder, type DraftPayment } from "./adminOrderUi";

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [draft, setDraft] = useState<DraftOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentDraft, setPaymentDraft] = useState<DraftPayment>(emptyPaymentDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    void Promise.all([api.adminOrder(id), api.adminProducts()]).then(([nextOrder, nextProducts]) => {
      if (!active) return;
      setOrder(nextOrder);
      setDraft(orderToDraft(nextOrder));
      setProducts(nextProducts);
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "No se pudo cargar el pedido");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const itemsTotal = useMemo(() => getItemsTotal(draft?.items ?? []), [draft?.items]);
  const paidTotal = useMemo(() => order?.paidTotal ?? 0, [order?.paidTotal]);
  const balance = useMemo(() => getBalance(itemsTotal, paidTotal), [itemsTotal, paidTotal]);

  async function save() {
    if (!id || !draft) return;
    try {
      setSaving(true);
      setError("");
      const updated = await api.updateAdminOrder(id, {
        customerName: draft.customerName,
        customerWhatsapp: draft.customerWhatsapp,
        customerNote: draft.note,
        internalNote: null,
        status: draft.status,
        finalPrice: null,
        completedAt: order?.completedAt ?? null,
        items: buildDraftItemsPayload(draft.items),
      });
      setOrder(updated);
      setDraft(orderToDraft(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el pedido");
    } finally {
      setSaving(false);
    }
  }

  async function addPayment() {
    if (!id) return;
    try {
      setPaying(true);
      setError("");
      const updated = await api.createOrderPayment(id, {
        amount: toNumberOrZero(paymentDraft.amount),
        method: paymentDraft.method,
        reference: paymentDraft.reference.trim() || null,
        note: paymentDraft.note.trim() || null,
      });
      setOrder(updated);
      setPaymentDraft(emptyPaymentDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el abono");
    } finally {
      setPaying(false);
    }
  }

  if (loading || !draft || !order) {
    return (
      <Stack spacing={3}>
        <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Pedidos", to: "/admin/pedidos" }, { label: "Detalle" }]} />
        <Typography color="text.secondary">Cargando pedido...</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ pb: { xs: 12, md: 2 } }}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Pedidos", to: "/admin/pedidos" }, { label: order.code }]} />
      <AdminPageHeader title={order.code} action={<AdminBackButton to="/admin/pedidos" />} />
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      <OrderSummaryStrip status={draft.status} itemsTotal={itemsTotal} paidTotal={paidTotal} balance={balance} />

      <AdminSection title="Cliente">
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Nombre del cliente" value={draft.customerName} onChange={(event) => setDraft({ ...draft, customerName: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="WhatsApp" value={draft.customerWhatsapp} onChange={(event) => setDraft({ ...draft, customerWhatsapp: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth select label="Estado" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Order["status"] })}>
              <MenuItem value="nuevo">Nuevo</MenuItem>
              <MenuItem value="en_proceso">En proceso</MenuItem>
              <MenuItem value="completado">Completado</MenuItem>
              <MenuItem value="cancelado">Cancelado</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </AdminSection>

      <AdminSection title="Items">
        <OrderItemsEditor items={draft.items} products={products} onChange={(items) => setDraft((current) => current ? { ...current, items } : current)} />
      </AdminSection>

      <AdminSection title="Abonos">
        <Stack spacing={1.5}>
          {order.payments?.length ? order.payments.map((payment) => (
            <Paper key={payment.id} sx={{ border: "1px solid rgba(64,44,37,.10)", boxShadow: "none", p: 1.5 }}>
              <Stack spacing={0.5}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                  <Typography fontWeight={900}>{formatCurrency(payment.amount)} · {payment.method}</Typography>
                  <Typography color="text.secondary">{new Date(payment.createdAt).toLocaleString("es-PA")}</Typography>
                </Stack>
                {(payment.reference || payment.note) && (
                  <Typography variant="body2" color="text.secondary">
                    {[payment.reference, payment.note].filter(Boolean).join(" · ")}
                  </Typography>
                )}
              </Stack>
            </Paper>
          )) : <Typography color="text.secondary">Sin abonos.</Typography>}
          <Divider />
          <Stack spacing={1.25}>
            <Grid container spacing={1.25}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField fullWidth label="Monto" value={paymentDraft.amount} onChange={(event) => setPaymentDraft({ ...paymentDraft, amount: event.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField fullWidth select label="Método" value={paymentDraft.method} onChange={(event) => setPaymentDraft({ ...paymentDraft, method: event.target.value as DraftPayment["method"] })}>
                  <MenuItem value="efectivo">Efectivo</MenuItem>
                  <MenuItem value="yappy">Yappy</MenuItem>
                  <MenuItem value="transferencia">Transferencia</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Referencia" value={paymentDraft.reference} onChange={(event) => setPaymentDraft({ ...paymentDraft, reference: event.target.value })} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Nota" value={paymentDraft.note} onChange={(event) => setPaymentDraft({ ...paymentDraft, note: event.target.value })} multiline minRows={2} />
              </Grid>
            </Grid>
            <Button sx={{ width: { xs: "100%", sm: "auto" } }} variant="contained" onClick={() => void addPayment()} disabled={paying}>
              {paying ? "Guardando abono..." : "Registrar abono"}
            </Button>
          </Stack>
        </Stack>
      </AdminSection>

      <AdminSection title="Nota">
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField fullWidth label="Nota" multiline minRows={4} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
          </Grid>
        </Grid>
      </AdminSection>

      <AdminSection title="Resumen">
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="body2">Items: <strong>{formatCurrency(itemsTotal)}</strong></Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="body2">Abonado: <strong>{formatCurrency(paidTotal)}</strong></Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="body2">Saldo: <strong>{formatCurrency(balance)}</strong></Typography>
          </Grid>
        </Grid>
      </AdminSection>

      <Box
        sx={{
          position: { xs: "fixed", md: "sticky" },
          bottom: 0,
          left: { xs: 0, md: "auto" },
          right: { xs: 0, md: "auto" },
          zIndex: 10,
          mt: 1,
        }}
      >
        <Paper sx={{ borderTop: "1px solid rgba(64,44,37,.12)", boxShadow: "0 -10px 28px rgba(64,44,37,.12)", p: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button sx={{ width: { xs: "100%", sm: "auto" } }} variant="contained" size="large" onClick={() => void save()} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
            <Button sx={{ width: { xs: "100%", sm: "auto" } }} variant="outlined" onClick={() => navigate("/admin/pedidos")}>
              Volver
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
