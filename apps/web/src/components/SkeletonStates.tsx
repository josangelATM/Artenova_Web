import { Box, Container, Grid, Skeleton, Stack } from "@mui/material";

export function CatalogGridSkeleton() {
  return (
    <Grid container spacing={3} aria-label="Preparando catálogo">
      {Array.from({ length: 8 }).map((_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" sx={{ aspectRatio: "4 / 5", borderRadius: 2 }} />
            <Skeleton width="78%" />
            <Skeleton width="46%" />
          </Stack>
        </Grid>
      ))}
    </Grid>
  );
}

export function ProductPageSkeleton() {
  return (
    <Container maxWidth="xl" sx={{ py: 5 }} aria-label="Buscando producto">
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rounded" sx={{ aspectRatio: "4 / 5", borderRadius: 3 }} />
          <Stack direction="row" spacing={1} mt={1.5}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} variant="rounded" width={76} height={76} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2.5}>
            <Skeleton width="72%" height={70} />
            <Skeleton width="100%" />
            <Skeleton width="84%" />
            <Box>
              <Skeleton variant="rounded" height={126} sx={{ borderRadius: 2 }} />
            </Box>
            <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={92} sx={{ borderRadius: 2 }} />
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
