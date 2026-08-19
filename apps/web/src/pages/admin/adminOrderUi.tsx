import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Autocomplete, Box, Button, Checkbox, FormControlLabel, Grid, IconButton, InputAdornment, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Copy, Plus, Trash2 } from "lucide-react";
import { formatCurrency, type AdminOrderItemAdjustment, type AdminOrderPaymentInput, type CustomField, type Order, type OrderContactMethod, type Product, type ProductVariant } from "@artenova/shared";

type PersonalizationValue = string | string[] | boolean;

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
  personalization: Record<string, PersonalizationValue>;
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
  contactMethod: OrderContactMethod;
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

const emptyItemFieldErrors: Record<string, string> = Object.freeze({});

function toDraftPersonalizationMap(values: Record<string, PersonalizationValue>) {
  return Object.fromEntries(
    Object.entries(values ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value]),
  );
}

function isBooleanLikeString(value: unknown) {
  return value === "true" || value === "false";
}

function normalizeBooleanFieldValue(value: PersonalizationValue | undefined) {
  if (typeof value === "boolean") return value;
  if (isBooleanLikeString(value)) return value === "true";
  return false;
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

function getActiveVariants(product?: Product | null) {
  return (product?.variants ?? []).filter((variant) => variant.isActive);
}

function getEffectiveDefaultVariant(product?: Product | null) {
  const activeVariants = getActiveVariants(product);
  if (!product || activeVariants.length === 0) return null;
  return activeVariants.find((variant) => variant.id === product.defaultVariant?.id)
    ?? product.defaultVariant
    ?? activeVariants[0]
    ?? null;
}

function resolveVariantUnitPrice(variant?: ProductVariant | null, product?: Product | null) {
  if (variant) return variant.pricingSummary.finalPrice;
  return resolveSuggestedUnitPrice(product ?? undefined);
}

function resolveVariantBySnapshot(product: Product | null | undefined, snapshot: { variantNameSnapshot?: string; skuSnapshot?: string }) {
  const activeVariants = getActiveVariants(product);
  if (activeVariants.length === 0) return null;
  return activeVariants.find((variant) => variant.sku && variant.sku === snapshot.skuSnapshot)
    ?? activeVariants.find((variant) => variant.name === snapshot.variantNameSnapshot)
    ?? getEffectiveDefaultVariant(product);
}

function applyVariantSnapshot(current: DraftItem, product?: Product | null, variant?: ProductVariant | null) {
  return {
    ...current,
    skuSnapshot: variant?.sku ?? "",
    variantNameSnapshot: variant?.name ?? "",
    unitPrice: String(resolveVariantUnitPrice(variant, product)),
  };
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
  const variant = getEffectiveDefaultVariant(product);
  return {
    productId: product?.id ?? "",
    productName: product?.name ?? productName,
    quantity: String(quantity),
    unitPrice: String(resolveVariantUnitPrice(variant, product)),
    skuSnapshot: variant?.sku ?? "",
    variantNameSnapshot: variant?.name ?? "",
    appliedAdjustments: [],
    personalization: {},
    isDone: false,
  };
}

export function orderToDraft(order: Order): DraftOrder {
  return {
    customerName: order.customerName,
    customerWhatsapp: order.customerWhatsapp,
    contactMethod: order.contactMethod,
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
      personalization: toDraftPersonalizationMap(item.personalization ?? {}),
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
        Object.entries(item.personalization)
          .filter(([, value]) => {
            if (typeof value === "boolean") return true;
            if (Array.isArray(value)) return value.length > 0;
            return value.trim();
          })
          .map(([key, value]) => [key, typeof value === "boolean" ? value : Array.isArray(value) ? value : value.trim()]),
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
  value: PersonalizationValue | undefined,
  onChange: (next: PersonalizationValue) => void,
  keyPrefix: string,
) {
  if (field.type === "boolean") {
    return (
      <FormControlLabel
        key={keyPrefix}
        control={
          <Checkbox
            checked={normalizeBooleanFieldValue(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
        }
        label={field.label}
        sx={{ alignItems: "center", minHeight: 40, px: 0.5 }}
      />
    );
  }

  return (
    <TextField
      key={keyPrefix}
      size="small"
      fullWidth
      type="text"
      label={field.label}
      value={typeof value === "string" ? value : ""}
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
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const applyItems = useCallback((updater: (current: DraftItem[]) => DraftItem[]) => {
    const nextItems = updater(itemsRef.current);
    itemsRef.current = nextItems;
    onChange(nextItems);
  }, [onChange]);

  const updateItem = useCallback((index: number, updater: (item: DraftItem) => DraftItem) => {
    applyItems((current) => current.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)));
  }, [applyItems]);

  const addItem = useCallback(() => {
    applyItems((current) => [...current, defaultItem()]);
  }, [applyItems]);

  const removeItem = useCallback((index: number) => {
    applyItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }, [applyItems]);

  const duplicateItem = useCallback((index: number) => {
    const source = itemsRef.current[index];
    if (!source) return;
    const clone: DraftItem = {
      ...source,
      id: source.id,
      appliedAdjustments: source.appliedAdjustments.map((adjustment) => ({ ...adjustment })),
      personalization: { ...source.personalization },
    };
    applyItems((current) => [
      ...current.slice(0, index + 1),
      clone,
      ...current.slice(index + 1),
    ]);
  }, [applyItems]);

  const addAdjustment = useCallback((index: number) => {
    updateItem(index, (current) => ({
      ...current,
      appliedAdjustments: [
        ...current.appliedAdjustments,
        { label: "", unitAmount: "0", quantity: normalizedQuantity(current.quantity), totalAmount: 0 },
      ],
    }));
  }, [updateItem]);

  const removeAdjustment = useCallback((index: number, adjustmentIndex: number) => {
    updateItem(index, (current) => ({
      ...current,
      appliedAdjustments: current.appliedAdjustments.filter((_, currentIndex) => currentIndex !== adjustmentIndex),
    }));
  }, [updateItem]);

  const clearField = useCallback((field: string) => {
    onClearFieldError?.(field);
  }, [onClearFieldError]);

  const itemErrors = useMemo(() => {
    const next = items.map(() => emptyItemFieldErrors);
    if (!getFieldError) return next;
    for (let index = 0; index < items.length; index += 1) {
      const prefix = `items.${index}.`;
      const current: Record<string, string> = {};
      const possibleKeys = [
        "productName",
        "quantity",
        "unitPrice",
        ...items[index]!.appliedAdjustments.flatMap((_, adjustmentIndex) => [
          `appliedAdjustments.${adjustmentIndex}.label`,
          `appliedAdjustments.${adjustmentIndex}.unitAmount`,
        ]),
      ];
      possibleKeys.forEach((key) => {
        const message = getFieldError(`${prefix}${key}`);
        if (message) current[key] = message;
      });
      next[index] = Object.keys(current).length > 0 ? current : emptyItemFieldErrors;
    }
    return next;
  }, [getFieldError, items]);

  return (
    <Stack spacing={1.5}>
      <Button fullWidth variant="outlined" startIcon={<Plus size={18} />} onClick={addItem}>
        Agregar item
      </Button>
      {items.length === 0 && <Typography color="text.secondary">Sin items.</Typography>}
      {items.map((item, index) => (
        <MemoOrderItemCard
          key={`draft-item-${index}`}
          index={index}
          item={item}
          products={products}
          productById={productById}
          fieldErrors={itemErrors[index] ?? emptyItemFieldErrors}
          onUpdateItem={updateItem}
          onDuplicateItem={duplicateItem}
          onRemoveItem={removeItem}
          onAddAdjustment={addAdjustment}
          onRemoveAdjustment={removeAdjustment}
          onClearFieldError={clearField}
        />
      ))}
    </Stack>
  );
}

type OrderItemCardProps = {
  index: number;
  item: DraftItem;
  products: Product[];
  productById: Map<string, Product>;
  fieldErrors: Record<string, string>;
  onUpdateItem: (index: number, updater: (item: DraftItem) => DraftItem) => void;
  onDuplicateItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onAddAdjustment: (index: number) => void;
  onRemoveAdjustment: (index: number, adjustmentIndex: number) => void;
  onClearFieldError: (field: string) => void;
};

const MemoOrderItemCard = memo(function OrderItemCard({
  index,
  item,
  products,
  productById,
  fieldErrors,
  onUpdateItem,
  onDuplicateItem,
  onRemoveItem,
  onAddAdjustment,
  onRemoveAdjustment,
  onClearFieldError,
}: OrderItemCardProps) {
  const selectedProduct = item.productId ? productById.get(item.productId) ?? null : null;
  const activeVariants = getActiveVariants(selectedProduct);
  const selectedVariant = resolveVariantBySnapshot(selectedProduct, item);
  const customFields = selectedProduct?.customFields ?? [];
  const lineTotal = getItemLineTotal(item);
  const adjustmentsTotal = getItemAdjustmentsTotal(item);
  const fieldErrorFor = useCallback((field: string) => fieldErrors[field] ?? "", [fieldErrors]);
  const clearField = useCallback((field: string) => onClearFieldError(`items.${index}.${field}`), [index, onClearFieldError]);

  return (
    <Paper sx={{ border: "1px solid rgba(64,44,37,.10)", boxShadow: "none", p: 1.5 }}>
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={900}>Item {index + 1}</Typography>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Button size="small" variant="text" startIcon={<Copy size={16} />} onClick={() => onDuplicateItem(index)}>
              Copiar línea
            </Button>
            <IconButton aria-label="Eliminar item" onClick={() => onRemoveItem(index)}>
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
            clearField("productName");
            onUpdateItem(index, (current) => ({
              ...current,
              productId: "",
              productName: nextValue,
              skuSnapshot: "",
              variantNameSnapshot: "",
              unitPrice: current.productName === nextValue ? current.unitPrice : "",
              personalization: current.productName === nextValue ? current.personalization : {},
            }));
          }}
          onChange={(_event, nextValue) => {
            clearField("productName");
            if (!nextValue) {
              onUpdateItem(index, (current) => ({
                ...current,
                productId: "",
                productName: "",
                unitPrice: "",
                skuSnapshot: "",
                variantNameSnapshot: "",
                personalization: {},
              }));
              return;
            }
            if (typeof nextValue === "string") {
              onUpdateItem(index, (current) => ({
                ...defaultItem(undefined, nextValue || current.productName),
                appliedAdjustments: syncAdjustmentsQuantity(current.appliedAdjustments, normalizedQuantity(current.quantity)),
              }));
              return;
            }
            onUpdateItem(index, (current) => ({
              ...defaultItem(nextValue),
              quantity: current.quantity,
              appliedAdjustments: syncAdjustmentsQuantity(current.appliedAdjustments, normalizedQuantity(current.quantity)),
            }));
          }}
          renderInput={(params) => <TextField {...params} size="small" label="Producto" error={Boolean(fieldErrorFor("productName"))} helperText={fieldErrorFor("productName")} />}
        />

        {selectedProduct && activeVariants.length > 0 && (
          <TextField
            fullWidth
            select
            size="small"
            label="Variante"
            value={selectedVariant?.id ?? ""}
            onChange={(event) => {
              const nextVariant = activeVariants.find((variant) => variant.id === event.target.value) ?? null;
              onUpdateItem(index, (current) => applyVariantSnapshot(current, selectedProduct, nextVariant));
            }}
          >
            {activeVariants.map((variant) => (
              <MenuItem key={variant.id} value={variant.id}>
                {variant.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        <Grid container spacing={1.25}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Cantidad"
              value={item.quantity}
              onChange={(event) => {
                clearField("quantity");
                onUpdateItem(index, (current) => {
                  const quantity = normalizedQuantity(event.target.value);
                  return {
                    ...current,
                    quantity: event.target.value,
                    appliedAdjustments: syncAdjustmentsQuantity(current.appliedAdjustments, quantity),
                  };
                });
              }}
              error={Boolean(fieldErrorFor("quantity"))}
              helperText={fieldErrorFor("quantity")}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Costo individual"
              value={item.unitPrice}
              onChange={(event) => {
                clearField("unitPrice");
                onUpdateItem(index, (current) => ({ ...current, unitPrice: event.target.value }));
              }}
              error={Boolean(fieldErrorFor("unitPrice"))}
              helperText={fieldErrorFor("unitPrice")}
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
            <Button size="small" startIcon={<Plus size={16} />} onClick={() => onAddAdjustment(index)}>
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
                    clearField(`appliedAdjustments.${adjustmentIndex}.label`);
                    onUpdateItem(index, (current) => ({
                      ...current,
                      appliedAdjustments: current.appliedAdjustments.map((currentAdjustment, currentIndex) => currentIndex === adjustmentIndex
                        ? { ...currentAdjustment, label: event.target.value }
                        : currentAdjustment),
                    }));
                  }}
                  error={Boolean(fieldErrorFor(`appliedAdjustments.${adjustmentIndex}.label`))}
                  helperText={fieldErrorFor(`appliedAdjustments.${adjustmentIndex}.label`)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Monto por unidad"
                  value={adjustment.unitAmount}
                  onChange={(event) => {
                    clearField(`appliedAdjustments.${adjustmentIndex}.unitAmount`);
                    onUpdateItem(index, (current) => {
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
                  error={Boolean(fieldErrorFor(`appliedAdjustments.${adjustmentIndex}.unitAmount`))}
                  helperText={fieldErrorFor(`appliedAdjustments.${adjustmentIndex}.unitAmount`)}
                  slotProps={{ input: { startAdornment: moneyInputAdornment } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField fullWidth size="small" label="Total del cargo" value={formatCurrency(adjustment.totalAmount)} slotProps={{ input: { readOnly: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 1 }}>
                <IconButton aria-label="Eliminar cargo" onClick={() => onRemoveAdjustment(index, adjustmentIndex)}>
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
                      item.personalization[fieldKey],
                      (nextValue) => onUpdateItem(index, (current) => ({
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
              onChange={(nextValue) => onUpdateItem(index, (current) => ({
                ...current,
                personalization: { ...current.personalization, detalle: nextValue },
              }))}
            />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
});
