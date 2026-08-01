import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import { Link, Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";

export function Layout() {
  return (
    <Box minHeight="100vh">
      <ScrollToTop />
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(143,85,189,.14)",
          bgcolor: "rgba(255, 247, 239, 0.88)",
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: { xs: 0.5, sm: 2 }, py: { xs: 0.75, sm: 1 }, minHeight: { xs: 58, sm: 68 } }}>
            <Box
              component={Link}
              to="/"
              aria-label="Inicio Artenova"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexGrow: 1,
                minWidth: 0,
              }}
            >
              <Box
                component="img"
                src="/brand/artenova-logo.png"
                alt="Artenova"
                sx={{
                  width: { xs: 42, sm: 48 },
                  height: { xs: 42, sm: 48 },
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
              <Box minWidth={0}>
                <Typography
                  variant="h6"
                  fontWeight={900}
                  lineHeight={1}
                  noWrap
                  sx={{ fontSize: { xs: 17, sm: 22 }, maxWidth: { xs: 104, sm: "none" } }}
                >
                  Artenova
                </Typography>
                <Typography className="mobile-hide" variant="caption" color="text.secondary">
                  Taller creativo de corte y grabado láser
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={{ xs: 0.25, sm: 1 }} alignItems="center" sx={{ flexShrink: 0 }}>
              <Button component={Link} to="/contacto">
                Contacto
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>
      <Outlet />
      <Footer />
    </Box>
  );
}
