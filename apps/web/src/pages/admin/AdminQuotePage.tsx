import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Alert, Autocomplete, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import { Download, Plus, Trash2 } from "lucide-react";
import type { Product } from "@artenova/shared";
import { api } from "../../lib/api";
import { adminSurfaceSx } from "./adminUi";
import { calculateQuote, newQuote, quoteLineImage, quoteLogo, quoteMoney, quoteSummary, validateQuote, type Quote, type QuoteCatalogItem, type QuoteLine } from "./quote";

const fieldsGrid = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
  gap: 1.5
};
const section = { ...adminSurfaceSx, p: { xs: 2, md: 2.5 } };
const issuerFields = [
  ["name", "Nombre comercial"], ["legalName", "Razón social"], ["taxId", "RUC/DV"],
  ["phone", "WhatsApp"], ["email", "Correo"], ["address", "Dirección"]
] as const;
const customerFields = [
  ["name", "Nombre o empresa"], ["contact", "Contacto"], ["taxId", "RUC/DV"],
  ["phone", "Teléfono"], ["email", "Correo"], ["address", "Dirección"]
] as const;

export function AdminQuotePage() {
  const [quote, setQuote] = useState(newQuote);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<"loading" | "ready" | "error">("loading");
  const [settingsFailed, setSettingsFailed] = useState(false);
  const [issuerLoading, setIssuerLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeAllThumbnails, setIncludeAllThumbnails] = useState(false);
  const nextLineId = useRef(0);

  useEffect(() => {
    let active = true;
    void api.adminProducts().then((items) => {
      if (!active) return;
      setProducts(items);
      setCatalog("ready");
    }).catch(() => { if (active) setCatalog("error"); });
    void api.settings().then((settings) => {
      if (!active) return;
      setQuote((current) => ({
        ...current,
        issuer: {
          ...current.issuer,
          name: settings.brandName || "Artenova",
          phone: settings.whatsapp ?? "",
          email: settings.email ?? "",
          address: settings.address ?? ""
        }
      }));
    }).catch(() => { if (active) setSettingsFailed(true); })
      .finally(() => { if (active) setIssuerLoading(false); });
    return () => { active = false; };
  }, []);

  const options = useMemo(() => products.flatMap<QuoteCatalogItem>((product) => {
    const variants = product.variants.filter((variant) => variant.isActive);
    return variants.length
      ? variants.map((variant) => ({
          product, variant, label: `${product.name} · ${variant.name}${variant.sku ? ` (${variant.sku})` : ""}`
        }))
      : [{ product, variant: null, label: product.name }];
  }), [products]);
  const amounts = calculateQuote(quote);

  function update<K extends keyof Quote>(field: K, value: Quote[K]) {
    setQuote((current) => ({ ...current, [field]: value }));
  }

  function addLine(item: QuoteCatalogItem | null) {
    const hasImage = item ? Boolean(quoteLineImage({ id: "", item, description: "", quantity: "1", unitPrice: null, includeThumbnail: false })) : false;
    const line: QuoteLine = {
      id: String(++nextLineId.current),
      item,
      description: "",
      quantity: String(item?.product.minimumSaleQuantity ?? 1),
      unitPrice: item ? null : "",
      includeThumbnail: hasImage && includeAllThumbnails
    };
    setQuote((current) => ({ ...current, lines: [...current.lines, line] }));
  }

  function updateLine(id: string, fields: Partial<QuoteLine>) {
    setQuote((current) => ({
      ...current, lines: current.lines.map((line) => line.id === id ? { ...line, ...fields } : line)
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const validation = validateQuote(quote, amounts);
    setError(validation ?? "");
    if (validation) return;
    setBusy(true);
    try {
      const { downloadQuote } = await import("./quotePdf");
      const missingImages = await downloadQuote(quote, amounts);
      if (missingImages.length) setError(`El PDF se descargó. No se pudieron incluir las miniaturas de las líneas ${missingImages.join(", ")}.`);
    } catch {
      setError("No se pudo generar el PDF. Vuelve a intentar la descarga.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack component="form" noValidate onSubmit={submit} spacing={2}>
      <Typography variant="h4" component="h1">Cotizaciones</Typography>
      <Paper sx={section}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="h6" component="h2">Emisor</Typography>
            <Box component="img" src={quoteLogo} alt="Artenova" sx={{ width: 100, objectFit: "contain" }} />
          </Stack>
          {settingsFailed && <Alert severity="warning">No se pudieron cargar los datos de Artenova. Puedes ingresarlos aquí.</Alert>}
          <Box sx={fieldsGrid}>
            {issuerFields.map(([key, label]) => (
              <TextField key={key} label={label} size="small" value={quote.issuer[key]} required={key === "name"}
                disabled={issuerLoading}
                onChange={(event) => update("issuer", { ...quote.issuer, [key]: event.target.value })} />
            ))}
          </Box>
        </Stack>
      </Paper>
      <Paper sx={section}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">Cliente</Typography>
          <Box sx={fieldsGrid}>
            {customerFields.map(([key, label]) => (
              <TextField key={key} label={label} size="small" value={quote.customer[key]} required={key === "name"}
                onChange={(event) => update("customer", { ...quote.customer, [key]: event.target.value })} />
            ))}
          </Box>
          <Box sx={fieldsGrid}>
            <TextField label="Referencia" size="small" value={quote.reference} onChange={(event) => update("reference", event.target.value)} />
            <TextField label="Fecha de emisión" size="small" type="date" required slotProps={{ inputLabel: { shrink: true } }}
              value={quote.issued} onChange={(event) => update("issued", event.target.value)} />
            <TextField label="Vigente hasta" size="small" type="date" slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: quote.issued } }}
              value={quote.validUntil} onChange={(event) => update("validUntil", event.target.value)} />
          </Box>
        </Stack>
      </Paper>
      <Paper sx={section}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">Detalle</Typography>
          {catalog === "error" && <Alert severity="warning">No se pudo cargar el catálogo. Puedes agregar líneas manuales.</Alert>}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Autocomplete options={options} value={null} loading={catalog === "loading"} disabled={catalog === "error" || quote.lines.length >= 100}
              getOptionLabel={(item) => item.label} getOptionKey={(item) => item.variant?.id ?? item.product.id}
              onChange={(_, item) => { if (item) addLine(item); }} clearOnBlur
              renderInput={(params) => <TextField {...params} label="Agregar producto del catálogo" size="small" />}
              noOptionsText="No se encontraron productos" loadingText="Cargando catálogo…" sx={{ flex: 1 }} />
            <Button variant="outlined" type="button" startIcon={<Plus size={18} />} onClick={() => addLine(null)} disabled={quote.lines.length >= 100}>
              Agregar línea manual
            </Button>
          </Stack>
          {quote.lines.some((line) => quoteLineImage(line)) && (
            <FormControlLabel label="Incluir miniaturas" control={<Checkbox
              checked={quote.lines.filter((line) => quoteLineImage(line)).every((line) => line.includeThumbnail)}
              indeterminate={quote.lines.some((line) => quoteLineImage(line) && line.includeThumbnail) && quote.lines.some((line) => quoteLineImage(line) && !line.includeThumbnail)}
              onChange={(_, checked) => {
                setIncludeAllThumbnails(checked);
                setQuote((current) => ({ ...current, lines: current.lines.map((line) => quoteLineImage(line) ? { ...line, includeThumbnail: checked } : line) }));
              }} />} />
          )}
          {quote.lines.length >= 100 && <Alert severity="info">Cada cotización admite hasta 100 líneas.</Alert>}
          {quote.lines.map((line, index) => {
            const price = amounts.lines[index];
            return (
              <Stack key={line.id} spacing={1.25} sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight={700} sx={{ overflowWrap: "anywhere" }}>{line.item?.label ?? "Línea manual"}</Typography>
                  <Button size="small" color="error" startIcon={<Trash2 size={16} />} onClick={() =>
                    setQuote((current) => ({ ...current, lines: current.lines.filter((item) => item.id !== line.id) }))}>
                    Eliminar
                  </Button>
                </Stack>
                {quoteLineImage(line) && <FormControlLabel label="Incluir miniatura" control={<Checkbox size="small" checked={line.includeThumbnail}
                  onChange={(_, checked) => updateLine(line.id, { includeThumbnail: checked })} />} />}
                <TextField label="Descripción" size="small" required multiline maxRows={5} value={line.description}
                  slotProps={{ htmlInput: { maxLength: 1500 } }}
                  onChange={(event) => updateLine(line.id, { description: event.target.value })} />
                <Box sx={fieldsGrid}>
                  <TextField label="Cantidad" size="small" required value={line.quantity} slotProps={{ htmlInput: { inputMode: "numeric" } }}
                    onChange={(event) => updateLine(line.id, { quantity: event.target.value })} />
                  <TextField label="Precio unitario (USD)" size="small" helperText={line.unitPrice === null ? "Precio de catálogo" : "Precio personalizado"}
                    value={line.unitPrice ?? (price ? (price.unit / 100).toFixed(2) : "")}
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    helperText={price?.packagePrice ? "Precio por paquete. El importe usa el total exacto." : undefined}
                    onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} />
                  <Typography sx={{ alignSelf: "center" }}>Importe <strong>{price ? quoteMoney(price.total) : "—"}</strong></Typography>
                </Box>
                {line.item && line.unitPrice !== null && (
                  <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => updateLine(line.id, { unitPrice: null })}>
                    Restaurar precio del catálogo
                  </Button>
                )}
              </Stack>
            );
          })}
        </Stack>
      </Paper>
      <Paper sx={section}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">Condiciones y totales</Typography>
          <Box sx={fieldsGrid}>
            <TextField label="Plazo de entrega" size="small" value={quote.delivery} onChange={(event) => update("delivery", event.target.value)} />
            <TextField label="Condiciones de pago" size="small" value={quote.payment} onChange={(event) => update("payment", event.target.value)} />
          </Box>
          <TextField label="Observaciones" size="small" multiline minRows={2} maxRows={6} value={quote.notes}
            onChange={(event) => update("notes", event.target.value)} />
          <Box sx={fieldsGrid}>
            <TextField select label="Descuento" size="small" value={quote.discountKind}
              onChange={(event) => update("discountKind", event.target.value as Quote["discountKind"])}>
              <MenuItem value="none">Sin descuento</MenuItem>
              <MenuItem value="fixed">Monto fijo</MenuItem>
              <MenuItem value="percent">Porcentaje</MenuItem>
            </TextField>
            {quote.discountKind !== "none" && (
              <TextField label={quote.discountKind === "fixed" ? "Descuento (USD)" : "Descuento (%)"} size="small" required value={quote.discount}
                slotProps={{ htmlInput: { inputMode: "decimal" } }} onChange={(event) => update("discount", event.target.value)} />
            )}
            <FormControlLabel control={<Switch checked={quote.taxEnabled} onChange={(_, checked) => update("taxEnabled", checked)} />} label="Aplicar ITBMS" />
            {quote.taxEnabled && (
              <TextField label="Tasa de ITBMS (%)" size="small" required value={quote.taxRate}
                slotProps={{ htmlInput: { inputMode: "decimal" } }} onChange={(event) => update("taxRate", event.target.value)} />
            )}
          </Box>
          <Stack spacing={0.75} sx={{ alignSelf: { xs: "stretch", sm: "flex-end" }, minWidth: { sm: 280 } }}>
            {quoteSummary(quote, amounts).map(([label, value]) => (
              <Stack key={label} direction="row" justifyContent="space-between" spacing={2} sx={{
                fontWeight: label === "Total" ? 800 : 400,
                borderTop: label === "Total" ? 1 : 0, borderColor: "divider", pt: label === "Total" ? 1 : 0
              }}>
                <span>{label}</span><span>{value}</span>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" type="submit" disabled={busy || issuerLoading} startIcon={<Download size={18} />}
        sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}>
        {busy ? "Generando PDF…" : "Descargar PDF"}
      </Button>
    </Stack>
  );
}
