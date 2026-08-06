import { calculateLineTotal } from "@artenova/shared";
import { productPayload } from "../lib/serialize";
import { prisma } from "../lib/prisma";

export async function priceOrderItems(items: Array<{ productId: string; quantity: number; selectedExtraIds: string[]; personalization: Record<string, string | string[]> }>) {
  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isPublished: true },
    include: {
      priceTiers: true,
      extras: true,
      customFields: true,
      images: true,
      options: {
        orderBy: { position: "asc" as const },
        include: { values: { orderBy: { position: "asc" as const } } }
      },
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" as const },
        include: {
          images: { orderBy: { position: "asc" as const } },
          optionValues: {
            include: {
              optionValue: {
                include: {
                  option: true
                }
              }
            }
          },
          priceTiers: { orderBy: { minQuantity: "asc" as const } }
        }
      }
    }
  });

  const byId = new Map(products.map((product) => [product.id, productPayload(product)]));

  return items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) {
      throw new Error(`Producto no disponible: ${item.productId}`);
    }

    const missingRequired = product.customFields.filter((field: any) => field.required && !item.personalization[field.id]);
    if (missingRequired.length > 0) {
      throw new Error(`Faltan datos requeridos para ${product.name}`);
    }

    const price = calculateLineTotal(product, item.quantity, item.selectedExtraIds);

    return {
      product,
      quantity: item.quantity,
      selectedExtraIds: item.selectedExtraIds,
      personalization: item.personalization,
      unitPrice: price.unitPrice,
      extrasTotal: price.extrasTotal,
      lineTotal: price.lineTotal
    };
  });
}
