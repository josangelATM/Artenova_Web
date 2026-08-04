import { useEffect, useState } from "react";
import { Box, Card, CardContent, Chip, Rating, Stack, Typography } from "@mui/material";
import { ImageIcon, Images } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, type Product } from "@artenova/shared";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const image = product.images[0];
  const [imageFailed, setImageFailed] = useState(false);
  const extraImages = Math.max(0, product.images.length - 1);

  useEffect(() => {
    setImageFailed(false);
  }, [product.id, image?.url]);

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
      <Box sx={{ position: "relative", aspectRatio: "4 / 5", bgcolor: "rgba(255,247,239,.92)", overflow: "hidden" }}>
        {image && !imageFailed ? (
          <Box
            className="product-card-image"
            component="img"
            src={image.url}
            alt={image.alt || product.name}
            onError={() => setImageFailed(true)}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ height: "100%", color: "text.secondary", textAlign: "center", p: 2 }}>
            <ImageIcon size={30} />
            <Typography variant="body2" fontWeight={900}>
              {product.name}
            </Typography>
          </Stack>
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
          {product.sku && (
            <Typography variant="caption" color="text.secondary" fontWeight={900} letterSpacing={0.4}>
              REF {product.sku}
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
              Desde
            </Typography>
            <Typography fontWeight={900} fontSize={18}>
              {formatCurrency(product.pricingSummary.finalPrice)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
