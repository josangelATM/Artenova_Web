import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, Stack, Typography } from "@mui/material";
import { expenseCategoryLabels, expensePaymentMethodLabels, formatCurrency, type AdminExpense } from "@artenova/shared";
import { Pencil, Trash2 } from "lucide-react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminBackButton, AdminBreadcrumbs, AdminDetailSection, AdminField } from "./adminCrudUi";
import { AdminPageHeader } from "./adminUi";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-PA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function AdminExpenseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<AdminExpense | null>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void api.adminExpense(id)
      .then((item) => {
        if (active) setExpense(item);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar el gasto");
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function remove() {
    if (!id) return;
    try {
      setDeleting(true);
      setError("");
      await api.deleteAdminExpense(id);
      navigate("/admin/gastos", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el gasto");
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Gastos", to: "/admin/gastos" }, { label: expense?.description ?? "Detalle" }]} />
      <AdminPageHeader
        title={expense?.description ?? "Gasto"}
        subtitle="Revisa la información antes de editar o eliminar el registro."
        action={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <AdminBackButton to="/admin/gastos" />
            {id && (
              <Button component={RouterLink} to={`/admin/gastos/${id}/editar`} variant="contained" startIcon={<Pencil size={18} />}>
                Editar
              </Button>
            )}
            <Button variant="outlined" color="error" startIcon={<Trash2 size={18} />} onClick={() => setConfirmOpen(true)} disabled={!expense}>
              Eliminar
            </Button>
          </Stack>
        }
      />
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

      {expense && (
        <AdminDetailSection title="Resumen">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <AdminField label="Categoría" value={expenseCategoryLabels[expense.category]} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AdminField label="Monto" value={formatCurrency(expense.amount)} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AdminField label="Fecha del gasto" value={formatDate(expense.expenseDate)} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AdminField label="Método de pago" value={expense.paymentMethod ? expensePaymentMethodLabels[expense.paymentMethod] : "Sin especificar"} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <AdminField label="Descripción" value={expense.description} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <AdminField label="Referencia" value={expense.reference || "Sin referencia"} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <AdminField label="Notas" value={expense.notes || "Sin notas"} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AdminField label="Creado" value={formatDateTime(expense.createdAt)} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AdminField label="Actualizado" value={formatDateTime(expense.updatedAt)} />
            </Grid>
          </Grid>
        </AdminDetailSection>
      )}

      {!expense && !error && <Typography color="text.secondary">Cargando gasto...</Typography>}

      <Dialog open={confirmOpen} onClose={() => (!deleting ? setConfirmOpen(false) : undefined)}>
        <DialogTitle>Eliminar gasto</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Este borrado es definitivo. El gasto se eliminará de la base de datos y volverás al listado.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancelar</Button>
          <Button color="error" onClick={() => void remove()} disabled={deleting}>
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
