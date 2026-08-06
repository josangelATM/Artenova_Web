function resolvePrefix(date = new Date()) {
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

function parseSequence(code: string, prefix: string) {
  const match = code.match(/^(\d{4})-(\d{3})$/);
  if (!match || match[1] !== prefix) return 0;
  return Number(match[2]);
}

export async function createOrderCode(
  tx: { order: { findFirst: (args: any) => Promise<{ code: string } | null> } },
  date = new Date(),
) {
  const prefix = resolvePrefix(date);
  const latest = await tx.order.findFirst({
    where: { code: { startsWith: `${prefix}-` } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const nextSequence = parseSequence(latest?.code ?? "", prefix) + 1;
  return `${prefix}-${String(nextSequence).padStart(3, "0")}`;
}
