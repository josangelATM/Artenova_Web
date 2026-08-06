import { useEffect, useState } from "react";
import { Alert, Button, Grid, MenuItem, Stack, TextField } from "@mui/material";
import { expenseCategoryLabels, expenseCategoryValues, expensePaymentMethodLabels, expensePaymentMethodValues, type AdminExpenseInput } from "@artenova/shared";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";
import { AdminPageHeader, AdminSection } from "./adminUi";

function currentDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const emptyExpense: AdminExpenseInput = {
  category: "otros",
  amount: 0,
  expenseDate: currentDateInputValue(),
  description: "",
  paymentMethod: null,
  reference: null,
  notes: null
};

type DraftExpense = {
  category: AdminExpenseInput["category"];
  amount: string;
  expenseDate: string;
  description: string;
  paymentMethod: NonNullable<AdminExpenseInput["paymentMethod"]> | "";
  reference: string;
  notes: string;
};

function toDraft(input: AdminExpenseInput): DraftExpense {
  return {
    category: input.category,
    amount: input.amount ? String(input.amount) : "",
    expenseDate: input.expenseDate,
    description: input.description,
    paymentMethod: input.paymentMethod ?? "",
    reference: input.reference ?? "",
    notes: input.notes ?? ""
  };
}

function toInput(draft: DraftExpense): AdminExpenseInput {
  return {
    category: draft.category,
    amount: Number(draft.amount),
    expenseDate: draft.expenseDate,
    description: draft.description,
    paymentMethod: draft.paymentMethod || null,
    reference: draft.reference || null,
    notes: draft.notes || null
  };
}

export function AdminExpenseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [draft, setDraft] = useState<DraftExpense>(toDraft(emptyExpense));
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    void api.adminExpense(id)
      .then((expense) => {
        if (!active) return;
        setDraft(toDraft({
          category: expense.category,
          amount: expense.amount,
          expenseDate: expense.expenseDate.slice(0, 10),
          description: expense.description,
          paymentMethod: expense.paymentMethod ?? null,
          reference: expense.reference ?? null,
          notes: expense.notes ?? null
        }));
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el gasto");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function save() {
    try {
      setSaving(true);
      setError("");
      await api.saveAdminExpense({ id, ...toInput(draft) });
      navigate("/admin/gastos", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el gasto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Gastos", to: "/admin/gastos" }, { label: isEdit ? "Editar" : "Nuevo" }]} />
      <AdminPageHeader
        title={isEdit ? "Editar gasto" : "Nuevo gasto"}
        subtitle="Captura el gasto con una ficha simple y enfocada en operación."
        action={<AdminBackButton to={id ? `/admin/gastos/${id}` : "/admin/gastos"} />}
      />
      <AdminSection title="Datos del gasto" description="Registra categoría, fecha, monto y contexto mínimo del movimiento.">
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                select
                disabled={loading}
                label="Categoría"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as DraftExpense["category"] })}
              >
                {expenseCategoryValues.map((value) => (
                  <MenuItem key={value} value={value}>{expenseCategoryLabels[value]}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                disabled={loading}
                label="Monto"
                type="number"
                value={draft.amount}
                onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                inputProps={{ step: "0.01", min: "0.01" }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                disabled={loading}
                label="Fecha del gasto"
                type="date"
                value={draft.expenseDate}
                onChange={(event) => setDraft({ ...draft, expenseDate: event.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                disabled={loading}
                label="Método de pago"
                value={draft.paymentMethod}
                onChange={(event) => setDraft({ ...draft, paymentMethod: event.target.value as DraftExpense["paymentMethod"] })}
              >
                <MenuItem value="">Sin especificar</MenuItem>
                {expensePaymentMethodValues.map((value) => (
                  <MenuItem key={value} value={value}>{expensePaymentMethodLabels[value]}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                disabled={loading}
                label="Referencia"
                value={draft.reference}
                onChange={(event) => setDraft({ ...draft, reference: event.target.value })}
                inputProps={{ maxLength: 80 }}
                helperText={`${draft.reference.length}/80`}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                disabled={loading}
                label="Descripción"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                inputProps={{ maxLength: 200 }}
                helperText={`${draft.description.length}/200`}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                disabled={loading}
                label="Notas"
                multiline
                minRows={4}
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                inputProps={{ maxLength: 500 }}
                helperText={`${draft.notes.length}/500`}
              />
            </Grid>
          </Grid>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={() => void save()} disabled={loading || saving}>
              {saving ? "Guardando..." : "Guardar gasto"}
            </Button>
            <AdminBackButton to={id ? `/admin/gastos/${id}` : "/admin/gastos"} label="Cancelar" />
          </Stack>
        </Stack>
      </AdminSection>
    </Stack>
  );
}
