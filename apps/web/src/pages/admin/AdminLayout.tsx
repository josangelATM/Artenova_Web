import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Container, Paper, Stack } from "@mui/material";
import { Boxes, Eye, FolderTree, Home, MessageSquareText, ReceiptText, Wallet } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { applySeo } from "../../lib/seo";
import { adminSurfaceSx } from "./adminUi";

const tabs = [
  { label: "Inicio", to: "/admin", icon: Home },
  { label: "Gastos", to: "/admin/gastos", icon: Wallet },
  { label: "Pedidos", to: "/admin/pedidos", icon: ReceiptText },
  { label: "Productos", to: "/admin/productos", icon: Boxes },
  { label: "Reseñas", to: "/admin/resenas", icon: MessageSquareText },
  { label: "Categorías", to: "/admin/categorias", icon: FolderTree },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    applySeo({
      title: "Panel admin",
      description: "Panel administrativo privado de Artenova.",
      path: "/admin",
      robots: "noindex,nofollow",
      type: "website",
    });
  }, []);

  useEffect(() => {
    void api.adminMe()
      .then(() => setReady(true))
      .catch(() => navigate("/admin/login"));
  }, [navigate]);

  const activeTab = useMemo(() => {
    return tabs.find((tab) => tab.to === location.pathname) ?? tabs.find((tab) => tab.to !== "/admin" && location.pathname.startsWith(tab.to)) ?? tabs[0];
  }, [location.pathname]);

  if (!ready) return null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 1.5, md: 2 } }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Paper sx={{ ...adminSurfaceSx, p: { xs: 1.25, md: 1.5 } }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ xs: "stretch", lg: "center" }} justifyContent="space-between">
              <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.25 }}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = tab.to === activeTab?.to;
                  return (
                    <Button
                      key={tab.to}
                      component={Link}
                      to={tab.to}
                      startIcon={<Icon size={18} />}
                      variant={active ? "contained" : "text"}
                      color={active ? "primary" : "inherit"}
                      sx={{ minWidth: "max-content", borderRadius: 2, px: 1.5 }}
                    >
                      {tab.label}
                    </Button>
                  );
                })}
              </Stack>
              <Button component={Link} to="/" variant="outlined" startIcon={<Eye size={18} />} sx={{ minWidth: "max-content" }}>
                Ver tienda
              </Button>
            </Stack>
          </Paper>
          <Stack spacing={2.5} minWidth={0}>
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}
            <Outlet context={{ setError }} />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
