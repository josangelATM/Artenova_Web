import { useEffect, useState } from "react";
import { Button, Container, Paper, Stack, Typography } from "@mui/material";
import { MessageCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import type { Order } from "@artenova/shared";
import { formatCurrency } from "@artenova/shared";
import { api } from "../lib/api";
import { LoadingState } from "../components/LoadingState";
import { applySeo } from "../lib/seo";

export function ConfirmationPage() {
  const { code } = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (code) void api.getOrder(code).then(setOrder);
  }, [code]);

  useEffect(() => {
    if (!order) return;
    applySeo({
      title: `Pedido ${order.code}`,
      description: `Pedido recibido por Artenova para ${order.customerName}. Total estimado: ${formatCurrency(order.estimatedTotal)}.`,
      path: `/pedido/${order.code}`,
      type: "website",
    });
  }, [order]);

  if (!order) return <LoadingState label="Buscando pedido" />;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }}>
      <Paper className="soft-panel" sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={2}>
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 52 } }}>Pedido recibido</Typography>
          <Typography variant="h5" fontWeight={900}>{order.code}</Typography>
          <Typography color="text.secondary">
            Gracias, {order.customerName}. Te contactaremos por WhatsApp para coordinar personalización y entrega.
          </Typography>
          <Typography fontWeight={900}>Total estimado: {formatCurrency(order.estimatedTotal)}</Typography>
          <Button href="/catalogo" variant="contained" startIcon={<MessageCircle size={20} />} sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}>
            Seguir viendo productos
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
