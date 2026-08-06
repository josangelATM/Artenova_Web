import { useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
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
        width: large ? "auto" : "100%",
        height: large ? "auto" : "100%",
        maxWidth: large ? "100%" : undefined,
        maxHeight: large ? "100%" : undefined,
        aspectRatio: large ? undefined : "4 / 5",
        objectFit: "contain",
        display: "block",
        p: large ? 0 : { xs: 1.5, md: 2 },
        bgcolor: large ? "transparent" : "rgba(255,255,255,.45)",
        borderRadius: large ? 0 : 0,
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
          width: large ? "auto" : "100%",
          height: large ? "auto" : "100%",
          maxWidth: large ? "100%" : undefined,
          maxHeight: large ? "100%" : undefined,
          aspectRatio: large ? undefined : "4 / 5",
          objectFit: "contain",
          display: "block",
          p: large ? 0 : { xs: 1.5, md: 2 },
          bgcolor: large ? "transparent" : "rgba(255,255,255,.45)",
          borderRadius: large ? 0 : 0,
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
  const [galleryActive, setGalleryActive] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, items.findIndex((item) => item.key === activeKey)));
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeItem = items[activeIndex];
  const activeMedia = activeItem?.media;
  const hasMany = items.length > 1;
  const previewItems = thumbnailItems && thumbnailItems.length > 0 ? thumbnailItems : items;
  const activePreviewKey = activeThumbnailKey ?? activeKey;
  const hasPreviewStrip = previewItems.length > 1;
  const navigationItems = hasMany ? items : previewItems;
  const activeNavigationKey = hasMany ? activeKey : activePreviewKey;
  const navigationIndex = Math.max(0, navigationItems.findIndex((item) => item.key === activeNavigationKey));
  const canNavigate = navigationItems.length > 1;
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

  function goTo(offset: number) {
    if (!navigationItems.length) return;
    const nextIndex = (navigationIndex + offset + navigationItems.length) % navigationItems.length;
    const nextItem = navigationItems[nextIndex];
    if (!nextItem) return;
    onActiveKeyChange(nextItem.key);
  }

  function closeViewer() {
    setViewerOpen(false);
  }

  function stopViewerPropagation(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function isDesktopGalleryKeyboardEnabled() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(min-width: 900px)").matches;
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
    if (!start || !touch || !canNavigate) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 42) return;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;

    if (deltaX < 0) goTo(1);
    if (deltaX > 0) goTo(-1);
  }

  useEffect(() => {
    const keyboardNavigationEnabled = viewerOpen || galleryActive;
    if (!keyboardNavigationEnabled) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (!isDesktopGalleryKeyboardEnabled()) return;
      if (event.key === "ArrowLeft") goTo(-1);
      if (event.key === "ArrowRight") goTo(1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryActive, viewerOpen, activeIndex, items]);

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
    width: { xs: 40, md: 46 },
    height: { xs: 40, md: 46 },
    bgcolor: "transparent",
    color: "rgba(64,44,37,.88)",
    border: 0,
    boxShadow: "none",
    backdropFilter: "none",
    zIndex: 2,
    "&:hover": {
      bgcolor: "rgba(255,250,245,.18)",
      color: "rgba(64,44,37,1)",
    },
    "&:focus-visible": {
      outline: "2px solid rgba(196,110,78,.9)",
      outlineOffset: 2,
    },
  } as const;

  return (
    <>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "flex-start" }}>
        <Box
          ref={galleryViewport.ref}
          tabIndex={0}
          aria-label={`Galería del producto ${productName}`}
          onFocus={() => setGalleryActive(true)}
          onBlur={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            setGalleryActive(false);
          }}
          onMouseEnter={() => setGalleryActive(true)}
          onMouseLeave={() => setGalleryActive(false)}
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
          {canNavigate && (
            <>
              <IconButton
                aria-label="Imagen anterior"
                onClick={() => goTo(-1)}
                sx={{ ...arrowSx, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
              >
                <ChevronLeft size={18} />
              </IconButton>
              <IconButton
                aria-label="Imagen siguiente"
                onClick={() => goTo(1)}
                sx={{ ...arrowSx, position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}
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
        onClose={closeViewer}
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
        <Box
          sx={{
            minHeight: "100vh",
            height: "100dvh",
            color: "text.primary",
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr)",
            background: "rgba(255,247,239,.34)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: { xs: 1.5, md: 2 } }}>
            <Typography fontWeight={900} noWrap sx={{ maxWidth: "78vw" }}>{productName}</Typography>
            <IconButton aria-label="Cerrar visor" onClick={closeViewer} sx={{ ...arrowSx, color: "rgba(64,44,37,.74)" }}>
              <X size={18} />
            </IconButton>
          </Stack>
          <Box
            onClick={closeViewer}
            sx={{
              position: "relative",
              minHeight: 0,
              overflowX: "hidden",
              overflowY: { xs: "auto", md: "hidden" },
              px: { xs: 0, md: 3 },
              pb: { xs: 0, md: 3 },
            }}
          >
            <Box
              sx={{
                height: "100%",
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: { xs: 0, md: 0 },
              }}
            >
              <Box
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={stopViewerPropagation}
                sx={{
                  width: "100%",
                  maxWidth: "min(100%, 980px)",
                  height: "100%",
                  maxHeight: "100%",
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 0,
                  boxShadow: "none",
                  bgcolor: "transparent",
                  touchAction: "pan-y",
                  overflow: "visible",
                  p: 0,
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
            </Box>
            {canNavigate && (
              <>
                <IconButton aria-label="Imagen anterior" onClick={(event) => { event.stopPropagation(); goTo(-1); }} sx={{ ...arrowSx, position: "absolute", left: { xs: 8, md: "max(12px, calc(50% - 490px))" }, top: "50%", transform: "translateY(-50%)" }}>
                  <ChevronLeft size={18} />
                </IconButton>
                <IconButton aria-label="Imagen siguiente" onClick={(event) => { event.stopPropagation(); goTo(1); }} sx={{ ...arrowSx, position: "absolute", right: { xs: 8, md: "max(12px, calc(50% - 490px))" }, top: "50%", transform: "translateY(-50%)" }}>
                  <ChevronRight size={18} />
                </IconButton>
                <Typography sx={{ position: "absolute", bottom: 18, px: 1.5, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,250,245,.82)", fontWeight: 900, zIndex: 2 }}>
                  {navigationIndex + 1} / {navigationItems.length}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
