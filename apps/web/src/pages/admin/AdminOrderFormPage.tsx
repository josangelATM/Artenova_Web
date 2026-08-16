import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { orderContactMethodLabels, orderContactMethodValues, type Order, type Product } from "@artenova/shared";
import { useNavigate } from "react-router-dom";
import { toastNavigationState } from "../../components/ToastProvider";
import { type ApiValidationIssue, api } from "../../lib/api";
import { clearFormErrorField, createFormErrorState, emptyFormErrorState, getFieldError } from "../../lib/formErrors";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";
import { AdminFormErrorAlert } from "./adminFormErrors";
import { buildDraftItemsPayload, buildDraftPaymentsPayload, defaultItem, emptyPaymentDraft, getBalance, getItemsTotal, getPaidTotal, moneyInputAdornment, OrderItemsEditor, OrderSummaryStrip, type DraftItem, type DraftOrder, type DraftPayment } from "./adminOrderUi";
import { AdminPageHeader, AdminSection } from "./adminUi";

const emptyDraft: DraftOrder = {
  customerName: "",
  customerWhatsapp: "",
  contactMethod: "whatsapp",
  note: "",
  status: "nuevo",
  items: [],
};

function resolveOrderField(issue: ApiValidationIssue) {
  if (issue.key === "customerNote") return "note";
  return issue.key || null;
}

function getOrderFieldLabel(field: string) {
  if (field === "customerName") return "Nombre del cliente";
  if (field === "customerWhatsapp") return "WhatsApp o cuenta";
  if (field === "contactMethod") return "Método de contacto";
  if (field === "status") return "Estado";
  if (field === "note") return "Nota";

  const itemMatch = field.match(/^items\.(\d+)\.(.+)$/);
  if (itemMatch) {
    const itemIndex = Number(itemMatch[1]) + 1;
    const nestedField = itemMatch[2] ?? "";
    if (nestedField === "productName") return `Item ${itemIndex}: Producto`;
    if (nestedField === "quantity") return `Item ${itemIndex}: Cantidad`;
    if (nestedField === "unitPrice") return `Item ${itemIndex}: Costo individual`;
    const adjustmentMatch = nestedField.match(/^appliedAdjustments\.(\d+)\.(label|unitAmount)$/);
    if (adjustmentMatch) {
      const adjustmentIndex = Number(adjustmentMatch[1]) + 1;
      return adjustmentMatch[2] === "label"
        ? `Item ${itemIndex}: Cargo ${adjustmentIndex}`
        : `Item ${itemIndex}: Monto del cargo ${adjustmentIndex}`;
    }
  }

  const paymentMatch = field.match(/^payments\.(\d+)\.(amount|method|reference|note)$/);
  if (paymentMatch) {
    const paymentIndex = Number(paymentMatch[1]) + 1;
    const paymentField = paymentMatch[2];
    if (paymentField === "amount") return `Abono ${paymentIndex}: Monto`;
    if (paymentField === "method") return `Abono ${paymentIndex}: Método`;
    if (paymentField === "reference") return `Abono ${paymentIndex}: Referencia`;
    return `Abono ${paymentIndex}: Nota`;
  }

  return field;
}

export function AdminOrderFormPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DraftOrder>(emptyDraft);
  const [payments, setPayments] = useState<DraftPayment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(emptyFormErrorState);

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

  const updateDraftField = useCallback(<K extends keyof DraftOrder>(field: K, value: DraftOrder[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError((current) => clearFormErrorField(current, String(field)));
  }, []);

  const clearField = useCallback((field: string) => {
    setFormError((current) => clearFormErrorField(current, field));
  }, []);

  const updateItems = useCallback((items: DraftItem[]) => {
    setDraft((current) => ({ ...current, items }));
  }, []);

  function addPayment() {
    setPayments((current) => [...current, { ...emptyPaymentDraft }]);
  }

  function updatePayment(index: number, patch: Partial<DraftPayment>) {
    const changedField = Object.keys(patch)[0];
    if (changedField) {
      clearField(`payments.${index}.${changedField}`);
    }
    setPayments((current) => current.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, ...patch } : payment));
  }

  function removePayment(index: number) {
    setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index));
  }

  async function save() {
    try {
      setSaving(true);
      setFormError(emptyFormErrorState);
      const order = await api.createAdminOrder({
        customerName: draft.customerName,
        customerWhatsapp: draft.customerWhatsapp,
        contactMethod: draft.contactMethod,
        customerNote: draft.note,
        internalNote: null,
        status: draft.status,
        finalPrice: null,
        items: buildDraftItemsPayload(draft.items),
        payments: buildDraftPaymentsPayload(payments),
      });
      navigate(`/admin/pedidos/${order.id}`, {
        replace: true,
        state: toastNavigationState({ message: "Pedido guardado", severity: "success" }),
      });
    } catch (err) {
      setFormError(createFormErrorState(err, {
        fallbackMessage: "No se pudo crear el pedido",
        resolveField: resolveOrderField,
        getFieldLabel: getOrderFieldLabel,
      }));
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
          <AdminFormErrorAlert error={formError} onClose={() => setFormError(emptyFormErrorState)} />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Nombre del cliente" value={draft.customerName} onChange={(event) => updateDraftField("customerName", event.target.value)} error={Boolean(getFieldError(formError, "customerName"))} helperText={getFieldError(formError, "customerName")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth select label="Método de contacto" value={draft.contactMethod} onChange={(event) => updateDraftField("contactMethod", event.target.value as DraftOrder["contactMethod"])} error={Boolean(getFieldError(formError, "contactMethod"))} helperText={getFieldError(formError, "contactMethod")}>
                {orderContactMethodValues.map((method) => (
                  <MenuItem key={method} value={method}>{orderContactMethodLabels[method]}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="WhatsApp o cuenta" value={draft.customerWhatsapp} onChange={(event) => updateDraftField("customerWhatsapp", event.target.value)} error={Boolean(getFieldError(formError, "customerWhatsapp"))} helperText={getFieldError(formError, "customerWhatsapp")} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField fullWidth select label="Estado" value={draft.status} onChange={(event) => updateDraftField("status", event.target.value as Order["status"])} error={Boolean(getFieldError(formError, "status"))} helperText={getFieldError(formError, "status")}>
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
        <OrderItemsEditor
          items={draft.items}
          products={products}
          onChange={updateItems}
          getFieldError={(field) => getFieldError(formError, field)}
          onClearFieldError={clearField}
        />
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
                    <TextField fullWidth size="small" label="Monto" value={payment.amount} onChange={(event) => updatePayment(index, { amount: event.target.value })} error={Boolean(getFieldError(formError, `payments.${index}.amount`))} helperText={getFieldError(formError, `payments.${index}.amount`)} slotProps={{ input: { startAdornment: moneyInputAdornment } }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth size="small" select label="Método" value={payment.method} onChange={(event) => updatePayment(index, { method: event.target.value as DraftPayment["method"] })} error={Boolean(getFieldError(formError, `payments.${index}.method`))} helperText={getFieldError(formError, `payments.${index}.method`)}>
                      <MenuItem value="efectivo">Efectivo</MenuItem>
                      <MenuItem value="yappy">Yappy</MenuItem>
                      <MenuItem value="transferencia">Transferencia</MenuItem>
                      <MenuItem value="otro">Otro</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth size="small" label="Referencia" value={payment.reference} onChange={(event) => updatePayment(index, { reference: event.target.value })} error={Boolean(getFieldError(formError, `payments.${index}.reference`))} helperText={getFieldError(formError, `payments.${index}.reference`)} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth size="small" label="Nota" value={payment.note} onChange={(event) => updatePayment(index, { note: event.target.value })} error={Boolean(getFieldError(formError, `payments.${index}.note`))} helperText={getFieldError(formError, `payments.${index}.note`)} multiline minRows={2} />
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
            <TextField fullWidth label="Nota" multiline minRows={4} value={draft.note} onChange={(event) => updateDraftField("note", event.target.value)} error={Boolean(getFieldError(formError, "note"))} helperText={getFieldError(formError, "note")} />
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
