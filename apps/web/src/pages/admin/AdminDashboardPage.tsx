import { useEffect, useState } from "react";
import { Button, Grid, Paper, Stack, Typography } from "@mui/material";
import { Boxes, FolderPlus, Plus, Tags } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, AdminStat, adminSurfaceSx } from "./adminUi";

type Dashboard = { counts: { products: number; categories: number; tags?: number } };

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    void api.adminDashboard().then(setDashboard);
  }, []);

  if (!dashboard) return null;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Inicio"
        subtitle="Mantén visible el catálogo y sus colecciones."
        action={
          <Button component={Link} to="/admin/productos" variant="contained" startIcon={<Plus size={18} />}>
            Nuevo producto
          </Button>
        }
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <AdminStat label="Productos" value={dashboard.counts.products} detail="Piezas visibles o guardadas" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AdminStat label="Categorías" value={dashboard.counts.categories} detail="Colecciones principales" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AdminStat label="Etiquetas" value={dashboard.counts.tags ?? 0} detail="Filtros y temas" />
        </Grid>
      </Grid>
      <Paper sx={{ ...adminSurfaceSx, p: 2.5 }}>
        <Stack spacing={1.25}>
          <Typography variant="h6" fontWeight={900}>
            Accesos rápidos
          </Typography>
          <Grid container spacing={1.25}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button fullWidth component={Link} to="/admin/productos" variant="outlined" startIcon={<Boxes size={18} />}>
                Nuevo producto
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button fullWidth component={Link} to="/admin/categorias" variant="outlined" startIcon={<FolderPlus size={18} />}>
                Nueva categoría
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button fullWidth component={Link} to="/admin/tags" variant="outlined" startIcon={<Tags size={18} />}>
                Nueva etiqueta
              </Button>
            </Grid>
          </Grid>
        </Stack>
      </Paper>
    </Stack>
  );
}
