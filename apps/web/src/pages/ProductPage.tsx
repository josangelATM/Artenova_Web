import { useEffect, useState } from "react";
import { Box, Button, Checkbox, Container, Divider, FormControlLabel, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { ShoppingBag } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { formatCurrency, type Product } from "@artenova/shared";
import { calculateLineTotal } from "@artenova/shared";
import { LoadingState } from "../components/LoadingState";
import { api } from "../lib/api";
import { useCart } from "../store/cart";

export function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [personalization, setPersonalization] = useState<Record<string, string>>({});

  useEffect(() => {
    if (slug) void api.product(slug).then(setProduct);
  }, [slug]);

  if (!product) return <LoadingState label="Cargando producto" />;

  const price = calculateLineTotal(product, quantity, selectedExtraIds);

  function addToCart() {
    if (!product) return;
    cart.addItem({ product, quantity, selectedExtraIds, personalization });
    navigate("/carrito");
  }

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box component="img" src={product.images[0]?.url} alt={product.name} sx={{ width: "100%", borderRadius: 3, boxShadow: "0 24px 70px rgba(64,44,37,.18)" }} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h2" sx={{ fontSize: { xs: 36, md: 56 } }}>
                {product.name}
              </Typography>
              <Typography color="text.secondary" mt={1}>{product.description}</Typography>
            </Box>
            <Paper className="soft-panel" sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Material</Typography>
                  <Typography fontWeight={900}>{product.material ?? "Personalizable"}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Tamano</Typography>
                  <Typography fontWeight={900}>{product.size ?? "A confirmar"}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Tecnica</Typography>
                  <Typography fontWeight={900}>{product.technique ?? "Laser"}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Precio base</Typography>
                  <Typography fontWeight={900}>{formatCurrency(product.basePrice)}</Typography>
                </Grid>
              </Grid>
            </Paper>

            {product.priceTiers.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={900}>Ofertas por cantidad</Typography>
                <Stack spacing={1} mt={1}>
                  {product.priceTiers.map((tier) => (
                    <Stack key={tier.id ?? tier.minQuantity} direction="row" justifyContent="space-between">
                      <Typography>{tier.label ?? `${tier.minQuantity}+ unidades`}</Typography>
                      <Typography fontWeight={900}>{formatCurrency(tier.unitPrice)} c/u</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}

            <Stack spacing={2}>
              <TextField type="number" label="Cantidad" value={quantity} inputProps={{ min: 1 }} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} />
              {product.extras.map((extra) => (
                <FormControlLabel
                  key={extra.id}
                  control={
                    <Checkbox
                      checked={selectedExtraIds.includes(extra.id ?? "")}
                      onChange={(event) =>
                        setSelectedExtraIds((current) =>
                          event.target.checked ? [...current, extra.id ?? ""] : current.filter((id) => id !== extra.id)
                        )
                      }
                    />
                  }
                  label={`${extra.name} (+${formatCurrency(extra.priceDelta)})`}
                />
              ))}
            </Stack>

            <Divider />

            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={900}>Datos personalizados</Typography>
              {product.customFields.map((field) => {
                if (field.type === "image") {
                  return <Typography key={field.id} color="text.secondary">Las fotos se suben al finalizar el pedido.</Typography>;
                }
                if (field.type === "select") {
                  return (
                    <TextField key={field.id} select label={field.label} required={field.required} helperText={field.helpText} value={personalization[field.id ?? field.label] ?? ""} onChange={(event) => setPersonalization((current) => ({ ...current, [field.id ?? field.label]: event.target.value }))}>
                      {field.options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                    </TextField>
                  );
                }
                return (
                  <TextField
                    key={field.id}
                    label={field.label}
                    required={field.required}
                    type={field.type === "date" ? "date" : "text"}
                    multiline={field.type === "note"}
                    minRows={field.type === "note" ? 3 : undefined}
                    helperText={field.helpText}
                    InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
                    value={personalization[field.id ?? field.label] ?? ""}
                    onChange={(event) => setPersonalization((current) => ({ ...current, [field.id ?? field.label]: event.target.value }))}
                  />
                );
              })}
            </Stack>

            <Paper sx={{ p: 3, background: "#fff0f3" }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total estimado</Typography>
                  <Typography variant="h4" fontWeight={900}>{formatCurrency(price.lineTotal)}</Typography>
                </Box>
                <Button size="large" variant="contained" startIcon={<ShoppingBag size={20} />} onClick={addToCart}>
                  Agregar al pedido
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}

