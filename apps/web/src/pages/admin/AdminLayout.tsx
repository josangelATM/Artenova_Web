import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { Boxes, Eye, FolderTree, Home, MessageSquareText, Tags } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { adminSurfaceSx } from "./adminUi";

const tabs = [
  { label: "Inicio", to: "/admin", icon: Home },
  { label: "Productos", to: "/admin/productos", icon: Boxes },
  { label: "Reseñas", to: "/admin/resenas", icon: MessageSquareText },
  { label: "Categorías", to: "/admin/categorias", icon: FolderTree },
  { label: "Etiquetas", to: "/admin/tags", icon: Tags },
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

  const activeTab = useMemo(() => {
    return tabs.find((tab) => tab.to === location.pathname) ?? tabs.find((tab) => tab.to !== "/admin" && location.pathname.startsWith(tab.to)) ?? tabs[0];
  }, [location.pathname]);

  if (!ready) return null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "244px minmax(0,1fr)" }, gap: 3 }}>
          <Paper
            sx={{
              ...adminSurfaceSx,
              p: 2,
              alignSelf: "start",
              position: "sticky",
              top: { xs: 0, md: 12 },
              zIndex: (theme) => theme.zIndex.appBar + 1,
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5" fontWeight={900}>
                  Artenova
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Panel del catálogo
                </Typography>
              </Box>
              <Stack direction={{ xs: "row", md: "column" }} spacing={1} sx={{ overflowX: { xs: "auto", md: "visible" }, pb: { xs: 0.5, md: 0 } }}>
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
                      sx={{
                        justifyContent: "flex-start",
                        minWidth: { xs: "max-content", md: "auto" },
                        borderRadius: 2,
                        px: 1.5,
                      }}
                    >
                      {tab.label}
                    </Button>
                  );
                })}
              </Stack>
              <Button component={Link} to="/" variant="outlined" startIcon={<Eye size={18} />}>
                Ver tienda
              </Button>
            </Stack>
          </Paper>
          <Stack spacing={3} minWidth={0}>
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}
            <Outlet context={{ setError }} />
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
