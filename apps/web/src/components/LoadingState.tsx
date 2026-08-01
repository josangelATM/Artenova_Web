import { Box, Stack, Typography } from "@mui/material";

export function LoadingState({ label = "Preparando" }: { label?: string }) {
  return (
    <Box display="grid" sx={{ placeItems: "center" }} py={8} gap={2}>
      <Stack direction="row" spacing={0.8} aria-hidden>
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: index === 1 ? "secondary.main" : "primary.main",
              animation: "artenovaPulse 1.1s ease-in-out infinite",
              animationDelay: `${index * 0.14}s`,
              "@keyframes artenovaPulse": {
                "0%, 80%, 100%": { transform: "translateY(0)", opacity: 0.45 },
                "40%": { transform: "translateY(-6px)", opacity: 1 },
              },
            }}
          />
        ))}
      </Stack>
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

