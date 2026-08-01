import { useEffect, useState } from "react";
import { Alert, Box, Button, Container, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

const tabs = [
  { label: "Resumen", to: "/admin" },
  { label: "Pedidos", to: "/admin/pedidos" },
  { label: "Categorías", to: "/admin/categorias" },
  { label: "Productos", to: "/admin/productos" },
  { label: "Ajustes", to: "/admin/ajustes" }
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.adminMe()
      .then(() => setReady(true))
      .catch(() => navigate("/admin/login"));
  }, [navigate]);

  if (!ready) return null;

  const current = tabs.findIndex((tab) => tab.to === location.pathname);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box display="flex" justifyContent="space-between" gap={2} alignItems="center">
          <Box>
            <Typography variant="h3">Panel Artenova</Typography>
            <Typography color="text.secondary">Catálogo, pedidos y contenido de la tienda.</Typography>
          </Box>
          <Button href="/" variant="outlined">Ver tienda</Button>
        </Box>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <Tabs value={current >= 0 ? current : 0} variant="scrollable">
          {tabs.map((tab) => (
            <Tab key={tab.to} component={Link} to={tab.to} label={tab.label} />
          ))}
        </Tabs>
        <Outlet context={{ setError }} />
      </Stack>
    </Container>
  );
}
