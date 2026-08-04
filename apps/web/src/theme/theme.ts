import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#9146C7",
      light: "#F1E4F8",
      dark: "#6E2FA0",
      contrastText: "#FFFDFC"
    },
    secondary: {
      main: "#D8C3CF",
      light: "#F3E9EE",
      dark: "#A88999",
      contrastText: "#3B2118"
    },
    warning: {
      main: "#d9a441"
    },
    background: {
      default: "#F8F1EC",
      paper: "#FFFDFC"
    },
    text: {
      primary: "#3B2118",
      secondary: "#74584E"
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
        },
        containedPrimary: {
          boxShadow: "0 12px 28px rgba(145, 70, 199, 0.22)",
          "&:hover": {
            boxShadow: "0 16px 32px rgba(145, 70, 199, 0.28)"
          }
        },
        outlinedPrimary: {
          backgroundColor: "#FFFDFC",
          borderColor: "#9146C7",
          color: "#9146C7",
          "&:hover": {
            backgroundColor: "#F1E4F8",
            borderColor: "#9146C7"
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0 18px 55px rgba(59, 33, 24, 0.12)"
        }
      }
    }
  }
});

