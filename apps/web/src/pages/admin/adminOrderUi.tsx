import { Autocomplete, Button, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency, type AdminOrderPaymentInput, type CustomField, type Order, type Product } from "@artenova/shared";

export type DraftItem = {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  personalization: Record<string, string>;
};

export type DraftPayment = {
  amount: string;
  method: AdminOrderPaymentInput["method"];
  reference: string;
  note: string;
};

export type DraftOrder = {
  customerName: string;
  customerWhatsapp: string;
  note: string;
  status: Order["status"];
  items: DraftItem[];
};

export const emptyPaymentDraft: DraftPayment = {
  amount: "",
  method: "efectivo",
  reference: "",
  note: "",
};

function toStringMap(values: Record<string, string | string[]>) {
  return Object.fromEntries(
    Object.entries(values ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value]),
  );
}

export function toNumberOrZero(value: string) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function getItemLineTotal(item: DraftItem) {
  return Number((Math.max(1, Math.round(toNumberOrZero(item.quantity))) * toNumberOrZero(item.unitPrice)).toFixed(2));
}

export function getItemsTotal(items: DraftItem[]) {
  return Number(items.reduce((sum, item) => sum + getItemLineTotal(item), 0).toFixed(2));
}

export function getPaidTotal(payments: DraftPayment[]) {
  return Number(payments.reduce((sum, payment) => sum + toNumberOrZero(payment.amount), 0).toFixed(2));
}

export function getBalance(total: number, paid: number) {
  return Number(Math.max(0, total - paid).toFixed(2));
}

export function defaultItem(product?: Product, productName = ""): DraftItem {
  return {
    productId: product?.id ?? "",
    productName: product?.name ?? productName,
    quantity: "1",
    unitPrice: product ? String(product.pricingSummary.finalPrice) : "0",
    personalization: {},
  };
}

export function orderToDraft(order: Order): DraftOrder {
  return {
    customerName: order.customerName,
    customerWhatsapp: order.customerWhatsapp,
    note: order.customerNote ?? order.internalNote ?? "",
    status: order.status,
    items: order.items.map((item) => ({
      productId: item.productId ?? "",
      productName: item.productName,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      personalization: toStringMap(item.personalization ?? {}),
    })),
  };
}

export function buildDraftItemsPayload(items: DraftItem[]) {
  return items.map((item) => ({
    productId: item.productId.trim() || null,
    productName: item.productName.trim(),
    quantity: Math.max(1, Math.round(toNumberOrZero(item.quantity))),
    unitPrice: toNumberOrZero(item.unitPrice),
    extrasTotal: 0,
    skuSnapshot: null,
    variantNameSnapshot: null,
    unitLabel: null,
    selectedExtraIds: [],
    personalization: Object.fromEntries(
      Object.entries(item.personalization).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]),
    ),
    units: [],
  }));
}

export function buildDraftPaymentsPayload(payments: DraftPayment[]) {
  return payments
    .filter((payment) => payment.amount.trim())
    .map((payment) => ({
      amount: toNumberOrZero(payment.amount),
      method: payment.method,
      reference: payment.reference.trim() || null,
      note: payment.note.trim() || null,
    }));
}

function buildFieldLabel(field: CustomField) {
  return field.required ? `${field.label} *` : field.label;
}

function renderCustomField(
  field: CustomField,
  value: string,
  onChange: (next: string) => void,
  keyPrefix: string,
) {
  if (field.type === "select") {
    return (
      <TextField key={keyPrefix} select size="small" fullWidth label={buildFieldLabel(field)} value={value} onChange={(event) => onChange(event.target.value)}>
        <MenuItem value="">Seleccionar</MenuItem>
        {field.options.map((option) => (
          <MenuItem key={`${keyPrefix}-${option}`} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      key={keyPrefix}
      size="small"
      fullWidth
      type={field.type === "date" ? "date" : "text"}
      label={buildFieldLabel(field)}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
      multiline={field.type === "note" || field.type === "image"}
      minRows={field.type === "note" || field.type === "image" ? 2 : undefined}
    />
  );
}

function GenericPersonalizationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <TextField
      fullWidth
      size="small"
      label="Personalización"
      multiline
      minRows={2}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function OrderSummaryStrip({
  status,
  itemsTotal,
  paidTotal,
  balance,
}: {
  status: Order["status"];
  itemsTotal: number;
  paidTotal: number;
  balance: number;
}) {
  return (
    <Paper sx={{ border: "1px solid rgba(64,44,37,.10)", borderRadius: 2, p: 1.5, bgcolor: "rgba(255,250,245,.92)" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
        <Typography fontWeight={900}>{status.replace("_", " ")}</Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Typography variant="body2">Items: <strong>{formatCurrency(itemsTotal)}</strong></Typography>
          <Typography variant="body2">Abonado: <strong>{formatCurrency(paidTotal)}</strong></Typography>
          <Typography variant="body2">Saldo: <strong>{formatCurrency(balance)}</strong></Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function OrderItemsEditor({
  items,
  products,
  onChange,
}: {
  items: DraftItem[];
  products: Product[];
  onChange: (nextItems: DraftItem[]) => void;
}) {
  const productById = new Map(products.map((product) => [product.id, product]));

  function updateItem(index: number, updater: (item: DraftItem) => DraftItem) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)));
  }

  function addItem() {
    onChange([...items, defaultItem()]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <Stack spacing={1.5}>
      <Button fullWidth variant="outlined" startIcon={<Plus size={18} />} onClick={addItem}>
        Agregar item
      </Button>
      {items.length === 0 && <Typography color="text.secondary">Sin items.</Typography>}
      {items.map((item, index) => {
        const selectedProduct = item.productId ? productById.get(item.productId) ?? null : null;
        const customFields = selectedProduct?.customFields ?? [];
        const lineTotal = getItemLineTotal(item);

        return (
          <Paper key={`draft-item-${index}`} sx={{ border: "1px solid rgba(64,44,37,.10)", boxShadow: "none", p: 1.5 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={900}>Item {index + 1}</Typography>
                <IconButton aria-label="Eliminar item" onClick={() => removeItem(index)}>
                  <Trash2 size={18} />
                </IconButton>
              </Stack>

              <Autocomplete
                freeSolo
                options={products}
                getOptionLabel={(option) => typeof option === "string" ? option : option.name}
                value={selectedProduct}
                inputValue={item.productName}
                onInputChange={(_event, nextValue, reason) => {
                  if (reason === "reset") return;
                  updateItem(index, (current) => ({
                    ...current,
                    productId: "",
                    productName: nextValue,
                    personalization: current.productName === nextValue ? current.personalization : {},
                  }));
                }}
                onChange={(_event, nextValue) => {
                  if (!nextValue) {
                    updateItem(index, (current) => ({ ...current, productId: "" }));
                    return;
                  }
                  if (typeof nextValue === "string") {
                    updateItem(index, (current) => defaultItem(undefined, nextValue || current.productName));
                    return;
                  }
                  updateItem(index, () => defaultItem(nextValue));
                }}
                renderInput={(params) => <TextField {...params} size="small" label="Producto" />}
              />

              <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth size="small" label="Cantidad" value={item.quantity} onChange={(event) => updateItem(index, (current) => ({ ...current, quantity: event.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth size="small" label="Costo individual" value={item.unitPrice} onChange={(event) => updateItem(index, (current) => ({ ...current, unitPrice: event.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth size="small" label="Costo total" value={formatCurrency(lineTotal)} slotProps={{ input: { readOnly: true } }} />
                </Grid>
              </Grid>

              {customFields.length > 0 ? (
                <Grid container spacing={1.25}>
                  {customFields.map((field) => {
                    const fieldKey = field.id ?? field.label;
                    const isLongField = field.type === "note" || field.type === "image";
                    return (
                      <Grid key={`${fieldKey}-${index}`} size={{ xs: 12, md: isLongField ? 12 : 6 }}>
                        {renderCustomField(
                          field,
                          item.personalization[fieldKey] ?? "",
                          (nextValue) => updateItem(index, (current) => ({
                            ...current,
                            personalization: { ...current.personalization, [fieldKey]: nextValue },
                          })),
                          `item-${index}-${fieldKey}`,
                        )}
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <GenericPersonalizationField
                  value={item.personalization.detalle ?? ""}
                  onChange={(nextValue) => updateItem(index, (current) => ({
                    ...current,
                    personalization: { ...current.personalization, detalle: nextValue },
                  }))}
                />
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
