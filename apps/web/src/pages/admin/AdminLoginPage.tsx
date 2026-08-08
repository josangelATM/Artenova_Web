import { useEffect, useState } from "react";
import { Box, Button, Container, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { clearFormErrorField, createFormErrorState, emptyFormErrorState, getFieldError } from "../../lib/formErrors";
import { applySeo } from "../../lib/seo";
import { AdminFormErrorAlert } from "./adminFormErrors";
import { adminSurfaceSx } from "./adminUi";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@artenova.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(emptyFormErrorState);
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
      setFormError(emptyFormErrorState);
      await api.adminLogin(email, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setFormError(createFormErrorState(err, {
        fallbackMessage: "No se pudo iniciar sesión",
        getFieldLabel: (field) => field === "email" ? "Correo" : field === "password" ? "Contraseña" : field,
      }));
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
          <AdminFormErrorAlert error={formError} onClose={() => setFormError(emptyFormErrorState)} />
          <TextField label="Correo" value={email} onChange={(event) => { setEmail(event.target.value); setFormError((current) => clearFormErrorField(current, "email")); }} error={Boolean(getFieldError(formError, "email"))} helperText={getFieldError(formError, "email")} />
          <TextField
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => { setPassword(event.target.value); setFormError((current) => clearFormErrorField(current, "password")); }}
            onKeyDown={(event) => { if (event.key === "Enter") void login(); }}
            error={Boolean(getFieldError(formError, "password"))}
            helperText={getFieldError(formError, "password")}
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
                ),
              },
            }}
          />
          <Button variant="contained" size="large" onClick={login}>Entrar</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
