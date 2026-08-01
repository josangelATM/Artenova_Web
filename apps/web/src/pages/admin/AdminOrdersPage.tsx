import { useEffect, useState } from "react";
import { Button, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { formatCurrency, orderStatusValues, type Order, type OrderStatus } from "@artenova/shared";
import { api } from "../../lib/api";

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    setOrders(await api.adminOrders());
  }

  useEffect(() => {
    void load();
  }, []);

  async function update(order: Order, patch: { status?: OrderStatus; finalPrice?: number | null; adminNote?: string }) {
    const updated = await api.updateOrder(order.id, patch);
    setOrders((current) => current.map((item) => (item.id === order.id ? updated : item)));
  }

  function whatsappUrl(order: Order) {
    const phone = order.customerWhatsapp.replace(/[^\d]/g, "");
    const message = encodeURIComponent(`Hola ${order.customerName}, somos Artenova. Recibimos tu pedido ${order.code} y queremos confirmar los detalles.`);
    return `https://wa.me/${phone}?text=${message}`;
  }

  return (
    <Paper sx={{ p: 3, overflowX: "auto" }}>
      <Typography variant="h5" fontWeight={900} mb={2}>Pedidos</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Código</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Estimado</TableCell>
            <TableCell>Final</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.code}</TableCell>
              <TableCell>
                <Typography fontWeight={900}>{order.customerName}</Typography>
                <Typography variant="body2" color="text.secondary">{order.customerWhatsapp}</Typography>
              </TableCell>
              <TableCell>
                <TextField select size="small" value={order.status} onChange={(event) => void update(order, { status: event.target.value as OrderStatus })}>
                  {orderStatusValues.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                </TextField>
              </TableCell>
              <TableCell>{formatCurrency(order.estimatedTotal)}</TableCell>
              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={order.finalPrice ?? ""}
                  onChange={(event) => void update(order, { finalPrice: event.target.value ? Number(event.target.value) : null })}
                  sx={{ width: 120 }}
                />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Button size="small" href={whatsappUrl(order)} target="_blank" rel="noreferrer">WhatsApp</Button>
                  <Button size="small" onClick={() => alert(order.items.map((item) => `${item.quantity} x ${item.productName}`).join("\n"))}>Ver items</Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

