import { useEffect, useState } from "react";
import { Box, Dialog, IconButton, Stack, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight, ImageIcon, Maximize2, X } from "lucide-react";
import type { Product, ProductImage } from "@artenova/shared";

function imageLabel(image: ProductImage, productName: string, index: number) {
  return image.alt?.trim() || `${productName} ${index + 1}`;
}

export function ProductGallery({ product }: { product: Product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const images = product.images;
  const activeImage = images[activeIndex];
  const hasMany = images.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id]);

  function goTo(offset: number) {
    if (!images.length) return;
    setActiveIndex((current) => (current + offset + images.length) % images.length);
  }

  useEffect(() => {
    if (!viewerOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") goTo(-1);
      if (event.key === "ArrowRight") goTo(1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerOpen, images.length]);

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
          <Typography fontWeight={900}>{product.name}</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={1.5}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 3,
            boxShadow: "0 24px 70px rgba(64,44,37,.18)",
            background: "#fffaf5",
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={() => setViewerOpen(true)}
            aria-label="Ampliar imagen"
            sx={{
              display: "block",
              width: "100%",
              p: 0,
              border: 0,
              cursor: "zoom-in",
              background: "transparent",
            }}
          >
            <Box
              component="img"
              src={activeImage.url}
              alt={imageLabel(activeImage, product.name, activeIndex)}
              sx={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover" }}
            />
          </Box>
          <IconButton
            aria-label="Ampliar imagen"
            onClick={() => setViewerOpen(true)}
            sx={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 44,
              height: 44,
              bgcolor: "rgba(255,250,245,.92)",
              "&:hover": { bgcolor: "background.paper" },
            }}
          >
            <Maximize2 size={18} />
          </IconButton>
          {hasMany && (
            <>
              <IconButton
                aria-label="Imagen anterior"
                onClick={() => goTo(-1)}
                sx={{ position: "absolute", left: 12, top: "50%", width: 44, height: 44, bgcolor: "rgba(255,250,245,.92)" }}
              >
                <ChevronLeft size={22} />
              </IconButton>
              <IconButton
                aria-label="Imagen siguiente"
                onClick={() => goTo(1)}
                sx={{ position: "absolute", right: 12, top: "50%", width: 44, height: 44, bgcolor: "rgba(255,250,245,.92)" }}
              >
                <ChevronRight size={22} />
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
                  bgcolor: "rgba(64,44,37,.72)",
                  color: "common.white",
                  fontWeight: 900,
                }}
              >
                {activeIndex + 1} / {images.length}
              </Typography>
            </>
          )}
        </Box>

        {hasMany && (
          <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }}>
            {images.map((image, index) => (
              <Box
                key={`${image.url}-${index}`}
                component="button"
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver imagen ${index + 1}`}
                sx={{
                  flex: { xs: "0 0 64px", sm: "0 0 76px" },
                  width: { xs: 64, sm: 76 },
                  height: { xs: 64, sm: 76 },
                  p: 0.35,
                  borderRadius: 2,
                  border: index === activeIndex ? "2px solid #8f55bd" : "1px solid rgba(64,44,37,.16)",
                  background: "#fffaf5",
                  cursor: "pointer",
                }}
              >
                <Box
                  component="img"
                  src={image.url}
                  alt={imageLabel(image, product.name, index)}
                  sx={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 1.5 }}
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
            <Typography fontWeight={900} noWrap sx={{ maxWidth: "78vw" }}>{product.name}</Typography>
            <IconButton aria-label="Cerrar imagen" onClick={() => setViewerOpen(false)} sx={{ color: "text.primary", bgcolor: "rgba(255,250,245,.78)", "&:hover": { bgcolor: "background.paper" } }}>
              <X />
            </IconButton>
          </Stack>
          <Box sx={{ position: "relative", display: "grid", placeItems: "center", p: { xs: 1, md: 3 } }}>
            <Box
              component="img"
              src={activeImage.url}
              alt={imageLabel(activeImage, product.name, activeIndex)}
              sx={{ maxWidth: "100%", maxHeight: "calc(100vh - 96px)", objectFit: "contain", borderRadius: { xs: 2, md: 3 }, boxShadow: "0 28px 90px rgba(64,44,37,.26)" }}
            />
            {hasMany && (
              <>
                <IconButton aria-label="Imagen anterior" onClick={() => goTo(-1)} sx={{ position: "absolute", left: { xs: 8, md: 24 }, width: 48, height: 48, color: "text.primary", bgcolor: "rgba(255,250,245,.78)", "&:hover": { bgcolor: "background.paper" } }}>
                  <ChevronLeft />
                </IconButton>
                <IconButton aria-label="Imagen siguiente" onClick={() => goTo(1)} sx={{ position: "absolute", right: { xs: 8, md: 24 }, width: 48, height: 48, color: "text.primary", bgcolor: "rgba(255,250,245,.78)", "&:hover": { bgcolor: "background.paper" } }}>
                  <ChevronRight />
                </IconButton>
                <Typography sx={{ position: "absolute", bottom: 18, px: 1.5, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,250,245,.82)", fontWeight: 900 }}>
                  {activeIndex + 1} / {images.length}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
