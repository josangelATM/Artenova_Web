import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Box, Dialog, IconButton, Stack, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight, ImageIcon, PlayCircle, X } from "lucide-react";
import { resolveMediaStillUrl, resolvePreviewMode, type ProductMedia } from "@artenova/shared";

export type ProductGalleryItem = {
  key: string;
  media: ProductMedia;
};

function mediaLabel(media: ProductMedia, productName: string, index: number) {
  return media.alt?.trim() || `${productName} ${index + 1}`;
}

function pauseVideoElement(video: HTMLVideoElement | null) {
  if (!video) return;
  try {
    video.pause();
  } catch {
    // Ignore unsupported media controls in tests.
  }
}

function playVideoElement(video: HTMLVideoElement | null) {
  if (!video) return;
  try {
    const result = video.play();
    if (result && typeof result.catch === "function") {
      void result.catch(() => undefined);
    }
  } catch {
    // Ignore browser autoplay rejections or unsupported media in tests.
  }
}

function useElementInView<T extends Element>(enabled = true, rootMargin = "120px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setInView(true);
      return;
    }
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry?.isIntersecting ?? false);
      },
      { rootMargin, threshold: 0.35 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return { ref, inView };
}

function InlineVideo({
  media,
  label,
  shouldPlay,
  controls = false,
  loop = false,
  preload = "metadata",
  large = false,
}: {
  media: ProductMedia;
  label: string;
  shouldPlay: boolean;
  controls?: boolean;
  loop?: boolean;
  preload?: "none" | "metadata" | "auto";
  large?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) {
      playVideoElement(video);
      return;
    }
    pauseVideoElement(video);
  }, [shouldPlay, media.url]);

  useEffect(() => () => pauseVideoElement(videoRef.current), []);

  return (
    <Box
      component="video"
      ref={videoRef}
      src={media.url}
      poster={media.posterUrl ?? undefined}
      controls={controls}
      muted
      playsInline
      loop={loop}
      autoPlay={shouldPlay}
      preload={preload}
      disablePictureInPicture={!controls}
      controlsList={controls ? "nodownload noplaybackrate" : "nofullscreen nodownload noplaybackrate"}
      aria-label={label}
      sx={{
        width: "100%",
        height: "100%",
        aspectRatio: "4 / 5",
        objectFit: "contain",
        display: "block",
        p: large ? { xs: 1, md: 1.5 } : { xs: 1.5, md: 2 },
        bgcolor: "rgba(255,255,255,.45)",
        borderRadius: large ? { xs: 2, md: 3 } : 0,
      }}
    />
  );
}

function MediaPlaceholder({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <Stack
      spacing={1}
      alignItems="center"
      justifyContent="center"
      sx={{
        width: "100%",
        height: "100%",
        minHeight: compact ? 0 : { xs: 320, md: 560 },
        color: "text.secondary",
        textAlign: "center",
        p: compact ? 1 : 3,
        bgcolor: "rgba(255,255,255,.45)",
      }}
    >
      <ImageIcon size={compact ? 18 : 34} />
      {!compact && (
        <Typography fontWeight={900} sx={{ maxWidth: "16ch" }}>
          {label}
        </Typography>
      )}
    </Stack>
  );
}

function GalleryMediaFrame({
  media,
  label,
  shouldPlay,
  controls = false,
  preload = "metadata",
  large = false,
}: {
  media: ProductMedia;
  label: string;
  shouldPlay: boolean;
  controls?: boolean;
  preload?: "none" | "metadata" | "auto";
  large?: boolean;
}) {
  const previewMode = resolvePreviewMode(media, controls ? "viewer" : "hero");

  if (previewMode === "video") {
    return (
      <InlineVideo
        media={media}
        label={label}
        shouldPlay={shouldPlay}
        controls={controls}
        loop={!controls}
        preload={preload}
        large={large}
      />
    );
  }

  if (previewMode === "image") {
    return (
      <Box
        component="img"
        src={resolveMediaStillUrl(media) ?? media.url}
        alt={label}
        loading={large ? "eager" : "lazy"}
        sx={{
          width: "100%",
          height: "100%",
          aspectRatio: "4 / 5",
          objectFit: "contain",
          display: "block",
          p: large ? { xs: 1, md: 1.5 } : { xs: 1.5, md: 2 },
          bgcolor: "rgba(255,255,255,.45)",
          borderRadius: large ? { xs: 2, md: 3 } : 0,
        }}
      />
    );
  }

  return <MediaPlaceholder label={label} />;
}

function ThumbnailPreview({
  media,
  label,
  isActive,
}: {
  media: ProductMedia;
  label: string;
  isActive: boolean;
}) {
  const stillUrl = resolveMediaStillUrl(media);

  if (stillUrl) {
    return (
      <Box
        component="img"
        src={stillUrl}
        alt={label}
        loading="lazy"
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          borderRadius: 1.5,
          bgcolor: "rgba(255,255,255,.65)",
        }}
      />
    );
  }

  if (media.type === "video" && isActive) {
    return (
      <Box sx={{ width: "100%", height: "100%" }}>
        <InlineVideo
          media={media}
          label={label}
          shouldPlay
          preload="none"
          loop
        />
      </Box>
    );
  }

  return <MediaPlaceholder label={label} compact />;
}

export function ProductGallery({
  productName,
  items,
  thumbnailItems,
  activeKey,
  activeThumbnailKey,
  onActiveKeyChange
}: {
  productName: string;
  items: ProductGalleryItem[];
  thumbnailItems?: ProductGalleryItem[];
  activeKey: string;
  activeThumbnailKey?: string;
  onActiveKeyChange: (key: string) => void;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAutoplay, setViewerAutoplay] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, items.findIndex((item) => item.key === activeKey)));
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeItem = items[activeIndex];
  const activeMedia = activeItem?.media;
  const hasMany = items.length > 1;
  const previewItems = thumbnailItems && thumbnailItems.length > 0 ? thumbnailItems : items;
  const activePreviewKey = activeThumbnailKey ?? activeKey;
  const hasPreviewStrip = previewItems.length > 1;
  const galleryViewport = useElementInView<HTMLDivElement>(Boolean(activeMedia && activeMedia.type === "video"));
  const viewerVideoShouldAutoplay = viewerOpen && viewerAutoplay && activeMedia?.type === "video";
  const mainVideoShouldAutoplay = Boolean(activeMedia && activeMedia.type === "video" && galleryViewport.inView && !viewerOpen);

  useEffect(() => {
    const index = items.findIndex((item) => item.key === activeKey);
    setActiveIndex(index >= 0 ? index : 0);
  }, [activeKey, items]);

  useEffect(() => {
    if (!viewerOpen) {
      setViewerAutoplay(false);
    }
  }, [viewerOpen]);

  const activeMediaLabel = useMemo(
    () => (activeMedia ? mediaLabel(activeMedia, productName, activeIndex) : productName),
    [activeIndex, activeMedia, productName]
  );

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

  if (!activeMedia) {
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
          ref={galleryViewport.ref}
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
            onClick={() => {
              setViewerAutoplay(mainVideoShouldAutoplay);
              setViewerOpen(true);
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            aria-label={activeMedia.type === "video" ? "Ampliar video" : "Ampliar imagen"}
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
            <GalleryMediaFrame
              media={activeMedia}
              label={activeMediaLabel}
              shouldPlay={mainVideoShouldAutoplay}
              controls={activeMedia.type === "video"}
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

        {hasPreviewStrip && (
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
            {previewItems.map((item, index) => (
              <Box
                key={item.key}
                component="button"
                type="button"
                onClick={() => onActiveKeyChange(item.key)}
                aria-label={`Ver elemento ${index + 1}`}
                sx={{
                  flex: { xs: "0 0 72px", sm: "0 0 84px", md: "0 0 84px" },
                  width: { xs: 72, sm: 84, md: 84 },
                  height: { xs: 72, sm: 84, md: 84 },
                  p: 0.5,
                  borderRadius: 2,
                  border: item.key === activePreviewKey ? "2px solid rgba(196,110,78,1)" : "1px solid rgba(64,44,37,.16)",
                  background: "rgba(255,250,245,.9)",
                  cursor: "pointer",
                }}
              >
                <Box sx={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", borderRadius: 1.5 }}>
                  <ThumbnailPreview
                    media={item.media}
                    label={mediaLabel(item.media, productName, index)}
                    isActive={item.key === activePreviewKey}
                  />
                  {item.media.type === "video" && (
                    <PlayCircle
                      size={18}
                      style={{ position: "absolute", right: 6, bottom: 6, color: "rgba(64,44,37,.82)" }}
                    />
                  )}
                </Box>
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
            <IconButton aria-label="Cerrar visor" onClick={() => setViewerOpen(false)} sx={{ ...arrowSx, color: "rgba(64,44,37,.74)" }}>
              <X size={18} />
            </IconButton>
          </Stack>
          <Box sx={{ position: "relative", display: "grid", placeItems: "center", p: { xs: 1, md: 3 } }}>
            <Box
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              sx={{
                width: "100%",
                maxWidth: "min(100%, 980px)",
                maxHeight: "calc(100vh - 96px)",
                borderRadius: { xs: 2, md: 3 },
                boxShadow: "0 28px 90px rgba(64,44,37,.26)",
                bgcolor: "rgba(255,255,255,.55)",
                touchAction: "pan-y",
                overflow: "hidden",
              }}
            >
              <GalleryMediaFrame
                media={activeMedia}
                label={activeMediaLabel}
                shouldPlay={viewerVideoShouldAutoplay}
                controls={activeMedia.type === "video"}
                preload="metadata"
                large
              />
            </Box>
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
