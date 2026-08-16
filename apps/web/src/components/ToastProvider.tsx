import { Alert, Snackbar, type AlertColor } from "@mui/material";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type ToastSeverity = AlertColor;

export type ToastPayload = {
  message: string;
  severity?: ToastSeverity;
};

type ToastContextValue = {
  showToast: (toast: ToastPayload) => void;
};

type FlashToastState = {
  toast?: ToastPayload;
  [key: string]: unknown;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function isFlashToastState(value: unknown): value is FlashToastState {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toastNavigationState(toast: ToastPayload, state?: Record<string, unknown>) {
  return { ...(state ?? {}), toast };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentToast, setCurrentToast] = useState<(ToastPayload & { open: boolean }) | null>(null);
  const lastConsumedStateRef = useRef<unknown>(null);

  const showToast = useCallback((toast: ToastPayload) => {
    setCurrentToast({
      message: toast.message,
      severity: toast.severity ?? "success",
      open: true,
    });
  }, []);

  useEffect(() => {
    if (!isFlashToastState(location.state) || !location.state.toast) return;
    if (lastConsumedStateRef.current === location.state) return;
    lastConsumedStateRef.current = location.state;
    const { toast, ...restState } = location.state;
    showToast(toast);
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: Object.keys(restState).length > 0 ? restState : null,
    });
  }, [location.hash, location.pathname, location.search, location.state, navigate, showToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(currentToast?.open)}
        autoHideDuration={2800}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={(_event, reason) => {
          if (reason === "clickaway") return;
          setCurrentToast((toast) => (toast ? { ...toast, open: false } : toast));
        }}
      >
        <Alert
          severity={currentToast?.severity ?? "success"}
          variant="filled"
          sx={{ width: "100%" }}
          onClose={() => setCurrentToast((toast) => (toast ? { ...toast, open: false } : toast))}
        >
          {currentToast?.message ?? ""}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}
