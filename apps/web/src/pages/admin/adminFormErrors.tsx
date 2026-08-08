import { useEffect, useRef } from "react";
import { Alert, AlertTitle, Box } from "@mui/material";
import type { FormErrorState } from "../../lib/formErrors";

export function AdminFormErrorAlert({
  error,
  onClose,
}: {
  error: FormErrorState;
  onClose: () => void;
}) {
  const alertRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!error.summaryMessage) return;
    const element = alertRef.current;
    if (!element) return;

    const topOffset = 96;

    const alignAlert = () => {
      const rect = element.getBoundingClientRect();
      const targetTop = window.scrollY + rect.top - topOffset;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth",
      });

      window.setTimeout(() => {
        const nextRect = element.getBoundingClientRect();
        const expectedTop = topOffset;
        const delta = nextRect.top - expectedTop;

        if (Math.abs(delta) > 8) {
          window.scrollBy({
            top: delta,
            behavior: "auto",
          });
        }
      }, 220);
    };

    const frameId = window.requestAnimationFrame(alignAlert);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [error.summaryMessage]);

  if (!error.summaryMessage) {
    return null;
  }

  const hasMultipleItems = error.summaryItems.length > 1;

  return (
    <Alert
      ref={alertRef}
      severity="error"
      onClose={onClose}
      sx={{
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        scrollMarginTop: "96px",
        "& .MuiAlert-message": {
          minWidth: 0,
          width: "100%",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        },
      }}
    >
      {hasMultipleItems ? <AlertTitle>{error.summaryMessage}</AlertTitle> : error.summaryMessage}
      {hasMultipleItems ? (
        <Box
          component="ul"
          sx={{
            mt: 0.5,
            mb: 0,
            pl: 2.5,
            minWidth: 0,
            width: "100%",
            "& li": {
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            },
          }}
        >
          {error.summaryItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </Box>
      ) : null}
    </Alert>
  );
}
