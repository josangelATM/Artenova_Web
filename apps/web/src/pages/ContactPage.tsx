import { Container, Grid, Paper, Stack, TextField, Typography } from "@mui/material";

export function ContactPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: 36, md: 54 } }}>Hablemos de tu idea</Typography>
          <Typography color="text.secondary" mt={2}>
            Comparte el recuerdo, evento o regalo que quieres crear. La tienda te ayuda a ordenar el pedido; el equipo confirma cada detalle contigo.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <TextField label="Nombre" />
              <TextField label="WhatsApp" />
              <TextField label="Mensaje" multiline minRows={5} />
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

