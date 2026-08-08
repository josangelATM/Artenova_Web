import { useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type {
  AdminQRCodeInput,
  QRCode,
  QRCodePreviewInput,
  QRCodeUrlDestination,
  QRCodeVCardDestination,
  QRCodeWhatsappDestination,
} from "@artenova/shared";
import { useNavigate, useParams } from "react-router-dom";
import { type ApiValidationIssue, api } from "../../lib/api";
import { clearFormErrorField, createFormErrorState, emptyFormErrorState, getFieldError } from "../../lib/formErrors";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";
import { AdminFormErrorAlert } from "./adminFormErrors";
import { AdminPageHeader, AdminSection } from "./adminUi";

type Draft = {
  name: string;
  type: "url" | "whatsapp" | "vcard";
  status: "active" | "inactive";
  foregroundColor: string;
  backgroundColor: string;
  transparentBackground: boolean;
  margin: number;
  url: string;
  phone: string;
  message: string;
  fullName: string;
  company: string;
  jobTitle: string;
  email: string;
  website: string;
  address: string;
};

function createDraft(): Draft {
  return {
    name: "",
    type: "url",
    status: "active",
    foregroundColor: "#1F2937",
    backgroundColor: "#FFFFFF",
    transparentBackground: false,
    margin: 2,
    url: "",
    phone: "",
    message: "",
    fullName: "",
    company: "",
    jobTitle: "",
    email: "",
    website: "",
    address: "",
  };
}

function draftFromQRCode(qrCode: QRCode): Draft {
  const draft = createDraft();
  draft.name = qrCode.name;
  draft.type = qrCode.type;
  draft.status = qrCode.status;
  draft.foregroundColor = qrCode.designConfig.foregroundColor;
  draft.backgroundColor = qrCode.designConfig.backgroundColor;
  draft.transparentBackground = qrCode.designConfig.transparentBackground ?? false;
  draft.margin = qrCode.designConfig.margin;

  if (qrCode.type === "url") {
    const destination = qrCode.destinationConfig as QRCodeUrlDestination;
    draft.url = destination.url;
  } else if (qrCode.type === "whatsapp") {
    const destination = qrCode.destinationConfig as QRCodeWhatsappDestination;
    draft.phone = destination.phone;
    draft.message = destination.message ?? "";
  } else {
    const destination = qrCode.destinationConfig as QRCodeVCardDestination;
    draft.fullName = destination.fullName;
    draft.company = destination.company ?? "";
    draft.jobTitle = destination.jobTitle ?? "";
    draft.phone = destination.phone ?? "";
    draft.email = destination.email ?? "";
    draft.website = destination.website ?? "";
    draft.address = destination.address ?? "";
  }

  return draft;
}

function draftToInput(draft: Draft): AdminQRCodeInput {
  const designConfig = {
    foregroundColor: draft.foregroundColor,
    backgroundColor: draft.backgroundColor,
    transparentBackground: draft.transparentBackground,
    margin: Number(draft.margin),
  };

  if (draft.type === "url") {
    return {
      name: draft.name,
      type: "url",
      status: draft.status,
      designConfig,
      destinationConfig: {
        url: draft.url,
      },
    };
  }

  if (draft.type === "whatsapp") {
    return {
      name: draft.name,
      type: "whatsapp",
      status: draft.status,
      designConfig,
      destinationConfig: {
        phone: draft.phone,
        message: draft.message.trim() || null,
      },
    };
  }

  return {
    name: draft.name,
    type: "vcard",
    status: draft.status,
    designConfig,
    destinationConfig: {
      fullName: draft.fullName,
      company: draft.company.trim() || null,
      jobTitle: draft.jobTitle.trim() || null,
      phone: draft.phone.trim() || null,
      email: draft.email.trim() || null,
      website: draft.website.trim() || null,
      address: draft.address.trim() || null,
    },
  };
}

function canPreview(draft: Draft) {
  if (draft.type === "url") {
    return /^https?:\/\//i.test(draft.url);
  }
  if (draft.type === "whatsapp") {
    return draft.phone.trim().length >= 6;
  }
  return draft.fullName.trim().length >= 2;
}

function buildPreviewInput(draft: Draft): QRCodePreviewInput {
  const input = draftToInput(draft);
  if (input.type === "url") {
    return { type: "url", designConfig: input.designConfig, destinationConfig: input.destinationConfig };
  }
  if (input.type === "whatsapp") {
    return { type: "whatsapp", designConfig: input.designConfig, destinationConfig: input.destinationConfig };
  }
  return { type: "vcard", designConfig: input.designConfig, destinationConfig: input.destinationConfig };
}

function resolveQrField(issue: ApiValidationIssue) {
  const mapping: Record<string, string> = {
    "designConfig.foregroundColor": "foregroundColor",
    "designConfig.backgroundColor": "backgroundColor",
    "designConfig.transparentBackground": "transparentBackground",
    "designConfig.margin": "margin",
    "destinationConfig.url": "url",
    "destinationConfig.phone": "phone",
    "destinationConfig.message": "message",
    "destinationConfig.fullName": "fullName",
    "destinationConfig.company": "company",
    "destinationConfig.jobTitle": "jobTitle",
    "destinationConfig.email": "email",
    "destinationConfig.website": "website",
    "destinationConfig.address": "address",
  };

  return mapping[issue.key] ?? issue.key ?? null;
}

function getQrFieldLabel(field: string) {
  const labels: Record<string, string> = {
    name: "Nombre",
    type: "Tipo",
    status: "Estado",
    foregroundColor: "Color principal",
    backgroundColor: "Color de fondo",
    transparentBackground: "Fondo transparente",
    margin: "Margen",
    url: "URL destino",
    phone: "Teléfono",
    message: "Mensaje",
    fullName: "Nombre completo",
    company: "Empresa",
    jobTitle: "Cargo",
    email: "Email",
    website: "Sitio web",
    address: "Dirección",
  };

  return labels[field] ?? field;
}

export function AdminQRCodeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [draft, setDraft] = useState<Draft>(() => createDraft());
  const [formError, setFormError] = useState(emptyFormErrorState);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSvg, setPreviewSvg] = useState("");
  const [resolvedTarget, setResolvedTarget] = useState("");
  const [previewGeneratedOnce, setPreviewGeneratedOnce] = useState(false);
  const [previewDirty, setPreviewDirty] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void api.adminQRCode(id)
      .then((item) => {
        if (!active) return;
        setDraft(draftFromQRCode(item));
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setFormError(createFormErrorState(err, { fallbackMessage: "No se pudo cargar el QR" }));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const previewSrc = useMemo(
    () => (previewSvg ? `data:image/svg+xml;utf8,${encodeURIComponent(previewSvg)}` : ""),
    [previewSvg],
  );

  function clearFields(fields: string[]) {
    setFormError((current) => fields.reduce((next, field) => clearFormErrorField(next, field), current));
  }

  function updateDraft(patch: Partial<Draft>, fieldsToClear = Object.keys(patch)) {
    setDraft((current) => ({ ...current, ...patch }));
    clearFields(fieldsToClear);
    if (previewSvg || resolvedTarget || previewGeneratedOnce) {
      setPreviewSvg("");
      setResolvedTarget("");
      setPreviewDirty(previewGeneratedOnce);
    }
  }

  async function generatePreview() {
    if (!canPreview(draft)) return;
    setPreviewLoading(true);
    setFormError(emptyFormErrorState);
    try {
      const preview = await api.previewQRCode(buildPreviewInput(draft));
      setPreviewSvg(preview.svg);
      setResolvedTarget(preview.resolvedTarget ?? "");
      setPreviewGeneratedOnce(true);
      setPreviewDirty(false);
    } catch (err) {
      setFormError(createFormErrorState(err, {
        fallbackMessage: "No se pudo generar la vista previa",
        resolveField: resolveQrField,
        getFieldLabel: getQrFieldLabel,
      }));
      setPreviewSvg("");
      setResolvedTarget("");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setFormError(emptyFormErrorState);
    try {
      const saved = await api.saveAdminQRCode(id, draftToInput(draft));
      navigate(`/admin/qrs/${saved.id}`, { replace: true });
    } catch (err) {
      setFormError(createFormErrorState(err, {
        fallbackMessage: "No se pudo guardar el QR",
        resolveField: resolveQrField,
        getFieldLabel: getQrFieldLabel,
      }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "QR", to: "/admin/qrs" }, { label: isEdit ? "Editar" : "Nuevo" }]} />
      <AdminPageHeader
        title={isEdit ? "Editar QR" : "Nuevo QR"}
        subtitle="Define el destino, el estado y el diseño básico antes de publicarlo."
        action={<AdminBackButton to={id ? `/admin/qrs/${id}` : "/admin/qrs"} />}
      />
      <AdminFormErrorAlert error={formError} onClose={() => setFormError(emptyFormErrorState)} />

      <AdminSection title="Configuración" description="Datos operativos y destino principal del QR.">
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Nombre" value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} error={Boolean(getFieldError(formError, "name"))} helperText={getFieldError(formError, "name")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select fullWidth label="Tipo" value={draft.type} onChange={(event) => updateDraft({ type: event.target.value as Draft["type"] })} error={Boolean(getFieldError(formError, "type"))} helperText={getFieldError(formError, "type")}>
                <MenuItem value="url">URL</MenuItem>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="vcard">vCard</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select fullWidth label="Estado" value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as Draft["status"] })} error={Boolean(getFieldError(formError, "status"))} helperText={getFieldError(formError, "status")}>
                <MenuItem value="active">Activo</MenuItem>
                <MenuItem value="inactive">Inactivo</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {draft.type === "url" && (
            <TextField fullWidth label="URL destino" placeholder="https://..." value={draft.url} onChange={(event) => updateDraft({ url: event.target.value })} error={Boolean(getFieldError(formError, "url"))} helperText={getFieldError(formError, "url")} />
          )}

          {draft.type === "whatsapp" && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField fullWidth label="Teléfono" value={draft.phone} onChange={(event) => updateDraft({ phone: event.target.value })} error={Boolean(getFieldError(formError, "phone"))} helperText={getFieldError(formError, "phone")} />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField fullWidth label="Mensaje" value={draft.message} onChange={(event) => updateDraft({ message: event.target.value })} error={Boolean(getFieldError(formError, "message"))} helperText={getFieldError(formError, "message")} />
              </Grid>
            </Grid>
          )}

          {draft.type === "vcard" && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Nombre completo" value={draft.fullName} onChange={(event) => updateDraft({ fullName: event.target.value })} error={Boolean(getFieldError(formError, "fullName"))} helperText={getFieldError(formError, "fullName")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Empresa" value={draft.company} onChange={(event) => updateDraft({ company: event.target.value })} error={Boolean(getFieldError(formError, "company"))} helperText={getFieldError(formError, "company")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Cargo" value={draft.jobTitle} onChange={(event) => updateDraft({ jobTitle: event.target.value })} error={Boolean(getFieldError(formError, "jobTitle"))} helperText={getFieldError(formError, "jobTitle")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Teléfono" value={draft.phone} onChange={(event) => updateDraft({ phone: event.target.value })} error={Boolean(getFieldError(formError, "phone"))} helperText={getFieldError(formError, "phone")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Email" value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} error={Boolean(getFieldError(formError, "email"))} helperText={getFieldError(formError, "email")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Sitio web" value={draft.website} onChange={(event) => updateDraft({ website: event.target.value })} error={Boolean(getFieldError(formError, "website"))} helperText={getFieldError(formError, "website")} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Dirección" value={draft.address} onChange={(event) => updateDraft({ address: event.target.value })} error={Boolean(getFieldError(formError, "address"))} helperText={getFieldError(formError, "address")} />
              </Grid>
            </Grid>
          )}
        </Stack>
      </AdminSection>

      <AdminSection title="Diseño" description="Ajustes básicos de color y margen para impresión o uso digital.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth type="color" label="Color principal" value={draft.foregroundColor} onChange={(event) => updateDraft({ foregroundColor: event.target.value })} error={Boolean(getFieldError(formError, "foregroundColor"))} helperText={getFieldError(formError, "foregroundColor")} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              type="color"
              label="Color de fondo"
              value={draft.backgroundColor}
              onChange={(event) => updateDraft({ backgroundColor: event.target.value })}
              disabled={draft.transparentBackground}
              error={Boolean(getFieldError(formError, "backgroundColor"))}
              helperText={getFieldError(formError, "backgroundColor") || (draft.transparentBackground ? "No se usa mientras el fondo transparente está activado." : undefined)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField select fullWidth label="Margen" value={String(draft.margin)} onChange={(event) => updateDraft({ margin: Number(event.target.value) })} error={Boolean(getFieldError(formError, "margin"))} helperText={getFieldError(formError, "margin")}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={(
                <Checkbox
                  checked={draft.transparentBackground}
                  onChange={(event) => updateDraft({ transparentBackground: event.target.checked })}
                />
              )}
              label="Fondo transparente"
            />
          </Grid>
        </Grid>
      </AdminSection>

      <AdminSection title="Vista previa" description="El QR final siempre codificará la URL pública propia del sistema.">
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Button variant="outlined" onClick={() => void generatePreview()} disabled={!canPreview(draft) || previewLoading}>
              {previewGeneratedOnce ? "Actualizar vista previa" : "Generar vista previa"}
            </Button>
            {!canPreview(draft) && (
              <Typography color="text.secondary">
                Completa los datos mínimos del tipo seleccionado para generar la vista previa.
              </Typography>
            )}
            {previewDirty && canPreview(draft) && (
              <Typography color="text.secondary">
                La vista previa quedó desactualizada. Vuelve a generarla para revisar los cambios.
              </Typography>
            )}
          </Stack>

          <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems={{ xs: "flex-start", lg: "center" }}>
            <Box sx={{ width: 280, minHeight: 280, display: "grid", placeItems: "center", border: "1px solid rgba(64,44,37,.10)", borderRadius: 2, bgcolor: "#fff", p: 2 }}>
              {previewSrc ? (
                <Box component="img" src={previewSrc} alt="Vista previa del QR" sx={{ width: "100%", maxWidth: 240 }} />
              ) : (
                <Box color="text.secondary">Aún no has generado una vista previa.</Box>
              )}
            </Box>
            <Stack spacing={1} width="100%">
              <Typography variant="caption" color="text.secondary">Destino resuelto</Typography>
              <Box sx={{ minHeight: 56, p: 1.5, border: "1px solid rgba(64,44,37,.12)", borderRadius: 2, bgcolor: "rgba(255,255,255,.56)", color: resolvedTarget ? "text.primary" : "text.secondary", overflowWrap: "anywhere" }}>
                {resolvedTarget || "Se mostrará después de generar la vista previa."}
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </AdminSection>

      <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1} justifyContent="flex-end">
        <AdminBackButton to={id ? `/admin/qrs/${id}` : "/admin/qrs"} label="Cancelar" />
        <Button variant="contained" onClick={() => void save()} disabled={saving || loading}>
          {isEdit ? "Guardar cambios" : "Crear QR"}
        </Button>
      </Stack>
    </Stack>
  );
}
