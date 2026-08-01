import { useEffect, useState } from "react";
import { Grid, List, ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { formatCurrency, type Order } from "@artenova/shared";
import { api } from "../../lib/api";

type Dashboard = { counts: { orders: number; products: number; categories: number }; latestOrders: Order[] };

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    void api.adminDashboard().then(setDashboard);
  }, []);

  if (!dashboard) return null;

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        {[
          ["Pedidos", dashboard.counts.orders],
          ["Productos", dashboard.counts.products],
          ["Categorías", dashboard.counts.categories]
        ].map(([label, value]) => (
          <Grid key={label} size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Typography color="text.secondary">{label}</Typography>
              <Typography variant="h3" fontWeight={900}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={900}>Pedidos recientes</Typography>
        <List>
          {dashboard.latestOrders.map((order) => (
            <ListItem key={order.id}>
              <ListItemText primary={`${order.code} - ${order.customerName}`} secondary={`${order.status} - ${formatCurrency(order.estimatedTotal)}`} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Stack>
  );
}

