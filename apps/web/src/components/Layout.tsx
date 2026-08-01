import { AppBar, Badge, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import { Heart, LayoutDashboard, ShoppingBag } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { useCart } from "../store/cart";

export function Layout() {
  const cart = useCart();

  return (
    <Box minHeight="100vh">
      <AppBar position="sticky" elevation={0} color="transparent" sx={{ backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(143,85,189,.14)" }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: { xs: 0.5, sm: 2 }, py: 1 }}>
            <Box component={Link} to="/" sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1, minWidth: 0 }}>
              <Box component="img" src="/seed/artenova-logo.jpg" alt="Artenova" sx={{ width: { xs: 42, sm: 48 }, height: { xs: 42, sm: 48 }, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              <Box>
                <Typography variant="h6" fontWeight={900} lineHeight={1} sx={{ fontSize: { xs: 18, sm: 22 } }}>
                  Artenova
                </Typography>
                <Typography className="mobile-hide" variant="caption" color="text.secondary">
                  corte y grabado laser
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={{ xs: 0.25, sm: 1 }} alignItems="center" sx={{ flexShrink: 0 }}>
              <Button className="mobile-icon-button" component={Link} to="/catalogo" startIcon={<Heart size={18} />} aria-label="Catálogo">
                <Box component="span" className="mobile-hide">Catálogo</Box>
              </Button>
              <Button className="mobile-hide" component={Link} to="/contacto">
                Contacto
              </Button>
              <Button className="mobile-icon-button" component={Link} to="/admin" startIcon={<LayoutDashboard size={18} />} aria-label="Admin">
                <Box component="span" className="mobile-hide">Admin</Box>
              </Button>
              <Button className="mobile-icon-button" component={Link} to="/carrito" variant="contained" startIcon={<ShoppingBag size={18} />} aria-label="Pedido">
                <Badge color="secondary" badgeContent={cart.count}>
                  <Box component="span" className="mobile-hide">Pedido</Box>
                </Badge>
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>
      <Outlet />
    </Box>
  );
}
