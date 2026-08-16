import { useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, Divider, FormControlLabel, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { formatCurrency, orderContactMethodLabels, orderContactMethodValues, type Order, type Product } from "@artenova/shared";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../components/ToastProvider";
import { type ApiValidationIssue, api } from "../../lib/api";
import { clearFormErrorField, createFormErrorState, emptyFormErrorState, getFieldError } from "../../lib/formErrors";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";
import { AdminFormErrorAlert } from "./adminFormErrors";
import { buildDraftItemsPayload, emptyPaymentDraft, getBalance, getItemsTotal, moneyInputAdornment, orderToDraft, OrderItemsEditor, OrderSummaryStrip, toNumberOrZero, type DraftOrder, type DraftPayment } from "./adminOrderUi";
import { AdminPageHeader, AdminSection } from "./adminUi";

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
  if (field === "amount") return "Monto";
  if (field === "method") return "Método";
  if (field === "reference") return "Referencia";
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

  return field;
}

function summarizeOperationalFields(
  personalization: Record<string, string | string[] | boolean>,
  product?: Product | null,
) {
  const fieldLabelByKey = new Map(
    (product?.customFields ?? []).map((field) => [field.id ?? field.label, field.label]),
  );

  return Object.entries(personalization)
    .map(([key, value]) => [
      (fieldLabelByKey.get(key) ?? (key === "detalle" ? "Detalle" : key)).trim(),
      typeof value === "boolean"
        ? value ? "Sí" : "No"
        : Array.isArray(value)
          ? value.join(", ").trim()
          : value.trim(),
    ] as const)
    .filter(([label, value]) => label && value);
}

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [draft, setDraft] = useState<DraftOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentDraft, setPaymentDraft] = useState<DraftPayment>(emptyPaymentDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [formError, setFormError] = useState(emptyFormErrorState);

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
      setFormError(createFormErrorState(err, { fallbackMessage: "No se pudo cargar el pedido" }));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const itemsTotal = useMemo(() => getItemsTotal(draft?.items ?? []), [draft?.items]);
  const paidTotal = useMemo(() => order?.paidTotal ?? 0, [order?.paidTotal]);
  const balance = useMemo(() => getBalance(itemsTotal, paidTotal), [itemsTotal, paidTotal]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  function clearField(field: string) {
    setFormError((current) => clearFormErrorField(current, field));
  }

  async function save() {
    if (!id || !draft) return;
    try {
      setSaving(true);
      setFormError(emptyFormErrorState);
      const updated = await api.updateAdminOrder(id, {
        customerName: draft.customerName,
        customerWhatsapp: draft.customerWhatsapp,
        contactMethod: draft.contactMethod,
        customerNote: draft.note,
        internalNote: null,
        status: draft.status,
        finalPrice: null,
        completedAt: order?.completedAt ?? null,
        items: buildDraftItemsPayload(draft.items),
      });
      setOrder(updated);
      setDraft(orderToDraft(updated));
      showToast({ message: "Pedido guardado", severity: "success" });
    } catch (err) {
      setFormError(createFormErrorState(err, {
        fallbackMessage: "No se pudo guardar el pedido",
        resolveField: resolveOrderField,
        getFieldLabel: getOrderFieldLabel,
      }));
    } finally {
      setSaving(false);
    }
  }

  async function addPayment() {
    if (!id) return;
    try {
      setPaying(true);
      setFormError(emptyFormErrorState);
      const updated = await api.createOrderPayment(id, {
        amount: toNumberOrZero(paymentDraft.amount),
        method: paymentDraft.method,
        reference: paymentDraft.reference.trim() || null,
        note: paymentDraft.note.trim() || null,
      });
      setOrder(updated);
      setPaymentDraft(emptyPaymentDraft);
    } catch (err) {
      setFormError(createFormErrorState(err, {
        fallbackMessage: "No se pudo registrar el abono",
        getFieldLabel: getOrderFieldLabel,
      }));
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
      <AdminFormErrorAlert error={formError} onClose={() => setFormError(emptyFormErrorState)} />

      <AdminSection title="Cliente">
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Nombre del cliente" value={draft.customerName} onChange={(event) => { setDraft({ ...draft, customerName: event.target.value }); clearField("customerName"); }} error={Boolean(getFieldError(formError, "customerName"))} helperText={getFieldError(formError, "customerName")} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth select label="Método de contacto" value={draft.contactMethod} onChange={(event) => { setDraft({ ...draft, contactMethod: event.target.value as typeof draft.contactMethod }); clearField("contactMethod"); }} error={Boolean(getFieldError(formError, "contactMethod"))} helperText={getFieldError(formError, "contactMethod")}>
              {orderContactMethodValues.map((method) => (
                <MenuItem key={method} value={method}>{orderContactMethodLabels[method]}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="WhatsApp o cuenta" value={draft.customerWhatsapp} onChange={(event) => { setDraft({ ...draft, customerWhatsapp: event.target.value }); clearField("customerWhatsapp"); }} error={Boolean(getFieldError(formError, "customerWhatsapp"))} helperText={getFieldError(formError, "customerWhatsapp")} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField fullWidth select label="Estado" value={draft.status} onChange={(event) => { setDraft({ ...draft, status: event.target.value as Order["status"] }); clearField("status"); }} error={Boolean(getFieldError(formError, "status"))} helperText={getFieldError(formError, "status")}>
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
      </AdminSection>

      <AdminSection title="Items">
        <OrderItemsEditor
          items={draft.items}
          products={products}
          onChange={(items) => setDraft((current) => current ? { ...current, items } : current)}
          getFieldError={(field) => getFieldError(formError, field)}
          onClearFieldError={clearField}
        />
      </AdminSection>

      <AdminSection title="Producción" description="Consulta rápida de items y sus campos operativos para marcar avance.">
        <Stack spacing={1.25}>
          {draft.items.length === 0 ? (
            <Typography color="text.secondary">Sin items.</Typography>
          ) : draft.items.map((item, index) => {
            const operationalFields = summarizeOperationalFields(
              item.personalization,
              item.productId ? productById.get(item.productId) ?? null : null,
            );
            return (
              <Paper key={item.id ?? `production-${index}`} sx={{ border: "1px solid rgba(64,44,37,.10)", boxShadow: "none", p: 1.5 }}>
                <Stack spacing={1}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                    <Box>
                      <Typography fontWeight={900}>{item.productName || `Item ${index + 1}`}</Typography>
                      {item.variantNameSnapshot && (
                        <Typography variant="body2" color="text.secondary">Variante: {item.variantNameSnapshot}</Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">Cantidad: {item.quantity}</Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={item.isDone}
                          onChange={(event) =>
                            setDraft((current) => current ? ({
                              ...current,
                              items: current.items.map((currentItem, currentIndex) =>
                                currentIndex === index
                                  ? { ...currentItem, isDone: event.target.checked }
                                  : currentItem,
                              ),
                            }) : current)
                          }
                        />
                      }
                      label="Hecho"
                      sx={{ mr: 0 }}
                    />
                  </Stack>
                  {operationalFields.length > 0 ? (
                    <Stack spacing={0.5}>
                      {operationalFields.map(([label, value]) => (
                        <Typography key={`${item.id ?? index}-${label}`} variant="body2">
                          <strong>{label}:</strong> {value}
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Sin campos operativos.</Typography>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
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
                <TextField fullWidth label="Monto" value={paymentDraft.amount} onChange={(event) => { setPaymentDraft({ ...paymentDraft, amount: event.target.value }); clearField("amount"); }} error={Boolean(getFieldError(formError, "amount"))} helperText={getFieldError(formError, "amount")} slotProps={{ input: { startAdornment: moneyInputAdornment } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField fullWidth select label="Método" value={paymentDraft.method} onChange={(event) => { setPaymentDraft({ ...paymentDraft, method: event.target.value as DraftPayment["method"] }); clearField("method"); }} error={Boolean(getFieldError(formError, "method"))} helperText={getFieldError(formError, "method")}>
                  <MenuItem value="efectivo">Efectivo</MenuItem>
                  <MenuItem value="yappy">Yappy</MenuItem>
                  <MenuItem value="transferencia">Transferencia</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Referencia" value={paymentDraft.reference} onChange={(event) => { setPaymentDraft({ ...paymentDraft, reference: event.target.value }); clearField("reference"); }} error={Boolean(getFieldError(formError, "reference"))} helperText={getFieldError(formError, "reference")} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Nota" value={paymentDraft.note} onChange={(event) => { setPaymentDraft({ ...paymentDraft, note: event.target.value }); clearField("note"); }} error={Boolean(getFieldError(formError, "note"))} helperText={getFieldError(formError, "note")} multiline minRows={2} />
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
            <TextField fullWidth label="Nota" multiline minRows={4} value={draft.note} onChange={(event) => { setDraft({ ...draft, note: event.target.value }); clearField("note"); }} error={Boolean(getFieldError(formError, "note"))} helperText={getFieldError(formError, "note")} />
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
