import { Box, Button, Card, CardContent, CardMedia, Chip, Stack, Typography } from "@mui/material";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, type Product } from "@artenova/shared";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0]?.url ?? "/seed/mascotas/mascotas-1.jpg";

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <CardMedia component="img" image={image} alt={product.name} sx={{ aspectRatio: "4/5", objectFit: "cover" }} />
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.4, flex: 1 }}>
        <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
          <Typography variant="h6" fontWeight={900} lineHeight={1.1}>
            {product.name}
          </Typography>
          {product.isFeatured && <Chip icon={<Sparkles size={14} />} label="Destacado" color="secondary" size="small" />}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {product.description}
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="text.secondary">
              Desde
            </Typography>
            <Typography fontWeight={900}>{formatCurrency(product.basePrice)}</Typography>
          </Box>
          <Button component={Link} to={`/producto/${product.slug}`} endIcon={<ArrowRight size={18} />} variant="outlined">
            Ver
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

