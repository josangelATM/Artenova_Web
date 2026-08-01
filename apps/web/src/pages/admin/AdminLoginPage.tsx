import { useState } from "react";
import { Alert, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@artenova.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function login() {
    try {
      setError("");
      await api.adminLogin(email, password);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion");
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper className="soft-panel" sx={{ p: 4 }}>
        <Stack spacing={2}>
          <Typography variant="h3">Entrar al panel</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button variant="contained" size="large" onClick={login}>Entrar</Button>
        </Stack>
      </Paper>
    </Container>
  );
}

