import { Chip } from "@mui/material";

export function MinimumSaleQuantityBadge({ quantity }: { quantity?: number | null }) {
  if (quantity == null || !Number.isInteger(quantity) || quantity < 1) return null;

  return (
    <Chip
      label={`A partir de ${quantity} ${quantity === 1 ? "unidad" : "unidades"}`}
      size="small"
      sx={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 2,
        maxWidth: "calc(100% - 20px)",
        height: "auto",
        bgcolor: "rgba(255,250,245,.96)",
        color: "text.primary",
        fontWeight: 900,
        boxShadow: "0 4px 14px rgba(64,44,37,.16)",
        pointerEvents: "none",
        "& .MuiChip-label": { whiteSpace: "normal", overflowWrap: "anywhere", py: 0.6 },
      }}
    />
  );
}
