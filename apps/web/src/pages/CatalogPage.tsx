import { useEffect, useMemo, useState } from "react";
import { Box, Button, Container, Grid, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { Category, Product } from "@artenova/shared";
import { api } from "../lib/api";
import { LoadingState } from "../components/LoadingState";
import { ProductCard } from "../components/ProductCard";

export function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (category) search.set("category", category);
    if (q) search.set("q", q);
    return search;
  }, [category, q]);

  useEffect(() => {
    void api.categories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    void api.products(params).then(setProducts).finally(() => setLoading(false));
  }, [params]);

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: { xs: 38, md: 58 } }}>
            Catálogo Artenova
          </Typography>
          <Typography color="text.secondary">Elige un producto, agrega tus datos y envia el pedido para confirmacion.</Typography>
        </Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField label="Buscar" value={q} onChange={(event) => setQ(event.target.value)} sx={{ minWidth: 280 }} />
          <ToggleButtonGroup exclusive value={category} onChange={(_event, value) => setCategory(value ?? "")} sx={{ flexWrap: "wrap" }}>
            <ToggleButton value="">Todo</ToggleButton>
            {categories.map((item) => (
              <ToggleButton key={item.id} value={item.slug}>
                {item.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {(q || category) && <Button onClick={() => { setQ(""); setCategory(""); }}>Limpiar</Button>}
        </Stack>
        {loading ? (
          <LoadingState label="Cargando productos" />
        ) : (
          <Grid container spacing={3}>
            {products.map((product) => (
              <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}

