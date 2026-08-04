import { useEffect, useState } from "react";
import { Button, Grid, Paper, Stack, Typography } from "@mui/material";
import { Boxes, FolderPlus, MessageSquareText, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminPageHeader, AdminStat, adminSurfaceSx } from "./adminUi";

type Dashboard = { counts: { products: number; categories: number; reviews?: number } };

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    void api.adminDashboard().then(setDashboard);
  }, []);

  if (!dashboard) return null;

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Inicio"
        subtitle="Mantén visible el catálogo y entra rápido a los flujos más usados."
        action={
          <Button component={Link} to="/admin/productos/nuevo" variant="contained" startIcon={<Plus size={18} />}>
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
          <AdminStat label="Reseñas" value={dashboard.counts.reviews ?? 0} detail="Opiniones publicadas u ocultas" />
        </Grid>
      </Grid>
      <Paper sx={{ ...adminSurfaceSx, p: 2.5 }}>
        <Stack spacing={1.25}>
          <Typography variant="h6" fontWeight={900}>
            Accesos rápidos
          </Typography>
          <Grid container spacing={1.25}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button fullWidth component={Link} to="/admin/productos/nuevo" variant="outlined" startIcon={<Boxes size={18} />}>
                Nuevo producto
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button fullWidth component={Link} to="/admin/resenas/nuevo" variant="outlined" startIcon={<MessageSquareText size={18} />}>
                Nueva reseña
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button fullWidth component={Link} to="/admin/categorias/nuevo" variant="outlined" startIcon={<FolderPlus size={18} />}>
                Nueva categoría
              </Button>
            </Grid>
          </Grid>
        </Stack>
      </Paper>
    </Stack>
  );
}
