import { useEffect, useState } from "react";
import { Box, Card, CardActionArea, CardContent, Grid, Paper, Stack, Typography } from "@mui/material";
import { ArrowRight, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { FeaturedCategory } from "@artenova/shared";
import { api } from "../lib/api";

function CatalogCard({ category }: { category: FeaturedCategory }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [category.imageUrl]);

  return (
    <Card elevation={0} sx={{ height: "100%", border: "1px solid rgba(64,44,37,.12)" }}>
      <CardActionArea component={Link} to={category.href} aria-label={`Ver catálogo: ${category.name}`}
        sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <Box sx={{ aspectRatio: "4 / 3", bgcolor: "rgba(248,241,236,.94)", overflow: "hidden" }}>
          {category.imageUrl && !failed ? (
            <Box component="img" src={category.imageUrl} alt={category.name} loading="lazy" onError={() => setFailed(true)}
              sx={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
          ) : (
            <Stack role="img" aria-label={`Catálogo ${category.name} sin imagen`} alignItems="center" justifyContent="center" sx={{ height: "100%", color: "text.secondary" }}>
              <ImageIcon size={36} aria-hidden="true" />
            </Stack>
          )}
        </Box>
        <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography component="h3" variant="h6" sx={{ overflowWrap: "anywhere" }}>{category.name}</Typography>
          {category.description && (
            <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>
              {category.description}
            </Typography>
          )}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: "auto", pt: 1, color: "primary.main" }}>
            <Typography variant="body2" fontWeight={900}>Ver catálogo</Typography>
            <ArrowRight size={17} aria-hidden="true" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function FeaturedCatalogs() {
  const [categories, setCategories] = useState<FeaturedCategory[]>([]);
  useEffect(() => {
    let active = true;
    void api.featuredCategories()
      .then((items) => { if (active) setCategories(items); })
      .catch(() => { if (active) setCategories([]); });
    return () => { active = false; };
  }, []);

  if (!categories.length) return null;
  return (
    <Paper component="section" aria-labelledby="featured-catalogs-title" className="home-featured-panel" elevation={0}>
      <Stack spacing={2.5}>
        <Typography id="featured-catalogs-title" component="h2" variant="caption" color="text.secondary" fontWeight={900} letterSpacing={0.8}>
          Catálogos destacados
        </Typography>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {categories.map((category) => (
            <Grid key={category.id} size={{ xs: 12, sm: 6, md: 3 }}><CatalogCard category={category} /></Grid>
          ))}
        </Grid>
      </Stack>
    </Paper>
  );
}
