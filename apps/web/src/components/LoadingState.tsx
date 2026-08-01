import { Box, CircularProgress, Typography } from "@mui/material";

export function LoadingState({ label = "Cargando" }: { label?: string }) {
  return (
    <Box display="grid" sx={{ placeItems: "center" }} py={8} gap={2}>
      <CircularProgress />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

