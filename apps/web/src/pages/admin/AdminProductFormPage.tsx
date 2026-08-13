import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ImagePlus,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import type {
  Category,
  CustomField,
  DiscountType,
  ProductMedia,
  ProductOption,
  ProductOptionValue,
} from "@artenova/shared";
import { useNavigate, useParams } from "react-router-dom";
import { type ApiValidationIssue, api } from "../../lib/api";
import {
  clearFormErrorField,
  createFormErrorState,
  emptyFormErrorState,
  getFieldError,
  type FormErrorState,
} from "../../lib/formErrors";
import { AdminEmptyState, AdminPageHeader, AdminSection } from "./adminUi";
import { AdminBackButton, AdminBreadcrumbs } from "./adminCrudUi";
import { AdminFormErrorAlert } from "./adminFormErrors";

type ProductImageInput = Omit<ProductMedia, "id">;
type PriceTierInput = {
  minQuantity: string;
  unitPrice: string;
  totalPrice?: string;
  label?: string | null;
};

type DraftProduct = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  basePrice: string;
  discountType: DiscountType | "";
  discountValue: string;
  isPublished: boolean;
  isFeatured: boolean;
};

type DescriptionLinkDraft = {
  label: string;
  url: string;
};

type ProductOptionValueInput = ProductOptionValue;
type ProductOptionInput = Omit<ProductOption, "productId"> & {
  values: ProductOptionValueInput[];
};
type CustomFieldInput = Required<Pick<CustomField, "id" | "label">> & {
  position: number;
};

type VariantInput = {
  id: string;
  name: string;
  sku: string;
  visualGroupKey: string;
  basePrice: string;
  discountType: DiscountType | "";
  discountValue: string;
  isActive: boolean;
  position: number;
  optionValueIds: string[];
  images: ProductImageInput[];
  priceTiers: PriceTierInput[];
};
export type { VariantInput };

type OptionValueLookup = Map<
  string,
  { optionId: string; optionName: string; value: string; position: number }
>;

const emptyProduct: DraftProduct = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  categoryId: "",
  basePrice: "",
  discountType: "",
  discountValue: "",
  isPublished: true,
  isFeatured: false,
};

function resolveProductField(issue: ApiValidationIssue) {
  return issue.key || null;
}

function getProductFieldLabel(field: string) {
  const labels: Record<string, string> = {
    name: "Nombre",
    slug: "Enlace corto",
    sku: "Referencia",
    description: "Descripcion",
    categoryId: "Categoria",
    basePrice: "Precio",
    discountType: "Descuento",
    discountValue: "Monto o porcentaje",
  };
  return labels[field] ?? field;
}

function createId() {
  return crypto.randomUUID();
}

function createOption(position: number): ProductOptionInput {
  return {
    id: createId(),
    name: "",
    drivesVisualGroup: false,
    position,
    values: [],
  };
}

function createOptionValue(
  optionId: string,
  position: number,
): ProductOptionValueInput {
  return { id: createId(), optionId, value: "", position, swatch: null };
}

function createVariant(
  position: number,
  optionValueIds: string[],
): VariantInput {
  return {
    id: createId(),
    name: "",
    sku: "",
    visualGroupKey: "",
    basePrice: "",
    discountType: "",
    discountValue: "",
    isActive: true,
    position,
    optionValueIds,
    images: [],
    priceTiers: [],
  };
}

function createCustomField(position: number): CustomFieldInput {
  return {
    id: createId(),
    label: "",
    position,
  };
}

function normalizeImages(items: ProductImageInput[]) {
  return items.map((image, position) => ({ ...image, position }));
}

function isMediaFile(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

async function createPosterFromVideo(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () =>
        reject(new Error("No se pudo preparar la portada del video"));
    });

    if (video.duration && Number.isFinite(video.duration)) {
      const targetTime = Math.min(
        Math.max(video.duration * 0.08, 0.2),
        Math.max(video.duration - 0.1, 0),
      );
      if (targetTime > 0) {
        await new Promise<void>((resolve, reject) => {
          video.onseeked = () => resolve();
          video.onerror = () =>
            reject(new Error("No se pudo preparar la portada del video"));
          video.currentTime = targetTime;
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () =>
            reject(new Error("No se pudo preparar la portada del video"));
        });
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la portada del video");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("No se pudo generar la portada del video"));
        },
        "image/webp",
        0.88,
      );
    });

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-poster.webp`, {
      type: "image/webp",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function normalizePriceTiers(items: PriceTierInput[]) {
  return items.map((tier) => ({
    minQuantity: Number(tier.minQuantity) || 1,
    unitPrice: Number(tier.unitPrice) || 0,
    totalPrice: !tier.totalPrice ? null : Number(tier.totalPrice),
    label: tier.label?.trim() || null,
  }));
}

function normalizeSelectionKey(optionValueIds: string[]) {
  return [...optionValueIds].sort().join("|");
}

function normalizeVisualGroupSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function deriveVisualGroupKey(
  optionValueIds: string[],
  optionValueById: OptionValueLookup,
  visualOptionIds: Set<string>,
) {
  const segments = optionValueIds
    .map((valueId) => optionValueById.get(valueId))
    .filter(
      (
        value,
      ): value is {
        optionId: string;
        optionName: string;
        value: string;
        position: number;
      } => Boolean(value && visualOptionIds.has(value.optionId)),
    )
    .sort(
      (a, b) => a.position - b.position || a.optionId.localeCompare(b.optionId),
    )
    .map((value) => normalizeVisualGroupSegment(value.value))
    .filter(Boolean);

  return segments.length > 0 ? segments.join("--") : "";
}

function describeVisualGroup(
  optionValueIds: string[],
  optionValueById: OptionValueLookup,
  visualOptionIds: Set<string>,
) {
  const labels = optionValueIds
    .map((valueId) => optionValueById.get(valueId))
    .filter(
      (
        value,
      ): value is {
        optionId: string;
        optionName: string;
        value: string;
        position: number;
      } => Boolean(value && visualOptionIds.has(value.optionId)),
    )
    .sort(
      (a, b) => a.position - b.position || a.optionId.localeCompare(b.optionId),
    )
    .map((value) => `${value.optionName}: ${value.value}`);

  return labels.length > 0 ? labels.join(" / ") : "Sin opciones visuales";
}

function cartesianProduct<T>(input: T[][]): T[][] {
  if (input.length === 0) return [];
  return input.reduce<T[][]>(
    (acc, values) =>
      acc.flatMap((prefix) => values.map((value) => [...prefix, value])),
    [[]],
  );
}

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return items;
  next.splice(toIndex, 0, item);
  return next;
}

function setAtIndex<T>(items: T[], index: number, value: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function updateArrayItem<T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T>,
) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function resequenceItems<T extends { position: number }>(items: T[]) {
  return items.map((item, position) => ({ ...item, position }));
}

function computeVariantLabel(
  optionValueIds: string[],
  optionValueById: OptionValueLookup,
) {
  return optionValueIds
    .map((valueId) => optionValueById.get(valueId)?.value)
    .filter(Boolean)
    .join(" / ");
}

type BaseProductSectionProps = {
  loading: boolean;
  draft: DraftProduct;
  categories: Category[];
  formError: FormErrorState;
  descriptionLinkDraft: DescriptionLinkDraft;
  hasVariantOptions: boolean;
  onDraftFieldChange: <K extends keyof DraftProduct>(
    field: K,
    value: DraftProduct[K],
  ) => void;
  onDescriptionLinkDraftChange: (patch: Partial<DescriptionLinkDraft>) => void;
  onInsertDescriptionLink: () => void;
};

const BaseProductSection = memo(function BaseProductSection({
  loading,
  draft,
  categories,
  formError,
  descriptionLinkDraft,
  hasVariantOptions,
  onDraftFieldChange,
  onDescriptionLinkDraftChange,
  onInsertDescriptionLink,
}: BaseProductSectionProps) {
  return (
    <AdminSection
      title="Datos base"
      description="Informacion general y comercial inicial del producto."
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            disabled={loading}
            fullWidth
            label="Nombre"
            value={draft.name}
            onChange={(event) => onDraftFieldChange("name", event.target.value)}
            error={Boolean(getFieldError(formError, "name"))}
            helperText={getFieldError(formError, "name")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            disabled={loading}
            fullWidth
            label="Enlace corto"
            value={draft.slug}
            onChange={(event) => onDraftFieldChange("slug", event.target.value)}
            error={Boolean(getFieldError(formError, "slug"))}
            helperText={
              getFieldError(formError, "slug") || "Ejemplo: retrato-mascota"
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            disabled={loading}
            fullWidth
            label={hasVariantOptions ? "Referencia sugerida" : "Referencia"}
            value={draft.sku}
            onChange={(event) => onDraftFieldChange("sku", event.target.value)}
            error={Boolean(getFieldError(formError, "sku"))}
            helperText={getFieldError(formError, "sku")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            disabled={loading}
            fullWidth
            type="text"
            label={
              hasVariantOptions
                ? "Precio sugerido para variantes nuevas"
                : "Precio"
            }
            value={draft.basePrice}
            onChange={(event) =>
              onDraftFieldChange("basePrice", event.target.value)
            }
            error={Boolean(getFieldError(formError, "basePrice"))}
            helperText={getFieldError(formError, "basePrice")}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            disabled={loading}
            select
            fullWidth
            label={hasVariantOptions ? "Descuento sugerido" : "Descuento"}
            value={draft.discountType}
            onChange={(event) =>
              onDraftFieldChange(
                "discountType",
                event.target.value as DiscountType | "",
              )
            }
            error={Boolean(getFieldError(formError, "discountType"))}
            helperText={getFieldError(formError, "discountType")}
          >
            <MenuItem value="">Sin descuento</MenuItem>
            <MenuItem value="percentage">Porcentaje</MenuItem>
            <MenuItem value="fixed">Monto fijo</MenuItem>
          </TextField>
        </Grid>
        {draft.discountType && (
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              disabled={loading}
              fullWidth
              type="text"
              label={
                draft.discountType === "percentage" ? "Porcentaje" : "Monto"
              }
              value={draft.discountValue}
              onChange={(event) =>
                onDraftFieldChange("discountValue", event.target.value)
              }
              error={Boolean(getFieldError(formError, "discountValue"))}
              helperText={getFieldError(formError, "discountValue")}
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
            />
          </Grid>
        )}
        <Grid size={{ xs: 12 }}>
          <Stack spacing={1.25}>
            <TextField
              disabled={loading}
              fullWidth
              multiline
              minRows={3}
              label="Descripcion"
              value={draft.description}
              onChange={(event) =>
                onDraftFieldChange("description", event.target.value)
              }
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                disabled={loading}
                size="small"
                fullWidth
                label="Texto del enlace"
                placeholder="Aqui"
                value={descriptionLinkDraft.label}
                onChange={(event) =>
                  onDescriptionLinkDraftChange({ label: event.target.value })
                }
              />
              <TextField
                disabled={loading}
                size="small"
                fullWidth
                label="URL del enlace"
                placeholder="https://artenovapty.com/catalogo.pdf"
                value={descriptionLinkDraft.url}
                onChange={(event) =>
                  onDescriptionLinkDraftChange({ url: event.target.value })
                }
              />
              <Button
                disabled={
                  loading || !/^https?:\/\//i.test(descriptionLinkDraft.url.trim())
                }
                variant="outlined"
                onClick={onInsertDescriptionLink}
                sx={{
                  alignSelf: { xs: "stretch", md: "center" },
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  minWidth: { md: 152 },
                }}
              >
                Insertar enlace
              </Button>
            </Stack>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            disabled={loading}
            select
            fullWidth
            label="Categoria"
            value={draft.categoryId}
            onChange={(event) =>
              onDraftFieldChange("categoryId", event.target.value)
            }
          >
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
      <Stack direction="row" spacing={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={draft.isPublished}
              onChange={(event) =>
                onDraftFieldChange("isPublished", event.target.checked)
              }
            />
          }
          label="Publicado"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={draft.isFeatured}
              onChange={(event) =>
                onDraftFieldChange("isFeatured", event.target.checked)
              }
            />
          }
          label="Destacado"
        />
      </Stack>
    </AdminSection>
  );
});

type SimpleProductPricingSectionProps = {
  basePrice: string;
  priceTiers: PriceTierInput[];
  setPriceTiers: Dispatch<SetStateAction<PriceTierInput[]>>;
};

const SimpleProductPricingSection = memo(function SimpleProductPricingSection({
  basePrice,
  priceTiers,
  setPriceTiers,
}: SimpleProductPricingSectionProps) {
  return (
    <AdminSection
      title="Precios por cantidad"
      description="Se guardan en la variante unica automatica."
    >
      <Stack spacing={1.5}>
        <Button
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() =>
            setPriceTiers((current) => [
              ...current,
              {
                minQuantity: "2",
                unitPrice: basePrice || "0",
                totalPrice: "",
                label: "",
              },
            ])
          }
        >
          Agregar precio
        </Button>
        {priceTiers.length === 0 && (
          <Typography color="text.secondary">
            Sin precios por cantidad. Se usara el precio base.
          </Typography>
        )}
        {priceTiers.map((tier, index) => (
          <MemoPriceTierEditor
            key={`product-tier-${index}`}
            tier={tier}
            onChange={(patch) =>
              setPriceTiers((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, ...patch } : item,
                ),
              )
            }
            onDuplicate={() =>
              setPriceTiers((current) => [
                ...current.slice(0, index + 1),
                { ...tier },
                ...current.slice(index + 1),
              ])
            }
            onDelete={() =>
              setPriceTiers((current) =>
                current.filter((_, itemIndex) => itemIndex !== index),
              )
            }
          />
        ))}
      </Stack>
    </AdminSection>
  );
});

type ProductImagesSectionProps = {
  title: string;
  description: string;
  uploadLabel: string;
  helperText: string;
  uploading: boolean;
  items: ProductImageInput[];
  onFilesSelected: (files: File[]) => void;
  onChange: Dispatch<SetStateAction<ProductImageInput[]>>;
};

const ProductImagesSection = memo(function ProductImagesSection({
  title,
  description,
  uploadLabel,
  helperText,
  uploading,
  items,
  onFilesSelected,
  onChange,
}: ProductImagesSectionProps) {
  return (
    <AdminSection title={title} description={description}>
      <Stack spacing={2}>
        <MemoImageUploadDropzone
          disabled={uploading}
          loadingLabel="Subiendo galeria..."
          idleLabel={uploadLabel}
          helperText={helperText}
          onFilesSelected={onFilesSelected}
        />
        <MemoImageEditor items={items} onChange={onChange} />
      </Stack>
    </AdminSection>
  );
});

type ProductOptionsSectionProps = {
  productOptions: ProductOptionInput[];
  setProductOptions: Dispatch<SetStateAction<ProductOptionInput[]>>;
  setVariants: Dispatch<SetStateAction<VariantInput[]>>;
};

const ProductOptionsSection = memo(function ProductOptionsSection({
  productOptions,
  setProductOptions,
  setVariants,
}: ProductOptionsSectionProps) {
  return (
    <AdminSection
      title="Opciones del producto"
      description="Define los ejes dinamicos del producto, por ejemplo Color, Talla o Material."
      action={
        <Button
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() =>
            setProductOptions((current) => [
              ...current,
              createOption(current.length),
            ])
          }
        >
          Agregar opcion
        </Button>
      }
    >
      <Stack spacing={2}>
        {productOptions.length === 0 && (
          <Typography color="text.secondary">
            Si no agregas opciones, el producto seguira siendo simple.
          </Typography>
        )}
        {productOptions.map((option, optionIndex) => (
          <MemoProductOptionCard
            key={option.id}
            option={option}
            optionIndex={optionIndex}
            setProductOptions={setProductOptions}
            setVariants={setVariants}
          />
        ))}
      </Stack>
    </AdminSection>
  );
});

type VariantsSectionProps = {
  variants: VariantInput[];
  defaultVariantId: string;
  setDefaultVariantId: Dispatch<SetStateAction<string>>;
  setVariants: Dispatch<SetStateAction<VariantInput[]>>;
  uploadingKey: string;
  uploadVariantImages: (files: File[], variantId: string) => Promise<void>;
  optionValueById: OptionValueLookup;
  visualOptionIds: Set<string>;
  duplicateSelectionKeys: Set<string>;
  getSuggestedBasePrice: () => string;
  onGenerateVariants: () => void;
  onRender?: () => void;
};

export const VariantsSection = memo(function VariantsSection({
  variants,
  defaultVariantId,
  setDefaultVariantId,
  setVariants,
  uploadingKey,
  uploadVariantImages,
  optionValueById,
  visualOptionIds,
  duplicateSelectionKeys,
  getSuggestedBasePrice,
  onGenerateVariants,
  onRender,
}: VariantsSectionProps) {
  onRender?.();
  return (
    <AdminSection
      title="Combinaciones"
      description="Genera variantes reales, define su precio y marca cual sera la variante por defecto."
      action={
        <Button
          size="small"
          variant="contained"
          startIcon={<Sparkles size={16} />}
          onClick={onGenerateVariants}
        >
          Generar combinaciones
        </Button>
      }
    >
      <Stack spacing={2}>
        {variants.length === 0 && (
          <Typography color="text.secondary">
            Todavia no hay combinaciones generadas.
          </Typography>
        )}
        {variants.map((variant) => (
          <MemoVariantCard
            key={variant.id}
            variant={variant}
            defaultVariantId={defaultVariantId}
            setDefaultVariantId={setDefaultVariantId}
            setVariants={setVariants}
            uploading={uploadingKey === variant.id}
            uploadVariantImages={uploadVariantImages}
            optionValueById={optionValueById}
            visualOptionIds={visualOptionIds}
            isDuplicateSelection={duplicateSelectionKeys.has(
              normalizeSelectionKey(variant.optionValueIds),
            )}
            getSuggestedBasePrice={getSuggestedBasePrice}
          />
        ))}
      </Stack>
    </AdminSection>
  );
});

type ProductImagesEditorProps = {
  items: ProductImageInput[];
  onChange: Dispatch<SetStateAction<ProductImageInput[]>>;
};

const ImageEditor = function ImageEditor({
  items,
  onChange,
}: ProductImagesEditorProps) {
  if (items.length === 0) {
    return (
      <AdminEmptyState
        title="Sin galeria"
        description="Sube imagenes o un video para mostrar mejor este elemento."
      />
    );
  }

  return (
    <Grid container spacing={2}>
      {items.map((image, index) => (
        <MemoImageEditorCard
          key={`${image.url}-${index}`}
          image={image}
          index={index}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          setImages={onChange}
        />
      ))}
    </Grid>
  );
};

const MemoImageEditor = memo(ImageEditor);

type ImageEditorCardProps = {
  image: ProductImageInput;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  setImages: Dispatch<SetStateAction<ProductImageInput[]>>;
};

const MemoImageEditorCard = memo(function ImageEditorCard({
  image,
  index,
  isFirst,
  isLast,
  setImages,
}: ImageEditorCardProps) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Box
        sx={{
          p: 1.25,
          border: "1px solid rgba(64,44,37,.10)",
          borderRadius: 2,
        }}
      >
        <Stack spacing={1}>
          <Box sx={{ position: "relative" }}>
            {image.type === "video" ? (
              <Box
                component="video"
                src={image.url}
                poster={image.posterUrl ?? undefined}
                controls
                playsInline
                sx={{
                  width: "100%",
                  aspectRatio: "4/3",
                  objectFit: "cover",
                  borderRadius: 1,
                }}
              />
            ) : (
              <Box
                component="img"
                src={image.url}
                alt={image.alt}
                sx={{
                  width: "100%",
                  aspectRatio: "4/3",
                  objectFit: "cover",
                  borderRadius: 1,
                }}
              />
            )}
            {isFirst && (
              <Chip
                size="small"
                icon={<Star size={14} />}
                label="Principal"
                sx={{
                  position: "absolute",
                  left: 8,
                  top: 8,
                  bgcolor: "rgba(255,250,245,.94)",
                  fontWeight: 900,
                }}
              />
            )}
          </Box>
          <TextField
            size="small"
            label={
              image.type === "video"
                ? "Descripcion del video"
                : "Descripcion de la imagen"
            }
            value={image.alt}
            onChange={(event) =>
              setImages((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, alt: event.target.value } : item,
                ),
              )
            }
          />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="caption" color="text.secondary">
              {image.type === "video" ? `Video ${index + 1}` : `Imagen ${index + 1}`}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                aria-label="Hacer imagen principal"
                disabled={isFirst}
                onClick={() =>
                  setImages((current) => {
                    const next = [...current];
                    const [item] = next.splice(index, 1);
                    if (!item) return current;
                    return normalizeImages([item, ...next]);
                  })
                }
              >
                <Star size={18} />
              </IconButton>
              <IconButton
                aria-label="Subir imagen"
                disabled={isFirst}
                onClick={() =>
                  setImages((current) => normalizeImages(reorderItems(current, index, index - 1)))
                }
              >
                <ArrowUp size={18} />
              </IconButton>
              <IconButton
                aria-label="Bajar imagen"
                disabled={isLast}
                onClick={() =>
                  setImages((current) => normalizeImages(reorderItems(current, index, index + 1)))
                }
              >
                <ArrowDown size={18} />
              </IconButton>
              <IconButton
                aria-label="Eliminar imagen"
                onClick={() =>
                  setImages((current) =>
                    normalizeImages(current.filter((_, itemIndex) => itemIndex !== index)),
                  )
                }
              >
                <Trash2 size={18} />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Grid>
  );
});

type ProductOptionCardProps = {
  option: ProductOptionInput;
  optionIndex: number;
  setProductOptions: Dispatch<SetStateAction<ProductOptionInput[]>>;
  setVariants: Dispatch<SetStateAction<VariantInput[]>>;
};

const MemoProductOptionCard = memo(function ProductOptionCard({
  option,
  optionIndex,
  setProductOptions,
  setVariants,
}: ProductOptionCardProps) {
  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid rgba(64,44,37,.10)",
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={900}>Opcion {optionIndex + 1}</Typography>
          <IconButton
            aria-label="Eliminar opcion"
            onClick={() => {
              const removedValueIds = new Set(option.values.map((value) => value.id));
              setProductOptions((current) =>
                resequenceItems(current.filter((item) => item.id !== option.id)),
              );
              setVariants((current) =>
                resequenceItems(
                  current.filter((variant) =>
                    variant.optionValueIds.every((valueId) => !removedValueIds.has(valueId)),
                  ),
                ),
              );
            }}
          >
            <Trash2 size={18} />
          </IconButton>
        </Stack>
        <TextField
          fullWidth
          label="Nombre de la opcion"
          value={option.name}
          onChange={(event) =>
            setProductOptions((current) =>
              updateArrayItem(current, option.id, { name: event.target.value }),
            )
          }
          helperText="Ejemplo: Color, Talla, Acabado"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={option.drivesVisualGroup}
              onChange={(event) =>
                setProductOptions((current) =>
                  updateArrayItem(current, option.id, {
                    drivesVisualGroup: event.target.checked,
                  }),
                )
              }
            />
          }
          label="Esta opcion cambia la apariencia/imagen"
        />
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={900}>Valores</Typography>
            <Button
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() =>
                setProductOptions((current) =>
                  current.map((item) =>
                    item.id === option.id
                      ? {
                          ...item,
                          values: [
                            ...item.values,
                            createOptionValue(option.id, item.values.length),
                          ],
                        }
                      : item,
                  ),
                )
              }
            >
              Agregar valor
            </Button>
          </Stack>
          {option.values.length === 0 && (
            <Typography color="text.secondary">
              Agrega al menos un valor para esta opcion.
            </Typography>
          )}
          {option.values.map((value, valueIndex) => (
            <MemoOptionValueRow
              key={value.id}
              option={option}
              value={value}
              valueIndex={valueIndex}
              setProductOptions={setProductOptions}
              setVariants={setVariants}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
});

type OptionValueRowProps = {
  option: ProductOptionInput;
  value: ProductOptionValueInput;
  valueIndex: number;
  setProductOptions: Dispatch<SetStateAction<ProductOptionInput[]>>;
  setVariants: Dispatch<SetStateAction<VariantInput[]>>;
};

const MemoOptionValueRow = memo(function OptionValueRow({
  option,
  value,
  valueIndex,
  setProductOptions,
  setVariants,
}: OptionValueRowProps) {
  return (
    <Grid container spacing={1.5} alignItems="center">
      <Grid size={{ xs: 12, md: 10 }}>
        <TextField
          fullWidth
          size="small"
          label={`Valor ${valueIndex + 1}`}
          value={value.value}
          onChange={(event) =>
            setProductOptions((current) =>
              current.map((item) =>
                item.id === option.id
                  ? {
                      ...item,
                      values: item.values.map((currentValue) =>
                        currentValue.id === value.id
                          ? { ...currentValue, value: event.target.value }
                          : currentValue,
                      ),
                    }
                  : item,
              ),
            )
          }
        />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <IconButton
          aria-label="Eliminar valor"
          onClick={() => {
            setProductOptions((current) =>
              current.map((item) =>
                item.id === option.id
                  ? {
                      ...item,
                      values: resequenceItems(
                        item.values.filter((entry) => entry.id !== value.id),
                      ),
                    }
                  : item,
              ),
            );
            setVariants((current) =>
              resequenceItems(
                current.filter((variant) => !variant.optionValueIds.includes(value.id)),
              ),
            );
          }}
        >
          <Trash2 size={18} />
        </IconButton>
      </Grid>
    </Grid>
  );
});

type VariantCardProps = {
  variant: VariantInput;
  defaultVariantId: string;
  setDefaultVariantId: Dispatch<SetStateAction<string>>;
  setVariants: Dispatch<SetStateAction<VariantInput[]>>;
  uploading: boolean;
  uploadVariantImages: (files: File[], variantId: string) => Promise<void>;
  optionValueById: OptionValueLookup;
  visualOptionIds: Set<string>;
  isDuplicateSelection: boolean;
  getSuggestedBasePrice: () => string;
  onRender?: () => void;
};

export const VariantCard = function VariantCard({
  variant,
  defaultVariantId,
  setDefaultVariantId,
  setVariants,
  uploading,
  uploadVariantImages,
  optionValueById,
  visualOptionIds,
  isDuplicateSelection,
  getSuggestedBasePrice,
  onRender,
}: VariantCardProps) {
  onRender?.();
  const label = useMemo(
    () => computeVariantLabel(variant.optionValueIds, optionValueById),
    [optionValueById, variant.optionValueIds],
  );
  const selectionKey = useMemo(
    () => normalizeSelectionKey(variant.optionValueIds),
    [variant.optionValueIds],
  );
  const visualGroupDescription = useMemo(
    () =>
      describeVisualGroup(variant.optionValueIds, optionValueById, visualOptionIds),
    [optionValueById, variant.optionValueIds, visualOptionIds],
  );

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid rgba(64,44,37,.10)",
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
        >
          <Box>
            <Typography fontWeight={900}>
              {label || "Combinacion sin nombre"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {variant.optionValueIds
                .map((valueId) => {
                  const value = optionValueById.get(valueId);
                  return value ? `${value.optionName}: ${value.value}` : valueId;
                })
                .join(" - ")}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {defaultVariantId === variant.id && (
              <Chip size="small" color="secondary" label="Por defecto" />
            )}
            {isDuplicateSelection && (
              <Chip size="small" color="warning" label="Duplicada" />
            )}
            <IconButton
              aria-label="Eliminar variante"
              onClick={() =>
                setVariants((current) =>
                  resequenceItems(current.filter((item) => item.id !== variant.id)),
                )
              }
            >
              <Trash2 size={18} />
            </IconButton>
          </Stack>
        </Stack>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Nombre visible"
              value={variant.name}
              onChange={(event) =>
                setVariants((current) =>
                  updateArrayItem(current, variant.id, { name: event.target.value }),
                )
              }
              helperText="Si lo dejas vacio, se usara la combinacion de valores."
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="SKU variante"
              value={variant.sku}
              onChange={(event) =>
                setVariants((current) =>
                  updateArrayItem(current, variant.id, { sku: event.target.value }),
                )
              }
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              type="text"
              label="Precio base"
              value={variant.basePrice}
              onChange={(event) =>
                setVariants((current) =>
                  updateArrayItem(current, variant.id, {
                    basePrice: event.target.value,
                  }),
                )
              }
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Descuento variante"
              value={variant.discountType}
              onChange={(event) =>
                setVariants((current) =>
                  updateArrayItem(current, variant.id, {
                    discountType: event.target.value as DiscountType | "",
                  }),
                )
              }
            >
              <MenuItem value="">Sin descuento</MenuItem>
              <MenuItem value="percentage">Porcentaje</MenuItem>
              <MenuItem value="fixed">Monto fijo</MenuItem>
            </TextField>
          </Grid>
          {variant.discountType && (
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="text"
                label={
                  variant.discountType === "percentage" ? "Porcentaje" : "Monto"
                }
                value={variant.discountValue}
                onChange={(event) =>
                  setVariants((current) =>
                    updateArrayItem(current, variant.id, {
                      discountValue: event.target.value,
                    }),
                  )
                }
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={variant.isActive}
                  onChange={(event) =>
                    setVariants((current) =>
                      updateArrayItem(current, variant.id, {
                        isActive: event.target.checked,
                      }),
                    )
                  }
                />
              }
              label="Activa"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={defaultVariantId === variant.id}
                  onChange={(event) =>
                    setDefaultVariantId(event.target.checked ? variant.id : "")
                  }
                />
              }
              label="Variante por defecto"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Grupo visual derivado"
              value={variant.visualGroupKey || "Sin opciones visuales"}
              helperText={visualGroupDescription}
              slotProps={{ input: { readOnly: true } }}
            />
          </Grid>
        </Grid>

        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={900}>Precios por cantidad</Typography>
            <Button
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() =>
                setVariants((current) =>
                  current.map((item) =>
                    item.id === variant.id
                      ? {
                          ...item,
                          priceTiers: [
                            ...item.priceTiers,
                            {
                              minQuantity: "2",
                              unitPrice: item.basePrice || getSuggestedBasePrice() || "0",
                              totalPrice: "",
                              label: "",
                            },
                          ],
                        }
                      : item,
                  ),
                )
              }
            >
              Agregar precio
            </Button>
          </Stack>
          {variant.priceTiers.length === 0 && (
            <Typography color="text.secondary">
              Si no agregas precios aqui, esta variante usara solo su precio base.
            </Typography>
          )}
          {variant.priceTiers.map((tier, tierIndex) => (
            <MemoPriceTierEditor
              key={`${variant.id}-tier-${tierIndex}`}
              tier={tier}
              onChange={(patch) =>
                setVariants((current) =>
                  current.map((item) =>
                    item.id === variant.id
                      ? {
                          ...item,
                          priceTiers: item.priceTiers.map((entry, index) =>
                            index === tierIndex ? { ...entry, ...patch } : entry,
                          ),
                        }
                      : item,
                  ),
                )
              }
              onDuplicate={() =>
                setVariants((current) =>
                  current.map((item) =>
                    item.id === variant.id
                      ? {
                          ...item,
                          priceTiers: [
                            ...item.priceTiers.slice(0, tierIndex + 1),
                            { ...tier },
                            ...item.priceTiers.slice(tierIndex + 1),
                          ],
                        }
                      : item,
                  ),
                )
              }
              onDelete={() =>
                setVariants((current) =>
                  current.map((item) =>
                    item.id === variant.id
                      ? {
                          ...item,
                          priceTiers: item.priceTiers.filter(
                            (_, itemIndex) => itemIndex !== tierIndex,
                          ),
                        }
                      : item,
                  ),
                )
              }
            />
          ))}
        </Stack>

        <Stack spacing={1.5}>
          <MemoImageUploadDropzone
            disabled={uploading}
            loadingLabel="Subiendo galeria..."
            idleLabel="Subir galeria de variante"
            helperText="Arrastra imagenes o un video de esta variante, o haz click para seleccionarlos. Las variantes con el mismo grupo visual pueden compartir la misma apariencia."
            onFilesSelected={(files) => void uploadVariantImages(files, variant.id)}
          />
          <MemoImageEditor
            items={variant.images}
            onChange={(nextState) =>
              setVariants((current) =>
                current.map((item) =>
                  item.id === variant.id
                    ? {
                        ...item,
                        images:
                          typeof nextState === "function"
                            ? nextState(item.images)
                            : nextState,
                      }
                    : item,
                ),
              )
            }
          />
        </Stack>
      </Stack>
    </Box>
  );
};

const MemoVariantCard = memo(VariantCard);
export { MemoVariantCard };

function ImageUploadDropzone({
  disabled,
  idleLabel,
  loadingLabel,
  helperText,
  onFilesSelected,
}: {
  disabled: boolean;
  idleLabel: string;
  loadingLabel: string;
  helperText: string;
  onFilesSelected: (files: File[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  function preventDefaults(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    preventDefaults(event);
    if (disabled) return;
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []).filter(isMediaFile);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }

  return (
    <Box
      component="label"
      onDragEnter={(event: DragEvent<HTMLLabelElement>) => {
        preventDefaults(event);
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event: DragEvent<HTMLLabelElement>) => {
        preventDefaults(event);
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(event: DragEvent<HTMLLabelElement>) => {
        preventDefaults(event);
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      sx={{
        border: "1.5px dashed",
        borderColor: isDragging ? "primary.main" : "rgba(64,44,37,.20)",
        borderRadius: 2,
        px: 2,
        py: 2.25,
        cursor: disabled ? "not-allowed" : "pointer",
        bgcolor: isDragging ? "rgba(224,122,95,.08)" : "rgba(255,250,245,.6)",
        transition:
          "border-color .2s ease, background-color .2s ease, transform .2s ease",
        "&:hover": disabled
          ? undefined
          : {
              borderColor: "primary.main",
              bgcolor: "rgba(224,122,95,.05)",
            },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <ImagePlus size={18} />
            <Typography fontWeight={900}>
              {disabled ? loadingLabel : idleLabel}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {disabled ? "Procesando archivos..." : helperText}
          </Typography>
        </Stack>
        <Button component="span" variant="outlined" disabled={disabled}>
          Seleccionar
        </Button>
      </Stack>
      <input
        hidden
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
        multiple
        type="file"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []).filter(isMediaFile);
          event.target.value = "";
          if (files.length > 0) {
            onFilesSelected(files);
          }
        }}
      />
    </Box>
  );
}

const MemoImageUploadDropzone = memo(ImageUploadDropzone);

function OperationalFieldsEditor({
  fields,
  onChange,
}: {
  fields: CustomFieldInput[];
  onChange: (nextFields: CustomFieldInput[]) => void;
}) {
  const [localFields, setLocalFields] = useState<CustomFieldInput[]>(fields);

  useEffect(() => {
    setLocalFields(fields);
  }, [fields]);

  function syncFields(nextFields: CustomFieldInput[]) {
    setLocalFields(nextFields);
    startTransition(() => {
      onChange(nextFields);
    });
  }

  return (
    <Stack spacing={1.5}>
      <Button
        size="small"
        startIcon={<Plus size={16} />}
        onClick={() => syncFields([...localFields, createCustomField(localFields.length)])}
        sx={{ alignSelf: "flex-start" }}
      >
        Agregar campo
      </Button>
      {localFields.length === 0 && (
        <Typography color="text.secondary">
          Si no agregas campos, el pedido usara solo el detalle libre general.
        </Typography>
      )}
      {localFields.map((field, index) => (
        <Box
          key={field.id}
          sx={{
            p: 1.5,
            border: "1px solid rgba(64,44,37,.10)",
            borderRadius: 2,
          }}
        >
          <Grid container spacing={1.25} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                size="small"
                label={`Campo ${index + 1}`}
                value={field.label}
                onChange={(event) =>
                  syncFields(
                    localFields.map((item) =>
                      item.id === field.id
                        ? { ...item, label: event.target.value }
                        : item,
                    ),
                  )
                }
                helperText="Ejemplo: Nombre, Telefono, Fecha, Mensaje"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <IconButton
                  aria-label="Subir campo"
                  onClick={() => {
                    if (index === 0) return;
                    syncFields(
                      resequenceItems(reorderItems(localFields, index, index - 1)),
                    );
                  }}
                  disabled={index === 0}
                >
                  <ArrowUp size={18} />
                </IconButton>
                <IconButton
                  aria-label="Bajar campo"
                  onClick={() => {
                    if (index === localFields.length - 1) return;
                    syncFields(
                      resequenceItems(reorderItems(localFields, index, index + 1)),
                    );
                  }}
                  disabled={index === localFields.length - 1}
                >
                  <ArrowDown size={18} />
                </IconButton>
                <IconButton
                  aria-label="Eliminar campo"
                  onClick={() =>
                    syncFields(
                      resequenceItems(localFields.filter((item) => item.id !== field.id)),
                    )
                  }
                >
                  <Trash2 size={18} />
                </IconButton>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      ))}
    </Stack>
  );
}

const MemoOperationalFieldsEditor = memo(OperationalFieldsEditor);

function PriceTierEditor({
  tier,
  onChange,
  onDuplicate,
  onDelete,
}: {
  tier: PriceTierInput;
  onChange: (patch: Partial<PriceTierInput>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Box sx={{ p: 1.5, border: "1px solid rgba(64,44,37,.10)", borderRadius: 2 }}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField
            fullWidth
            size="small"
            type="text"
            label="Cantidad minima"
            value={tier.minQuantity}
            onChange={(event) => onChange({ minQuantity: event.target.value })}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField
            fullWidth
            size="small"
            type="text"
            label="Precio unitario"
            value={tier.unitPrice}
            onChange={(event) => onChange({ unitPrice: event.target.value })}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            type="text"
            label="Precio total exacto"
            value={tier.totalPrice ?? ""}
            onChange={(event) => onChange({ totalPrice: event.target.value })}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
          <TextField
            fullWidth
            size="small"
            label="Texto visible"
            value={tier.label ?? ""}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Stack direction="row" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
            <IconButton aria-label="Duplicar precio" onClick={onDuplicate}>
              <Copy size={18} />
            </IconButton>
            <IconButton aria-label="Eliminar precio" onClick={onDelete}>
              <Trash2 size={18} />
            </IconButton>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

const MemoPriceTierEditor = memo(PriceTierEditor);

export function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DraftProduct>(emptyProduct);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<ProductImageInput[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTierInput[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOptionInput[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldInput[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [defaultVariantId, setDefaultVariantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(emptyFormErrorState);
  const [uploadingKey, setUploadingKey] = useState("");
  const [descriptionLinkDraft, setDescriptionLinkDraft] =
    useState<DescriptionLinkDraft>({ label: "", url: "" });
  const isEdit = Boolean(id);
  const hasVariantOptions = productOptions.length > 0;

  const clearField = useCallback((field: string) => {
    setFormError((current) => clearFormErrorField(current, field));
  }, []);

  const updateDraftField = useCallback(
    <K extends keyof DraftProduct>(field: K, value: DraftProduct[K]) => {
      setDraft((current) => ({ ...current, [field]: value }));
      clearField(String(field));
    },
    [clearField],
  );

  const updateDescriptionLinkDraft = useCallback(
    (patch: Partial<DescriptionLinkDraft>) => {
      setDescriptionLinkDraft((current) => ({ ...current, ...patch }));
    },
    [],
  );

  const getCurrentDescriptionValues = useEffectEvent(() => ({
    description: draft.description,
    linkDraft: descriptionLinkDraft,
  }));

  const insertDescriptionLink = useCallback(() => {
    const { description, linkDraft } = getCurrentDescriptionValues();
    const url = linkDraft.url.trim();
    if (!/^https?:\/\//i.test(url)) return;

    const label = linkDraft.label.trim() || "Aqui";
    const markdownLink = `[${label}](${url})`;
    const nextDescription = description.trimEnd()
      ? `${description.trimEnd()}\n${markdownLink}`
      : markdownLink;

    updateDraftField("description", nextDescription);
    setDescriptionLinkDraft({ label: "", url: "" });
  }, [getCurrentDescriptionValues, updateDraftField]);

  const optionValueById = useMemo(() => {
    const map = new Map<
      string,
      { optionId: string; optionName: string; value: string; position: number }
    >();
    productOptions.forEach((option) => {
      option.values.forEach((value) => {
        map.set(value.id, {
          optionId: option.id,
          optionName: option.name,
          value: value.value,
          position: option.position,
        });
      });
    });
    return map;
  }, [productOptions]);

  const visualOptionIds = useMemo(
    () =>
      new Set(
        productOptions
          .filter((option) => option.drivesVisualGroup)
          .map((option) => option.id),
      ),
    [productOptions],
  );

  const variantLabel = useCallback(
    (optionValueIds: string[]) => computeVariantLabel(optionValueIds, optionValueById),
    [optionValueById],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      api.adminCategories(),
      id ? api.adminProduct(id) : Promise.resolve(null),
    ])
      .then(([nextCategories, selected]) => {
        if (!active) return;
        setCategories(nextCategories);
        if (selected) {
          const hasOptions = selected.productOptions.length > 0;
          const primaryVariant =
            selected.defaultVariant ??
            selected.variants.find((variant) => variant.isActive) ??
            selected.variants[0] ??
            null;
          setDraft({
            name: selected.name,
            slug: selected.slug,
            sku: primaryVariant?.sku ?? selected.sku ?? "",
            description: selected.description,
            categoryId: selected.categoryId,
            basePrice: String(primaryVariant?.basePrice ?? selected.basePrice ?? 0),
            discountType: primaryVariant?.discountType ?? "",
            discountValue:
              primaryVariant?.discountValue == null
                ? ""
                : String(primaryVariant.discountValue),
            isPublished: selected.isPublished,
            isFeatured: selected.isFeatured,
          });
          setImages(
            (!hasOptions ? (primaryVariant?.media ?? []) : selected.media).map(
              ({ url, type, alt, position, posterUrl }) => ({
                url,
                type,
                alt,
                position,
                posterUrl: posterUrl ?? null,
              }),
            ),
          );
          setPriceTiers(
            (!hasOptions ? (primaryVariant?.priceTiers ?? []) : []).map(
              ({ minQuantity, unitPrice, totalPrice, label }) => ({
                minQuantity: String(minQuantity),
                unitPrice: String(unitPrice),
                totalPrice: totalPrice == null ? "" : String(totalPrice),
                label,
              }),
            ),
          );
          setProductOptions(
            selected.productOptions.map((option, position) => ({
              id: option.id,
              name: option.name,
              drivesVisualGroup: option.drivesVisualGroup ?? false,
              position,
              values: option.values.map((value, valuePosition) => ({
                id: value.id,
                optionId: option.id,
                value: value.value,
                position: valuePosition,
                swatch: value.swatch ?? null,
              })),
            })),
          );
          setCustomFields(
            selected.customFields.map((field, position) => ({
              id: field.id ?? createId(),
              label: field.label,
              position,
            })),
          );
          setVariants(
            selected.variants.map((variant, position) => ({
              id: variant.id,
              name: variant.name,
              sku: variant.sku ?? "",
              visualGroupKey: variant.visualGroupKey ?? "",
              basePrice: String(variant.basePrice),
              discountType: variant.discountType ?? "",
              discountValue:
                variant.discountValue == null ? "" : String(variant.discountValue),
              isActive: variant.isActive,
              position,
              optionValueIds: variant.selections.map(
                (selection) => selection.optionValueId,
              ),
              images: variant.media.map(
                ({ url, type, alt, position: imagePosition, posterUrl }) => ({
                  url,
                  type,
                  alt,
                  position: imagePosition,
                  posterUrl: posterUrl ?? null,
                }),
              ),
              priceTiers: variant.priceTiers.map(
                ({ minQuantity, unitPrice, totalPrice, label }) => ({
                  minQuantity: String(minQuantity),
                  unitPrice: String(unitPrice),
                  totalPrice: totalPrice == null ? "" : String(totalPrice),
                  label,
                }),
              ),
            })),
          );
          setDefaultVariantId(
            selected.defaultVariant?.id ??
              selected.defaultVariantId ??
              primaryVariant?.id ??
              "",
          );
        } else {
          setDraft((current) => ({
            ...current,
            categoryId: current.categoryId || nextCategories[0]?.id || "",
          }));
          setCustomFields([]);
          setDefaultVariantId("");
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setFormError(
          createFormErrorState(err, {
            fallbackMessage: "No se pudo cargar el producto",
          }),
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!hasVariantOptions) {
      if (defaultVariantId) setDefaultVariantId("");
      return;
    }
    const validDefault = variants.find(
      (variant) => variant.id === defaultVariantId && variant.isActive,
    );
    if (validDefault) return;
    const nextDefault =
      variants.find((variant) => variant.isActive) ?? variants[0] ?? null;
    if (nextDefault && nextDefault.id !== defaultVariantId) {
      setDefaultVariantId(nextDefault.id);
    }
  }, [defaultVariantId, hasVariantOptions, variants]);

  const getUploadDefaults = useEffectEvent((target: "product" | string) => {
    const existingImages =
      target === "product"
        ? images
        : variants.find((variant) => variant.id === target)?.images ?? [];
    return {
      existingImages,
      slug: `${draft.slug || id || "product"}${target === "product" ? "" : `-${target}`}`,
      alt: draft.name,
    };
  });

  const uploadImages = useCallback(
    async (files: File[], target: "product" | string) => {
      if (files.length === 0) return;
      try {
        setUploadingKey(target);
        setFormError(emptyFormErrorState);
        const { existingImages, slug, alt } = getUploadDefaults(target);
        const existingVideoCount = existingImages.filter(
          (item) => item.type === "video",
        ).length;
        const incomingVideoCount = files.filter((file) => isVideoFile(file)).length;
        if (existingVideoCount + incomingVideoCount > 1) {
          throw new Error("Solo puedes subir un video por galeria en esta version.");
        }

        const uploadedImages: ProductImageInput[] = [];
        for (const [offset, file] of files.entries()) {
          const poster = isVideoFile(file) ? await createPosterFromVideo(file) : null;
          const uploaded = await api.uploadProductMedia({
            file,
            poster,
            slug,
            alt: alt || file.name,
            position: existingImages.length + offset,
          });
          uploadedImages.push(uploaded);
        }

        if (target === "product") {
          setImages((current) => normalizeImages([...current, ...uploadedImages]));
          return;
        }

        setVariants((current) =>
          current.map((variant) =>
            variant.id === target
              ? {
                  ...variant,
                  images: normalizeImages([...(variant.images ?? []), ...uploadedImages]),
                }
              : variant,
          ),
        );
      } catch (err) {
        setFormError(
          createFormErrorState(err, {
            fallbackMessage: "No se pudo subir el archivo",
          }),
        );
      } finally {
        setUploadingKey("");
      }
    },
    [getUploadDefaults, id],
  );

  const uploadProductImages = useCallback(
    (files: File[]) => uploadImages(files, "product"),
    [uploadImages],
  );

  const uploadVariantImages = useCallback(
    (files: File[], variantId: string) => uploadImages(files, variantId),
    [uploadImages],
  );

  const getSuggestedBasePrice = useEffectEvent(() => draft.basePrice);

  const generateVariants = useCallback(() => {
    const cleanOptions = productOptions
      .map((option) => ({
        ...option,
        name: option.name.trim(),
        values: option.values.filter((value) => value.value.trim()),
      }))
      .filter((option) => option.name && option.values.length > 0);

    if (cleanOptions.length === 0) {
      setVariants([]);
      setDefaultVariantId("");
      return;
    }

    const combinations = cartesianProduct(cleanOptions.map((option) => option.values));
    const existingByKey = new Map(
      variants.map((variant) => [normalizeSelectionKey(variant.optionValueIds), variant]),
    );

    const nextVariants = combinations.map((combo, position) => {
      const optionValueIds = combo.map((value) => value.id);
      const key = normalizeSelectionKey(optionValueIds);
      const existing = existingByKey.get(key);
      const visualGroupKey = deriveVisualGroupKey(
        optionValueIds,
        optionValueById,
        visualOptionIds,
      );
      if (existing) {
        return {
          ...existing,
          optionValueIds,
          position,
          visualGroupKey,
          name: existing.name || combo.map((value) => value.value).join(" / "),
        };
      }
      const variant = createVariant(position, optionValueIds);
      return {
        ...variant,
        name: combo.map((value) => value.value).join(" / "),
        visualGroupKey,
        basePrice: getSuggestedBasePrice() || "0",
      };
    });

    setVariants(nextVariants);
    setDefaultVariantId((current) =>
      current && nextVariants.some((variant) => variant.id === current)
        ? current
        : (nextVariants[0]?.id ?? ""),
    );
  }, [getSuggestedBasePrice, optionValueById, productOptions, variants, visualOptionIds]);

  const duplicateSelectionKeys = useMemo(() => {
    const counts = new Map<string, number>();
    variants.forEach((variant) => {
      const key = normalizeSelectionKey(variant.optionValueIds);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key),
    );
  }, [variants]);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      setFormError(emptyFormErrorState);
      const sanitizedCustomFields = customFields
        .map((field, position) => ({
          id: field.id,
          label: field.label.trim(),
          position,
        }))
        .filter((field) => field.label);
      const sanitizedOptions = productOptions
        .map((option, position) => ({
          id: option.id,
          name: option.name.trim(),
          drivesVisualGroup: option.drivesVisualGroup ?? false,
          position,
          values: option.values
            .map((value, valuePosition) => ({
              id: value.id,
              optionId: option.id,
              value: value.value.trim(),
              position: valuePosition,
              swatch: value.swatch ?? null,
            }))
            .filter((value) => value.value),
        }))
        .filter((option) => option.name && option.values.length > 0);

      const normalizedVariants =
        sanitizedOptions.length > 0
          ? variants.map((variant, position) => ({
              id: variant.id,
              name: variant.name.trim() || variantLabel(variant.optionValueIds),
              sku: variant.sku || null,
              visualGroupKey:
                deriveVisualGroupKey(
                  variant.optionValueIds,
                  optionValueById,
                  visualOptionIds,
                ) || null,
              basePrice: Number(variant.basePrice) || 0,
              discountType: variant.discountType || null,
              discountValue:
                variant.discountValue === "" ? null : Number(variant.discountValue),
              isActive: variant.isActive,
              position,
              selectionKey: normalizeSelectionKey(variant.optionValueIds),
              optionValueIds: variant.optionValueIds,
              media: normalizeImages(variant.images),
              priceTiers: normalizePriceTiers(variant.priceTiers),
            }))
          : [];
      const canonicalVariant =
        variants.find((variant) => variant.id === defaultVariantId) ??
        variants.find((variant) => variant.isActive) ??
        variants[0] ??
        null;
      const simpleProductMedia = normalizeImages(
        images.length > 0 ? images : (canonicalVariant?.images ?? []),
      );

      await api.saveAdminProduct({
        ...draft,
        id,
        sku: draft.sku || null,
        basePrice: Number(draft.basePrice) || 0,
        discountType: draft.discountType || null,
        discountValue: draft.discountValue === "" ? null : Number(draft.discountValue),
        media:
          sanitizedOptions.length > 0
            ? normalizeImages(images)
            : simpleProductMedia,
        isHero: false,
        heroSlot: null,
        priceTiers: normalizePriceTiers(priceTiers),
        productOptions: sanitizedOptions,
        defaultVariantId:
          sanitizedOptions.length > 0
            ? defaultVariantId ||
              normalizedVariants.find((variant) => variant.isActive)?.id ||
              normalizedVariants[0]?.id ||
              null
            : null,
        variants: normalizedVariants,
        extras: [],
        customFields: sanitizedCustomFields,
      });
      navigate(id ? `/admin/productos/${id}` : "/admin/productos", {
        replace: true,
      });
    } catch (err) {
      setFormError(
        createFormErrorState(err, {
          fallbackMessage: "No se pudo guardar el producto",
          resolveField: resolveProductField,
          getFieldLabel: getProductFieldLabel,
        }),
      );
    } finally {
      setSaving(false);
    }
  }, [
    customFields,
    defaultVariantId,
    draft,
    id,
    images,
    navigate,
    optionValueById,
    priceTiers,
    productOptions,
    variantLabel,
    variants,
    visualOptionIds,
  ]);

  return (
    <Stack spacing={3}>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Productos", to: "/admin/productos" },
          { label: isEdit ? "Editar" : "Nuevo" },
        ]}
      />
      <AdminPageHeader
        title={isEdit ? "Editar producto" : "Nuevo producto"}
        subtitle="Configura el producto y, si aplica, sus variantes visibles."
        action={<AdminBackButton to={id ? `/admin/productos/${id}` : "/admin/productos"} />}
      />
      <AdminFormErrorAlert
        error={formError}
        onClose={() => setFormError(emptyFormErrorState)}
      />

      <BaseProductSection
        loading={loading}
        draft={draft}
        categories={categories}
        formError={formError}
        descriptionLinkDraft={descriptionLinkDraft}
        hasVariantOptions={hasVariantOptions}
        onDraftFieldChange={updateDraftField}
        onDescriptionLinkDraftChange={updateDescriptionLinkDraft}
        onInsertDescriptionLink={insertDescriptionLink}
      />

      {!hasVariantOptions && (
        <>
          <SimpleProductPricingSection
            basePrice={draft.basePrice}
            priceTiers={priceTiers}
            setPriceTiers={setPriceTiers}
          />
          <ProductImagesSection
            title="Galeria del producto"
            description="Se guarda en la variante unica automatica."
            uploadLabel="Subir galeria"
            helperText="Arrastra imagenes o un video aqui, o haz click para seleccionarlos."
            uploading={uploadingKey === "product"}
            items={images}
            onFilesSelected={uploadProductImages}
            onChange={setImages}
          />
        </>
      )}

      {hasVariantOptions && (
        <ProductImagesSection
          title="Galeria descriptiva del producto"
          description="Es apoyo visual general; la vista publica arrancara desde la variante por defecto."
          uploadLabel="Subir galeria del producto"
          helperText="Arrastra imagenes o un video aqui, o haz click para seleccionarlos."
          uploading={uploadingKey === "product"}
          items={images}
          onFilesSelected={uploadProductImages}
          onChange={setImages}
        />
      )}

      <AdminSection
        title="Campos operativos"
        description="Declara los datos libres que necesitaras capturar cuando este producto se agregue a un pedido."
      >
        <MemoOperationalFieldsEditor fields={customFields} onChange={setCustomFields} />
      </AdminSection>

      <ProductOptionsSection
        productOptions={productOptions}
        setProductOptions={setProductOptions}
        setVariants={setVariants}
      />

      {hasVariantOptions && (
        <VariantsSection
          variants={variants}
          defaultVariantId={defaultVariantId}
          setDefaultVariantId={setDefaultVariantId}
          setVariants={setVariants}
          uploadingKey={uploadingKey}
          uploadVariantImages={uploadVariantImages}
          optionValueById={optionValueById}
          visualOptionIds={visualOptionIds}
          duplicateSelectionKeys={duplicateSelectionKeys}
          getSuggestedBasePrice={getSuggestedBasePrice}
          onGenerateVariants={generateVariants}
        />
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button
          variant="contained"
          size="large"
          onClick={() => void save()}
          disabled={loading || saving}
        >
          {saving ? "Guardando..." : "Guardar producto"}
        </Button>
        <AdminBackButton
          to={id ? `/admin/productos/${id}` : "/admin/productos"}
          label="Cancelar"
        />
      </Stack>
    </Stack>
  );
}
