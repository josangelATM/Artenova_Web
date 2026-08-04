import { useEffect, useState } from "react";
import { Alert, Box, Button, Container, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { applySeo } from "../../lib/seo";
import { adminSurfaceSx } from "./adminUi";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@artenova.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    applySeo({
      title: "Acceso admin",
      description: "Acceso privado al panel administrativo de Artenova.",
      path: "/admin/login",
      robots: "noindex,nofollow",
      type: "website",
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    void api.adminMe()
      .then(() => {
        if (mounted) {
          navigate("/admin", { replace: true });
        }
      })
      .catch(() => {
        if (mounted) {
          setCheckingSession(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function login() {
    try {
      setError("");
      await api.adminLogin(email, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    }
  }

  if (checkingSession) {
    return null;
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper sx={{ ...adminSurfaceSx, p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box sx={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 2, bgcolor: "primary.main", color: "primary.contrastText" }}>
                <LockKeyhole size={20} />
              </Box>
              <Box>
                <Typography variant="h4">Panel Artenova</Typography>
                <Typography color="text.secondary">Acceso al panel</Typography>
              </Box>
            </Stack>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Correo" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void login(); }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      edge="end"
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <Button variant="contained" size="large" onClick={login}>Entrar</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
