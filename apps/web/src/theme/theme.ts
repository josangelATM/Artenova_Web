import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#8f55bd",
      light: "#c69be0",
      dark: "#62357f",
      contrastText: "#fff8f3"
    },
    secondary: {
      main: "#ef798a",
      light: "#ffc4bd",
      dark: "#b84e62",
      contrastText: "#4d2f24"
    },
    warning: {
      main: "#d9a441"
    },
    background: {
      default: "#fff7ef",
      paper: "#fffaf5"
    },
    text: {
      primary: "#402c25",
      secondary: "#765c55"
    }
  },
  shape: {
    borderRadius: 8
  },
  typography: {
    fontFamily: '"Nunito", "Trebuchet MS", sans-serif',
    h1: {
      fontFamily: '"Georgia", serif',
      fontWeight: 800,
      letterSpacing: 0
    },
    h2: {
      fontFamily: '"Georgia", serif',
      fontWeight: 800,
      letterSpacing: 0
    },
    h3: {
      fontFamily: '"Georgia", serif',
      fontWeight: 700,
      letterSpacing: 0
    },
    button: {
      textTransform: "none",
      fontWeight: 800
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0 18px 55px rgba(91, 60, 37, 0.12)"
        }
      }
    }
  }
});

