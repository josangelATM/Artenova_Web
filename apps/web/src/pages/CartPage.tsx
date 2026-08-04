import { useEffect, useState } from "react";
import { Alert, Box, Button, Container, Divider, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { calculateLineTotal, formatCurrency } from "@artenova/shared";
import { api } from "../lib/api";
import { applySeo } from "../lib/seo";
import { useCart } from "../store/cart";

export function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    applySeo({
      title: "Tu pedido",
      description: "Revisa tu pedido de piezas personalizadas antes de enviarlo a Artenova.",
      path: "/carrito",
      robots: "noindex,follow",
      type: "website",
    });
  }, []);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const order = await api.createOrder({
        customerName,
        customerWhatsapp,
        customerNote,
        items: cart.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          selectedExtraIds: item.selectedExtraIds,
          personalization: item.personalization,
        })),
      });
      cart.clear();
      navigate(`/pedido/${order.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 54 } }}>Tu pedido</Typography>
          <Typography color="text.secondary">Revisa las piezas y completa tus datos.</Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {cart.items.length === 0 ? (
          <Paper sx={{ p: { xs: 3, md: 4 } }}>
            <Typography fontWeight={900}>Tu pedido está vacío.</Typography>
            <Button href="/catalogo" sx={{ mt: 2 }} variant="contained">Ver catálogo</Button>
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={1.5}>
              {cart.items.map((item) => {
                const price = calculateLineTotal(item.product, item.quantity, item.selectedExtraIds);
                const image = item.product.images[0];
                return (
                  <Stack key={item.id} direction="row" spacing={1.5} alignItems="center">
                    {image && (
                      <Box component="img" src={image.url} alt={image.alt || item.product.name} sx={{ width: 58, height: 58, objectFit: "cover", borderRadius: 1.5, flexShrink: 0 }} />
                    )}
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={900} noWrap>{item.product.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.quantity} unidad(es) · {formatCurrency(price.lineTotal)}
                      </Typography>
                    </Box>
                    <IconButton aria-label="Eliminar producto" onClick={() => cart.removeItem(item.id)} sx={{ width: 44, height: 44 }}>
                      <Trash2 size={18} />
                    </IconButton>
                  </Stack>
                );
              })}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <Typography variant="body2" color="text.secondary">Total estimado</Typography>
              <Typography variant="h5" fontWeight={900}>{formatCurrency(cart.total)}</Typography>
            </Stack>
          </Paper>
        )}

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={900}>Datos de contacto</Typography>
            <TextField label="Nombre" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            <TextField label="WhatsApp" required value={customerWhatsapp} onChange={(event) => setCustomerWhatsapp(event.target.value)} />
            <TextField label="Nota para Artenova" multiline minRows={3} value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} />
            <Button disabled={submitting || cart.items.length === 0} variant="contained" size="large" onClick={submit} sx={{ minHeight: 48 }}>
              {submitting ? "Enviando pedido..." : "Enviar pedido"}
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
