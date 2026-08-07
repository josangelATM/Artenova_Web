import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { type Order, type Product } from "@artenova/shared";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, AdminSection } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";
import { buildDraftItemsPayload, buildDraftPaymentsPayload, defaultItem, emptyPaymentDraft, getBalance, getItemsTotal, getPaidTotal, moneyInputAdornment, OrderItemsEditor, OrderSummaryStrip, type DraftOrder, type DraftPayment } from "./adminOrderUi";

const emptyDraft: DraftOrder = {
  customerName: "",
  customerWhatsapp: "",
  note: "",
  status: "nuevo",
  items: [],
};

export function AdminOrderFormPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DraftOrder>(emptyDraft);
  const [payments, setPayments] = useState<DraftPayment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void api.adminProducts().then((items) => {
      if (!active) return;
      setProducts(items);
      setDraft((current) => current.items.length === 0 ? { ...current, items: [defaultItem()] } : current);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const itemsTotal = useMemo(() => getItemsTotal(draft.items), [draft.items]);
  const paidTotal = useMemo(() => getPaidTotal(payments), [payments]);
  const balance = useMemo(() => getBalance(itemsTotal, paidTotal), [itemsTotal, paidTotal]);

  function addPayment() {
    setPayments((current) => [...current, { ...emptyPaymentDraft }]);
  }

  function updatePayment(index: number, patch: Partial<DraftPayment>) {
    setPayments((current) => current.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, ...patch } : payment));
  }

  function removePayment(index: number) {
    setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index));
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      const order = await api.createAdminOrder({
        customerName: draft.customerName,
        customerWhatsapp: draft.customerWhatsapp,
        customerNote: draft.note,
        internalNote: null,
        status: draft.status,
        finalPrice: null,
        items: buildDraftItemsPayload(draft.items),
        payments: buildDraftPaymentsPayload(payments),
      });
      navigate(`/admin/pedidos/${order.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={2.5} sx={{ pb: { xs: 12, md: 2 } }}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Pedidos", to: "/admin/pedidos" }, { label: "Nuevo" }]} />
      <AdminPageHeader title="Nuevo pedido" action={<AdminBackButton to="/admin/pedidos" />} />

      <AdminSection title="Cliente">
        <Stack spacing={1.5}>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
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
                <MenuItem value="pendiente_diseno">Pendiente por diseño</MenuItem>
                <MenuItem value="pendiente_aprobacion">Pendiente por aprobación</MenuItem>
                <MenuItem value="pendiente_fabricacion">Pendiente por fabricación</MenuItem>
                <MenuItem value="pendiente_imprimir">Pendiente por imprimir</MenuItem>
                <MenuItem value="listo_entrega">Listo para entrega</MenuItem>
                <MenuItem value="entregado">Entregado</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Stack>
      </AdminSection>

      <AdminSection title="Items">
        <OrderItemsEditor items={draft.items} products={products} onChange={(items) => setDraft((current) => ({ ...current, items }))} />
      </AdminSection>

      <AdminSection title="Abonos" action={<Button variant="outlined" startIcon={<Plus size={18} />} onClick={addPayment}>Agregar abono</Button>}>
        <Stack spacing={1.5}>
          {payments.length === 0 && <Typography color="text.secondary">Sin abonos.</Typography>}
          {payments.map((payment, index) => (
            <Paper key={`payment-${index}`} sx={{ border: "1px solid rgba(64,44,37,.10)", boxShadow: "none", p: 1.5 }}>
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={900}>Abono {index + 1}</Typography>
                  <IconButton aria-label="Eliminar abono" onClick={() => removePayment(index)}>
                    <Trash2 size={18} />
                  </IconButton>
                </Stack>
                <Grid container spacing={1.25}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Monto"
                      value={payment.amount}
                      onChange={(event) => updatePayment(index, { amount: event.target.value })}
                      slotProps={{ input: { startAdornment: moneyInputAdornment } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth size="small" select label="Método" value={payment.method} onChange={(event) => updatePayment(index, { method: event.target.value as DraftPayment["method"] })}>
                      <MenuItem value="efectivo">Efectivo</MenuItem>
                      <MenuItem value="yappy">Yappy</MenuItem>
                      <MenuItem value="transferencia">Transferencia</MenuItem>
                      <MenuItem value="otro">Otro</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth size="small" label="Referencia" value={payment.reference} onChange={(event) => updatePayment(index, { reference: event.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth size="small" label="Nota" value={payment.note} onChange={(event) => updatePayment(index, { note: event.target.value })} multiline minRows={2} />
                  </Grid>
                </Grid>
              </Stack>
            </Paper>
          ))}
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
        <OrderSummaryStrip itemsTotal={itemsTotal} paidTotal={paidTotal} balance={balance} />
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
              {saving ? "Guardando..." : "Guardar pedido"}
            </Button>
            <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
              <AdminBackButton to="/admin/pedidos" label="Cancelar" />
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
