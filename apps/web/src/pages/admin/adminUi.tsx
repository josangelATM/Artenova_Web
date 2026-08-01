import type { ReactNode } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export const adminSurfaceSx: SxProps<Theme> = {
  border: "1px solid rgba(64,44,37,.10)",
  boxShadow: "0 10px 32px rgba(64,44,37,.07)",
  background: "rgba(255,250,245,.94)"
};

export function AdminPageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={2}>
      <Box>
        <Typography variant="h3" sx={{ fontSize: { xs: 30, md: 40 } }}>
          {title}
        </Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}

export function AdminSection({
  title,
  description,
  children,
  action
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Paper sx={{ ...adminSurfaceSx, p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5}>
          <Box>
            <Typography variant="h6" fontWeight={900}>
              {title}
            </Typography>
            {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
          </Box>
          {action}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

export function AdminEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Paper sx={{ ...adminSurfaceSx, p: 4, textAlign: "center" }}>
      <Stack spacing={1.5} alignItems="center">
        <Typography fontWeight={900}>{title}</Typography>
        {description && <Typography color="text.secondary">{description}</Typography>}
        {action}
      </Stack>
    </Paper>
  );
}

export function AdminStat({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <Paper sx={{ ...adminSurfaceSx, p: 2.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h4" fontWeight={900}>{value}</Typography>
      {detail && <Typography variant="caption" color="text.secondary">{detail}</Typography>}
    </Paper>
  );
}

const statusMeta: Record<string, { label: string; color: "default" | "primary" | "secondary" | "success" | "warning" | "error" }> = {
  nuevo: { label: "Nuevo", color: "secondary" },
  en_proceso: { label: "En proceso", color: "warning" },
  completado: { label: "Completado", color: "success" },
  cancelado: { label: "Cancelado", color: "error" },
  active: { label: "Activo", color: "success" },
  paused: { label: "Pausado", color: "default" },
  published: { label: "Publicado", color: "success" },
  draft: { label: "Oculto", color: "default" }
};

export function StatusChip({ status }: { status: string }) {
  const meta = statusMeta[status] ?? { label: status, color: "default" as const };
  return <Chip size="small" label={meta.label} color={meta.color} variant={meta.color === "default" ? "outlined" : "filled"} />;
}

export function CompactActionButton({ children, ...props }: Parameters<typeof Button>[0]) {
  return (
    <Button size="small" variant="outlined" {...props}>
      {children}
    </Button>
  );
}
