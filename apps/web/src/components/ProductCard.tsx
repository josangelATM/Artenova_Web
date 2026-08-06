import { useEffect, useRef, useState } from "react";
import { Box, Card, CardContent, Chip, Rating, Stack, Typography } from "@mui/material";
import { ImageIcon, Images, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, resolvePreviewMode, resolveMediaStillUrl, type Product } from "@artenova/shared";

function playVideoElement(video: HTMLVideoElement | null) {
  if (!video) return;
  try {
    const result = video.play();
    if (result && typeof result.catch === "function") {
      void result.catch(() => undefined);
    }
  } catch {
    // Ignore autoplay failures in unsupported environments.
  }
}

function pauseVideoElement(video: HTMLVideoElement | null) {
  if (!video) return;
  try {
    video.pause();
  } catch {
    // Ignore unsupported media controls in tests.
  }
}

function useCardVideoVisibility(enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setInView(false);
      return;
    }
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { rootMargin: "140px", threshold: 0.45 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);

  return { ref, inView };
}

function ProductCardPlaceholder({ name }: { name: string }) {
  return (
    <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ height: "100%", color: "text.secondary", textAlign: "center", p: 2 }}>
      <ImageIcon size={30} />
      <Typography variant="body2" fontWeight={900}>
        {name}
      </Typography>
    </Stack>
  );
}

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const defaultVariant = product.defaultVariant ?? product.variants[0] ?? null;
  const defaultVariantMedia = (defaultVariant?.media ?? (defaultVariant as { images?: Product["media"] | undefined } | null)?.images) ?? [];
  const productMedia = (product.media ?? (product as Product & { images?: Product["media"] }).images) ?? [];
  const firstVariantMedia = ((product.variants[0]?.media ?? (product.variants[0] as { images?: Product["media"] | undefined } | undefined)?.images) ?? []);
  const previewMedia = defaultVariantMedia[0] ?? productMedia[0] ?? firstVariantMedia[0];
  const previewMode = resolvePreviewMode(previewMedia, "card");
  const image = resolveMediaStillUrl(previewMedia);
  const [imageFailed, setImageFailed] = useState(false);
  const totalImages = defaultVariantMedia.length
    ? defaultVariantMedia.length
    : productMedia.length > 0
      ? productMedia.length
      : product.variants.reduce((sum, variant) => sum + ((variant.media ?? (variant as { images?: Product["media"] | undefined }).images) ?? []).length, 0);
  const extraImages = Math.max(0, totalImages - 1);
  const shouldRenderInlineVideo = previewMode === "video" && Boolean(previewMedia?.type === "video");
  const cardVideo = useCardVideoVisibility(shouldRenderInlineVideo);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setImageFailed(false);
  }, [image, product.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!shouldRenderInlineVideo || !video) return;
    if (cardVideo.inView) {
      playVideoElement(video);
      return;
    }
    pauseVideoElement(video);
  }, [cardVideo.inView, previewMedia?.url, shouldRenderInlineVideo]);

  useEffect(() => () => pauseVideoElement(videoRef.current), []);

  const renderStaticImage = previewMode === "image" && image && !imageFailed;
  const renderVideoFallback = shouldRenderInlineVideo && (previewMode === "video" || (previewMedia?.type === "video" && imageFailed));

  return (
    <Card
      component={Link}
      to={`/producto/${product.slug}`}
      className="product-card catalog-reveal"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid rgba(64,44,37,.1)",
        bgcolor: "rgba(255,250,245,.92)",
        animationDelay: `${Math.min(index, 10) * 55}ms`,
        color: "inherit",
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      <Box
        ref={cardVideo.ref}
        sx={{ position: "relative", aspectRatio: "4 / 5", bgcolor: "rgba(255,247,239,.92)", overflow: "hidden" }}
      >
        {renderStaticImage ? (
          <Box
            className="product-card-image"
            component="img"
            src={image}
            alt={previewMedia?.alt || product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : renderVideoFallback && previewMedia ? (
          <>
            <Box
              ref={videoRef}
              className="product-card-image"
              component="video"
              src={previewMedia.url}
              poster={previewMedia.posterUrl ?? undefined}
              muted
              playsInline
              loop
              autoPlay={cardVideo.inView}
              preload="none"
              disablePictureInPicture
              controlsList="nofullscreen nodownload noplaybackrate"
              aria-label={previewMedia.alt || product.name}
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <PlayCircle
              size={34}
              style={{
                position: "absolute",
                right: 12,
                bottom: 12,
                color: "rgba(255,250,245,.92)",
                filter: "drop-shadow(0 8px 20px rgba(64,44,37,.28))",
                pointerEvents: "none",
              }}
            />
          </>
        ) : (
          <ProductCardPlaceholder name={product.name} />
        )}
        <Box className="product-card-sheen" />
        {extraImages > 0 && (
          <Chip
            icon={<Images size={14} />}
            label={`+${extraImages}`}
            size="small"
            sx={{
              position: "absolute",
              right: 10,
              bottom: 10,
              bgcolor: "rgba(255,250,245,.94)",
              fontWeight: 900,
              boxShadow: "0 10px 25px rgba(64,44,37,.16)",
            }}
          />
        )}
      </Box>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1, width: "100%", p: { xs: 2, md: 2.25 } }}>
        <Stack spacing={0.7} sx={{ flex: 1 }}>
          {(defaultVariant?.sku ?? product.sku ?? product.variants[0]?.sku) && (
            <Typography variant="caption" color="text.secondary" fontWeight={900} letterSpacing={0.4}>
              REF {defaultVariant?.sku ?? product.sku ?? product.variants[0]?.sku}
            </Typography>
          )}
          <Typography variant="h6" fontWeight={900} lineHeight={1.08} sx={{ overflowWrap: "anywhere", fontSize: { xs: 19, md: 20 } }}>
            {product.name}
          </Typography>
          {product.reviewSummary.reviewCount > 0 && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Rating value={product.reviewSummary.averageRating} precision={0.5} readOnly size="small" />
              <Typography variant="caption" color="text.secondary" fontWeight={900}>
                {product.reviewSummary.averageRating.toFixed(1)} ({product.reviewSummary.reviewCount})
              </Typography>
            </Stack>
          )}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.description}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1.5}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Precio
            </Typography>
            <Typography fontWeight={900} fontSize={18}>
              {formatCurrency((defaultVariant?.pricingSummary ?? product.pricingSummary).finalPrice, product.currencySymbol)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
