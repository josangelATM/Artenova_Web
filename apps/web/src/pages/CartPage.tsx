import { useState } from "react";
import { Alert, Box, Button, Container, Divider, IconButton, List, ListItem, ListItemText, Paper, Stack, TextField, Typography } from "@mui/material";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { calculateLineTotal, formatCurrency } from "@artenova/shared";
import { api } from "../lib/api";
import { useCart } from "../store/cart";

export function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          personalization: item.personalization
        }))
      });
      if (files.length > 0) {
        await api.uploadOrderFiles(order.code, files);
      }
      cart.clear();
      navigate(`/pedido/${order.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: { xs: 36, md: 54 } }}>Tu pedido</Typography>
          <Typography color="text.secondary">Artenova revisara los detalles y te contactara para confirmar precio final y entrega.</Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {cart.items.length === 0 ? (
          <Paper sx={{ p: 4 }}>
            <Typography fontWeight={900}>Tu pedido esta vacio.</Typography>
            <Button href="/catalogo" sx={{ mt: 2 }} variant="contained">Ver catálogo</Button>
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <List>
              {cart.items.map((item) => {
                const price = calculateLineTotal(item.product, item.quantity, item.selectedExtraIds);
                return (
                  <ListItem key={item.id} secondaryAction={<IconButton onClick={() => cart.removeItem(item.id)}><Trash2 size={18} /></IconButton>}>
                    <ListItemText
                      primary={<Typography fontWeight={900}>{item.product.name}</Typography>}
                      secondary={`${item.quantity} unidad(es) - ${formatCurrency(price.lineTotal)}`}
                    />
                  </ListItem>
                );
              })}
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h5" fontWeight={900}>Total estimado: {formatCurrency(cart.total)}</Typography>
          </Paper>
        )}

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={900}>Datos de contacto</Typography>
            <TextField label="Nombre" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            <TextField label="WhatsApp" required value={customerWhatsapp} onChange={(event) => setCustomerWhatsapp(event.target.value)} />
            <TextField label="Nota para Artenova" multiline minRows={3} value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} />
            <Button component="label" variant="outlined">
              Subir fotos del pedido
              <input
                hidden
                multiple
                accept="image/png,image/jpeg,image/webp"
                type="file"
                onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">{files.length} imagen(es) seleccionada(s). Maximo 5, 10 MB cada una.</Typography>
            <Button disabled={submitting || cart.items.length === 0} variant="contained" size="large" onClick={submit}>
              Enviar pedido
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

