import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Box, Dialog, IconButton, Stack, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import type { ProductImage } from "@artenova/shared";

export type ProductGalleryItem = {
  key: string;
  image: ProductImage;
};

function imageLabel(image: ProductImage, productName: string, index: number) {
  return image.alt?.trim() || `${productName} ${index + 1}`;
}

export function ProductGallery({
  productName,
  items,
  activeKey,
  onActiveKeyChange
}: {
  productName: string;
  items: ProductGalleryItem[];
  activeKey: string;
  onActiveKeyChange: (key: string) => void;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, items.findIndex((item) => item.key === activeKey)));
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeItem = items[activeIndex];
  const activeImage = activeItem?.image;
  const hasMany = items.length > 1;

  useEffect(() => {
    const index = items.findIndex((item) => item.key === activeKey);
    setActiveIndex(index >= 0 ? index : 0);
  }, [activeKey, items]);

  function updateActiveIndex(nextIndex: number) {
    const nextItem = items[nextIndex];
    if (!nextItem) return;
    setActiveIndex(nextIndex);
    onActiveKeyChange(nextItem.key);
  }

  function goTo(offset: number) {
    if (!items.length) return;
    const nextIndex = (activeIndex + offset + items.length) % items.length;
    updateActiveIndex(nextIndex);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch || !hasMany) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 42) return;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;

    if (deltaX < 0) goTo(1);
    if (deltaX > 0) goTo(-1);
  }

  useEffect(() => {
    if (!viewerOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") goTo(-1);
      if (event.key === "ArrowRight") goTo(1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerOpen, activeIndex, items]);

  if (!activeImage) {
    return (
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          minHeight: { xs: 320, md: 560 },
          borderRadius: 3,
          border: "1px dashed rgba(64,44,37,.22)",
          background: "rgba(255,250,245,.72)",
          color: "text.secondary",
          textAlign: "center",
          p: 4,
        }}
      >
        <Stack spacing={1.5} alignItems="center">
          <ImageIcon size={34} />
          <Typography fontWeight={900}>{productName}</Typography>
        </Stack>
      </Box>
    );
  }

  const arrowSx = {
    width: { xs: 38, md: 40 },
    height: { xs: 38, md: 40 },
    bgcolor: "transparent",
    color: "rgba(64,44,37,.52)",
    boxShadow: "none",
    "&:hover": { bgcolor: "transparent", color: "rgba(64,44,37,.72)" }
  } as const;

  return (
    <>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "flex-start" }}>
        <Box
          sx={{
            order: { xs: 1, md: 2 },
            position: "relative",
            overflow: "hidden",
            borderRadius: 3,
            boxShadow: "0 24px 70px rgba(64,44,37,.18)",
            background: "linear-gradient(180deg, rgba(255,250,245,.98) 0%, rgba(250,239,231,.9) 100%)",
            border: "1px solid rgba(64,44,37,.10)",
            flex: 1,
            minWidth: 0,
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={() => setViewerOpen(true)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            aria-label="Ampliar imagen"
            sx={{
              display: "block",
              width: "100%",
              p: 0,
              border: 0,
              cursor: "zoom-in",
              background: "transparent",
              minHeight: 0,
              touchAction: "pan-y",
            }}
          >
            <Box
              component="img"
              src={activeImage.url}
              alt={imageLabel(activeImage, productName, activeIndex)}
              sx={{
                width: "100%",
                aspectRatio: "4 / 5",
                objectFit: "contain",
                display: "block",
                p: { xs: 1.5, md: 2 },
                bgcolor: "rgba(255,255,255,.45)",
              }}
            />
          </Box>
          {hasMany && (
            <>
              <IconButton
                aria-label="Imagen anterior"
                onClick={() => goTo(-1)}
                sx={{ ...arrowSx, position: "absolute", left: 12, top: "50%" }}
              >
                <ChevronLeft size={18} />
              </IconButton>
              <IconButton
                aria-label="Imagen siguiente"
                onClick={() => goTo(1)}
                sx={{ ...arrowSx, position: "absolute", right: 12, top: "50%" }}
              >
                <ChevronRight size={18} />
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  left: 14,
                  bottom: 14,
                  px: 1.25,
                  py: 0.4,
                  borderRadius: 999,
                  bgcolor: "rgba(64,44,37,.62)",
                  color: "common.white",
                  fontWeight: 900,
                }}
              >
                {activeIndex + 1} / {items.length}
              </Typography>
            </>
          )}
        </Box>

        {hasMany && (
          <Stack
            direction={{ xs: "row", md: "column" }}
            spacing={1}
            sx={{
              order: { xs: 2, md: 1 },
              overflowX: { xs: "auto", md: "visible" },
              overflowY: { xs: "visible", md: "auto" },
              pb: { xs: 0.5, md: 0 },
              pr: { md: 0.5 },
              maxHeight: { md: "min(560px, 72vh)" },
              flex: { md: "0 0 92px" }
            }}
          >
            {items.map((item, index) => (
              <Box
                key={item.key}
                component="button"
                type="button"
                onClick={() => updateActiveIndex(index)}
                aria-label={`Ver imagen ${index + 1}`}
                sx={{
                  flex: { xs: "0 0 72px", sm: "0 0 84px", md: "0 0 84px" },
                  width: { xs: 72, sm: 84, md: 84 },
                  height: { xs: 72, sm: 84, md: 84 },
                  p: 0.5,
                  borderRadius: 2,
                  border: index === activeIndex ? "2px solid rgba(196,110,78,1)" : "1px solid rgba(64,44,37,.16)",
                  background: "rgba(255,250,245,.9)",
                  cursor: "pointer",
                }}
              >
                <Box
                  component="img"
                  src={item.image.url}
                  alt={imageLabel(item.image, productName, index)}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: 1.5,
                    bgcolor: "rgba(255,255,255,.65)",
                  }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </Stack>

      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth={false}
        fullScreen
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: "rgba(64,44,37,.24)",
              backdropFilter: "blur(18px)",
            },
          },
          paper: {
            sx: {
              bgcolor: "transparent",
              boxShadow: "none",
            },
          },
        }}
      >
        <Box sx={{ minHeight: "100vh", color: "text.primary", display: "grid", gridTemplateRows: "auto 1fr", background: "rgba(255,247,239,.34)", backdropFilter: "blur(10px)" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: { xs: 1.5, md: 2 } }}>
            <Typography fontWeight={900} noWrap sx={{ maxWidth: "78vw" }}>{productName}</Typography>
            <IconButton aria-label="Cerrar imagen" onClick={() => setViewerOpen(false)} sx={{ ...arrowSx, color: "rgba(64,44,37,.74)" }}>
              <X size={18} />
            </IconButton>
          </Stack>
          <Box sx={{ position: "relative", display: "grid", placeItems: "center", p: { xs: 1, md: 3 } }}>
            <Box
              component="img"
              src={activeImage.url}
              alt={imageLabel(activeImage, productName, activeIndex)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              sx={{
                maxWidth: "100%",
                maxHeight: "calc(100vh - 96px)",
                objectFit: "contain",
                borderRadius: { xs: 2, md: 3 },
                boxShadow: "0 28px 90px rgba(64,44,37,.26)",
                bgcolor: "rgba(255,255,255,.55)",
                p: { xs: 1, md: 1.5 },
                touchAction: "pan-y",
              }}
            />
            {hasMany && (
              <>
                <IconButton aria-label="Imagen anterior" onClick={() => goTo(-1)} sx={{ ...arrowSx, position: "absolute", left: { xs: 8, md: 24 } }}>
                  <ChevronLeft size={18} />
                </IconButton>
                <IconButton aria-label="Imagen siguiente" onClick={() => goTo(1)} sx={{ ...arrowSx, position: "absolute", right: { xs: 8, md: 24 } }}>
                  <ChevronRight size={18} />
                </IconButton>
                <Typography sx={{ position: "absolute", bottom: 18, px: 1.5, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,250,245,.82)", fontWeight: 900 }}>
                  {activeIndex + 1} / {items.length}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
