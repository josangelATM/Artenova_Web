import { Autocomplete, Box, Button, Grid, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { Copy, Plus, Trash2 } from "lucide-react";
import { formatCurrency, type AdminOrderItemAdjustment, type AdminOrderPaymentInput, type CustomField, type Order, type Product } from "@artenova/shared";

export type DraftItemAdjustment = Omit<AdminOrderItemAdjustment, "unitAmount"> & {
  unitAmount: string;
};

export type DraftItem = {
  id?: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  skuSnapshot: string;
  variantNameSnapshot: string;
  appliedAdjustments: DraftItemAdjustment[];
  personalization: Record<string, string>;
  isDone: boolean;
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
  method: "yappy",
  reference: "",
  note: "",
};

export const moneyInputAdornment = (
  <InputAdornment position="start">B/.</InputAdornment>
);

function toStringMap(values: Record<string, string | string[]>) {
  return Object.fromEntries(
    Object.entries(values ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value]),
  );
}

export function toNumberOrZero(value: string) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function normalizedQuantity(value: string) {
  return Math.max(1, Math.round(toNumberOrZero(value)));
}

function buildAdjustmentPayload(adjustment: DraftItemAdjustment, quantity: number): AdminOrderItemAdjustment {
  const unitAmount = roundMoney(Math.max(0, toNumberOrZero(adjustment.unitAmount)));
  return {
    label: adjustment.label.trim(),
    unitAmount,
    quantity,
    totalAmount: roundMoney(unitAmount * quantity),
  };
}

function syncAdjustmentsQuantity(adjustments: DraftItemAdjustment[], quantity: number) {
  return adjustments.map((adjustment) => {
    const payload = buildAdjustmentPayload(adjustment, quantity);
    return {
      ...adjustment,
      label: payload.label,
      quantity: payload.quantity,
      totalAmount: payload.totalAmount,
      unitAmount: String(payload.unitAmount),
    };
  });
}

function resolveSuggestedUnitPrice(product?: Product) {
  if (!product) return 0;
  return product.defaultVariant?.pricingSummary.finalPrice
    ?? product.pricingSummary.finalPrice
    ?? 0;
}

export function getItemAdjustmentsTotal(item: DraftItem) {
  return roundMoney(
    item.appliedAdjustments.reduce((sum, adjustment) => sum + roundMoney(toNumberOrZero(adjustment.unitAmount) * normalizedQuantity(item.quantity)), 0),
  );
}

export function getItemLineTotal(item: DraftItem) {
  return roundMoney(normalizedQuantity(item.quantity) * toNumberOrZero(item.unitPrice) + getItemAdjustmentsTotal(item));
}

export function getItemsTotal(items: DraftItem[]) {
  return roundMoney(items.reduce((sum, item) => sum + getItemLineTotal(item), 0));
}

export function getPaidTotal(payments: DraftPayment[]) {
  return roundMoney(payments.reduce((sum, payment) => sum + toNumberOrZero(payment.amount), 0));
}

export function getBalance(total: number, paid: number) {
  return roundMoney(Math.max(0, total - paid));
}

export function defaultItem(product?: Product, productName = ""): DraftItem {
  const quantity = 1;
  return {
    productId: product?.id ?? "",
    productName: product?.name ?? productName,
    quantity: String(quantity),
    unitPrice: String(resolveSuggestedUnitPrice(product)),
    skuSnapshot: product?.defaultVariant?.sku ?? "",
    variantNameSnapshot: product?.defaultVariant?.name ?? "",
    appliedAdjustments: [],
    personalization: {},
    isDone: false,
  };
}

export function orderToDraft(order: Order): DraftOrder {
  return {
    customerName: order.customerName,
    customerWhatsapp: order.customerWhatsapp,
    note: order.customerNote ?? order.internalNote ?? "",
    status: order.status,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId ?? "",
      productName: item.productName,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      skuSnapshot: item.skuSnapshot ?? "",
      variantNameSnapshot: item.variantNameSnapshot ?? "",
      appliedAdjustments: (item.appliedAdjustments ?? []).map((adjustment) => ({
        label: adjustment.label,
        unitAmount: String(adjustment.unitAmount),
        quantity: adjustment.quantity,
        totalAmount: adjustment.totalAmount,
      })),
      personalization: toStringMap(item.personalization ?? {}),
      isDone: item.isDone ?? false,
    })),
  };
}

export function buildDraftItemsPayload(items: DraftItem[]) {
  return items.map((item) => {
    const quantity = normalizedQuantity(item.quantity);
    const appliedAdjustments = item.appliedAdjustments
      .map((adjustment) => buildAdjustmentPayload(adjustment, quantity))
      .filter((adjustment) => adjustment.label);
    const extrasTotal = roundMoney(appliedAdjustments.reduce((sum, adjustment) => sum + adjustment.totalAmount, 0));

    return {
      id: item.id,
      productId: item.productId.trim() || null,
      productName: item.productName.trim(),
      quantity,
      unitPrice: toNumberOrZero(item.unitPrice),
      extrasTotal,
      skuSnapshot: item.skuSnapshot.trim() || null,
      variantNameSnapshot: item.variantNameSnapshot.trim() || null,
      unitLabel: null,
      selectedExtraIds: [],
      appliedAdjustments,
      personalization: Object.fromEntries(
        Object.entries(item.personalization).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]),
      ),
      isDone: item.isDone,
      units: [],
    };
  });
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

function renderCustomField(
  field: CustomField,
  value: string,
  onChange: (next: string) => void,
  keyPrefix: string,
) {
  return (
    <TextField
      key={keyPrefix}
      size="small"
      fullWidth
      type="text"
      label={field.label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
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
  itemsTotal,
  paidTotal,
  balance,
}: {
  itemsTotal: number;
  paidTotal: number;
  balance: number;
}) {
  return (
    <Grid container spacing={1.25}>
      {[
        { label: "Total", value: itemsTotal },
        { label: "Abonado", value: paidTotal },
        { label: "Saldo", value: balance },
      ].map((item) => (
        <Grid key={item.label} size={{ xs: 12, md: 4 }}>
          <Box sx={{ px: 0.25, py: 0.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: ".08em" }}>
              {item.label}
            </Typography>
            <Typography sx={{ mt: 0.35, fontSize: { xs: "1.4rem", md: "1.7rem" }, lineHeight: 1.1, fontWeight: 900 }}>
              {formatCurrency(item.value)}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

export function OrderItemsEditor({
  items,
  products,
  onChange,
  getFieldError,
  onClearFieldError,
}: {
  items: DraftItem[];
  products: Product[];
  onChange: (nextItems: DraftItem[]) => void;
  getFieldError?: (field: string) => string;
  onClearFieldError?: (field: string) => void;
}) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const fieldErrorFor = (field: string) => getFieldError?.(field) ?? "";
  const clearField = (field: string) => onClearFieldError?.(field);

  function updateItem(index: number, updater: (item: DraftItem) => DraftItem) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)));
  }

  function addItem() {
    onChange([...items, defaultItem()]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function duplicateItem(index: number) {
    const source = items[index];
    if (!source) return;
    const clone: DraftItem = {
      ...source,
      id: source.id,
      appliedAdjustments: source.appliedAdjustments.map((adjustment) => ({ ...adjustment })),
      personalization: { ...source.personalization },
    };
    onChange([
      ...items.slice(0, index + 1),
      clone,
      ...items.slice(index + 1),
    ]);
  }

  function addAdjustment(index: number) {
    updateItem(index, (current) => ({
      ...current,
      appliedAdjustments: [
        ...current.appliedAdjustments,
        { label: "", unitAmount: "0", quantity: normalizedQuantity(current.quantity), totalAmount: 0 },
      ],
    }));
  }

  function removeAdjustment(index: number, adjustmentIndex: number) {
    updateItem(index, (current) => ({
      ...current,
      appliedAdjustments: current.appliedAdjustments.filter((_, currentIndex) => currentIndex !== adjustmentIndex),
    }));
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
        const adjustmentsTotal = getItemAdjustmentsTotal(item);

        return (
          <Paper key={`draft-item-${index}`} sx={{ border: "1px solid rgba(64,44,37,.10)", boxShadow: "none", p: 1.5 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={900}>Item {index + 1}</Typography>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Button size="small" variant="text" startIcon={<Copy size={16} />} onClick={() => duplicateItem(index)}>
                    Copiar línea
                  </Button>
                  <IconButton aria-label="Eliminar item" onClick={() => removeItem(index)}>
                    <Trash2 size={18} />
                  </IconButton>
                </Stack>
              </Stack>

              <Autocomplete
                freeSolo
                options={products}
                getOptionLabel={(option) => typeof option === "string" ? option : option.name}
                value={selectedProduct}
                inputValue={item.productName}
                onInputChange={(_event, nextValue, reason) => {
                  if (reason === "reset") return;
                  clearField(`items.${index}.productName`);
                  updateItem(index, (current) => ({
                    ...current,
                    productId: "",
                    productName: nextValue,
                    skuSnapshot: "",
                    variantNameSnapshot: "",
                    personalization: current.productName === nextValue ? current.personalization : {},
                  }));
                }}
                onChange={(_event, nextValue) => {
                  clearField(`items.${index}.productName`);
                  if (!nextValue) {
                    updateItem(index, (current) => ({
                      ...current,
                      productId: "",
                      skuSnapshot: "",
                      variantNameSnapshot: "",
                    }));
                    return;
                  }
                  if (typeof nextValue === "string") {
                    updateItem(index, (current) => ({
                      ...defaultItem(undefined, nextValue || current.productName),
                      appliedAdjustments: syncAdjustmentsQuantity(current.appliedAdjustments, normalizedQuantity(current.quantity)),
                    }));
                    return;
                  }
                  updateItem(index, (current) => ({
                    ...defaultItem(nextValue),
                    quantity: current.quantity,
                    appliedAdjustments: syncAdjustmentsQuantity(current.appliedAdjustments, normalizedQuantity(current.quantity)),
                  }));
                }}
                renderInput={(params) => <TextField {...params} size="small" label="Producto" error={Boolean(fieldErrorFor(`items.${index}.productName`))} helperText={fieldErrorFor(`items.${index}.productName`)} />}
              />

              <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cantidad"
                    value={item.quantity}
                    onChange={(event) => {
                      clearField(`items.${index}.quantity`);
                      updateItem(index, (current) => {
                        const quantity = normalizedQuantity(event.target.value);
                        return {
                          ...current,
                          quantity: event.target.value,
                          appliedAdjustments: syncAdjustmentsQuantity(current.appliedAdjustments, quantity),
                        };
                      });
                    }}
                    error={Boolean(fieldErrorFor(`items.${index}.quantity`))}
                    helperText={fieldErrorFor(`items.${index}.quantity`)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Costo individual"
                    value={item.unitPrice}
                    onChange={(event) => {
                      clearField(`items.${index}.unitPrice`);
                      updateItem(index, (current) => ({ ...current, unitPrice: event.target.value }));
                    }}
                    error={Boolean(fieldErrorFor(`items.${index}.unitPrice`))}
                    helperText={fieldErrorFor(`items.${index}.unitPrice`)}
                    slotProps={{ input: { startAdornment: moneyInputAdornment } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth size="small" label="Cargos adicionales" value={formatCurrency(adjustmentsTotal)} slotProps={{ input: { readOnly: true } }} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth size="small" label="Costo total" value={formatCurrency(lineTotal)} slotProps={{ input: { readOnly: true } }} />
                </Grid>
              </Grid>

              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={900}>Cargos adicionales</Typography>
                  <Button size="small" startIcon={<Plus size={16} />} onClick={() => addAdjustment(index)}>
                    Agregar cargo
                  </Button>
                </Stack>
                {item.appliedAdjustments.length === 0 && <Typography color="text.secondary">Sin cargos.</Typography>}
                {item.appliedAdjustments.map((adjustment, adjustmentIndex) => (
                  <Grid key={`adjustment-${index}-${adjustmentIndex}`} container spacing={1.25} alignItems="center">
                    <Grid size={{ xs: 12, md: 5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Cargo"
                        value={adjustment.label}
                        onChange={(event) => {
                          clearField(`items.${index}.appliedAdjustments.${adjustmentIndex}.label`);
                          updateItem(index, (current) => ({
                            ...current,
                            appliedAdjustments: current.appliedAdjustments.map((currentAdjustment, currentIndex) => currentIndex === adjustmentIndex
                              ? { ...currentAdjustment, label: event.target.value }
                              : currentAdjustment),
                          }));
                        }}
                        error={Boolean(fieldErrorFor(`items.${index}.appliedAdjustments.${adjustmentIndex}.label`))}
                        helperText={fieldErrorFor(`items.${index}.appliedAdjustments.${adjustmentIndex}.label`)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Monto por unidad"
                        value={adjustment.unitAmount}
                        onChange={(event) => {
                          clearField(`items.${index}.appliedAdjustments.${adjustmentIndex}.unitAmount`);
                          updateItem(index, (current) => {
                            const quantity = normalizedQuantity(current.quantity);
                            return {
                              ...current,
                              appliedAdjustments: current.appliedAdjustments.map((currentAdjustment, currentIndex) => currentIndex === adjustmentIndex
                                ? {
                                    ...currentAdjustment,
                                    unitAmount: event.target.value,
                                    quantity,
                                    totalAmount: roundMoney(Math.max(0, toNumberOrZero(event.target.value)) * quantity),
                                  }
                                : currentAdjustment),
                            };
                          });
                        }}
                        error={Boolean(fieldErrorFor(`items.${index}.appliedAdjustments.${adjustmentIndex}.unitAmount`))}
                        helperText={fieldErrorFor(`items.${index}.appliedAdjustments.${adjustmentIndex}.unitAmount`)}
                        slotProps={{ input: { startAdornment: moneyInputAdornment } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth size="small" label="Total del cargo" value={formatCurrency(adjustment.totalAmount)} slotProps={{ input: { readOnly: true } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                      <IconButton aria-label="Eliminar cargo" onClick={() => removeAdjustment(index, adjustmentIndex)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
              </Stack>

              <Stack
                spacing={1.25}
                sx={{
                  pt: 1,
                  borderTop: "1px solid rgba(64,44,37,.10)",
                }}
              >
                <Typography fontWeight={900}>Campos operativos</Typography>
                {customFields.length > 0 ? (
                  <Grid container spacing={1.25}>
                    {customFields.map((field) => {
                      const fieldKey = field.id ?? field.label;
                      return (
                        <Grid key={`${fieldKey}-${index}`} size={{ xs: 12, md: 6 }}>
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
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
