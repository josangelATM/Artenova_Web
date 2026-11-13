import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { quoteLineImage, quoteLogo, quoteMoney, quoteSummary, type Quote, type QuoteAmounts } from "./quote";

const palette = {
  violet: "#552080", lilac: "#F5EDFA", cream: "#FCF3E8", paper: "#FFFDFC",
  ink: "#352139", muted: "#68566D", coral: "#F59287", gold: "#E6B858"
};
const clean = (text: string) => text.trim().replace(/[\u00a0\u202f]/g, " ").replace(/−/g, "-");
const dateLabel = (date: string) => date.split("-").reverse().join("/");
type Entry = [label: string, value: string];
const present = (entries: Entry[]) => entries.filter(([, value]) => value.trim());

export function renderQuotePdf(quote: Quote, amounts: QuoteAmounts, logo: Uint8Array, thumbnails: Map<string, string>) {
  const doc = new jsPDF({ format: "letter", unit: "mm", compress: true, putOnlyUsedFonts: true }) as jsPDF & {
    lastAutoTable: { finalY: number };
  };
  doc.setProperties({ title: "Cotización", author: clean(quote.issuer.name) });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = { left: 15, right: 15, top: 23, bottom: 19 };
  const left = margin.left;
  const right = width - margin.right;
  const contentWidth = right - left;
  const bottom = height - margin.bottom;

  function font(size: number, color = palette.ink, weight = "normal", family = "helvetica") {
    doc.setFont(family, weight).setFontSize(size).setTextColor(color);
  }

  function wrap(text: string, maxWidth: number): string[] {
    return doc.splitTextToSize(clean(text), maxWidth);
  }

  function fill(x: number, y: number, w: number, h: number, color: string, radius = 0) {
    doc.setFillColor(color);
    if (radius) doc.roundedRect(x, y, w, h, radius, radius, "F");
    else doc.rect(x, y, w, h, "F");
  }

  const table = {
    margin,
    styles: { fontSize: 10, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }, textColor: palette.ink },
    headStyles: { fillColor: palette.violet, textColor: palette.paper },
    bodyStyles: { fillColor: palette.paper },
    alternateRowStyles: { fillColor: palette.lilac }
  };

  function fieldTable(title: string, entries: Entry[], y: number) {
    autoTable(doc, {
      ...table,
      startY: y,
      head: [[{ content: title, colSpan: 2 }]],
      body: present(entries).map(([label, value]) => [label, clean(value)]),
      columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
      rowPageBreak: "avoid",
      showHead: "everyPage"
    });
    return doc.lastAutoTable.finalY + 6;
  }

  const image = doc.getImageProperties(logo);
  const scale = Math.min(24 / image.width, 24 / image.height);
  const imageWidth = image.width * scale;
  const imageHeight = image.height * scale;
  fill(left, 13, contentWidth, 43, palette.violet, 4);
  fill(left + 8, 19, 31, 31, palette.paper, 4);
  doc.addImage(logo, "PNG", left + 23.5 - imageWidth / 2, 34.5 - imageHeight / 2, imageWidth, imageHeight);
  font(34, palette.paper, "bold", "times");
  doc.text("Cotización", left + 49, 39);
  fill(left + 50, 45.5, 17, 1.4, palette.coral, 0.7);
  fill(left + 69, 45.5, 6, 1.4, palette.gold, 0.7);

  const dates: Entry[] = [["Emisión", dateLabel(quote.issued)], ["Vigente hasta", dateLabel(quote.validUntil)]];
  const metadata = present([...dates, ["Referencia", quote.reference]]);
  const metaWidth = contentWidth / 3;
  const metaValues = metadata.map(([label, value]) => {
    font(10, palette.ink, "bold");
    return { label, lines: wrap(value, metaWidth - 12) };
  });
  const compactMeta = metaValues.every(({ lines }) => lines.length <= 4);
  let y = 61;
  if (compactMeta) {
    const metaHeight = 13 + Math.max(1, ...metaValues.map(({ lines }) => lines.length)) * 4.2;
    fill(left, y, contentWidth, metaHeight, palette.lilac, 2.5);
    metaValues.forEach(({ label, lines }, index) => {
      const x = left + 6 + index * metaWidth;
      font(8.5, palette.muted, "bold");
      doc.text(label.toUpperCase(), x, y + 6.5);
      font(10, palette.ink, "bold");
      doc.text(lines, x, y + 12.5, { lineHeightFactor: 1.18 });
    });
    y += metaHeight + 6;
  } else {
    y = fieldTable("Datos de la cotización", metadata, y);
  }

  const issuer: Entry[] = [
    ["Razón social", quote.issuer.legalName], ["RUC/DV", quote.issuer.taxId],
    ["WhatsApp", quote.issuer.phone], ["Correo", quote.issuer.email], ["Dirección", quote.issuer.address]
  ];
  const customer: Entry[] = [
    ["Contacto", quote.customer.contact], ["RUC/DV", quote.customer.taxId],
    ["Teléfono", quote.customer.phone], ["Correo", quote.customer.email], ["Dirección", quote.customer.address]
  ];
  const partyWidth = (contentWidth - 26) / 2;
  const parties = [
    { label: "Emisor", name: quote.issuer.name, fields: issuer, x: left + 7 },
    { label: "Cliente", name: quote.customer.name, fields: customer, x: left + contentWidth / 2 + 6 }
  ].map((party) => {
    font(15, palette.violet, "bold", "times");
    const name = wrap(party.name, partyWidth);
    font(9);
    const lines = present(party.fields).flatMap(([label, value]) => wrap(label + "  ·  " + value, partyWidth));
    return { ...party, name, lines, height: 17 + name.length * 6 + lines.length * 4.2 };
  });
  const partiesHeight = Math.max(...parties.map((party) => party.height));
  if (partiesHeight <= 81 && y + partiesHeight + 26 < bottom) {
    fill(left, y, contentWidth, partiesHeight, palette.cream, 3);
    fill(left + contentWidth / 2, y + 6, 0.45, partiesHeight - 12, palette.gold);
    for (const party of parties) {
      font(8.5, palette.muted, "bold");
      doc.text(party.label.toUpperCase(), party.x, y + 8);
      font(15, palette.violet, "bold", "times");
      doc.text(party.name, party.x, y + 15, { lineHeightFactor: 1.13 });
      font(9);
      if (party.lines.length) doc.text(party.lines, party.x, y + 15 + party.name.length * 6, { lineHeightFactor: 1.32 });
    }
    y += partiesHeight + 8;
  } else {
    y = fieldTable("Emisor", [["Nombre comercial", quote.issuer.name], ...issuer], y);
    y = fieldTable("Cliente", [["Nombre o empresa", quote.customer.name], ...customer], y);
  }

  autoTable(doc, {
    ...table,
    startY: y,
    head: [["Descripción", "Cantidad", "Precio unitario", "Importe"]],
    body: quote.lines.map((line, index) => {
      const price = amounts.lines[index]!;
      const image = line.includeThumbnail ? thumbnails.get(line.id) : undefined;
      return [
        image ? " " : "",
        clean(line.description), String(price.quantity),
        price.packagePrice ? "Por paquete" : clean(quoteMoney(price.unit)),
        clean(quoteMoney(price.total))
      ];
    }),
    columnStyles: {
      0: { cellWidth: 22 },
      2: { halign: "right", cellWidth: 26 },
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 39, fontStyle: "bold" }
    },
    didDrawCell: ({ section, row, column, cell }) => {
      if (section !== "body" || column.index !== 0) return;
      const line = quote.lines[row.index];
      const image = line?.includeThumbnail ? thumbnails.get(line.id) : undefined;
      if (image) doc.addImage(image, "JPEG", cell.x + 2, cell.y + 1, 18, 18);
    },
    didParseCell: ({ section, column, cell }) => {
      if (section === "head" && column.index > 0) cell.styles.halign = "right";
    },
    rowPageBreak: "avoid",
    showHead: "everyPage"
  });
  y = doc.lastAutoTable.finalY + 8;

  const summary = quoteSummary(quote, amounts);
  const summaryWidth = 75;
  const summaryHeight = 23 + (summary.length - 1) * 7;
  const summaryX = right - summaryWidth;
  const conditionsWidth = summaryX - left - 10;
  const conditions = present([["Plazo de entrega", quote.delivery], ["Condiciones de pago", quote.payment], ["Observaciones", quote.notes]]);
  font(9.5);
  const conditionLines = conditions.map(([label, value]) => ({ label, lines: wrap(value, conditionsWidth - 10) }));
  const conditionsHeight = 14 + conditionLines.reduce((sum, item) => sum + 10 + item.lines.length * 4.3, 0);

  if (y + summaryHeight > bottom) {
    doc.addPage();
    y = margin.top;
  }
  fill(summaryX, y, summaryWidth, summaryHeight, palette.lilac, 3);
  summary.slice(0, -1).forEach(([label, value], index) => {
    font(9, palette.muted);
    doc.text(label, summaryX + 5, y + 8 + index * 7);
    font(10, palette.ink, "bold");
    doc.text(clean(value), right - 5, y + 8 + index * 7, { align: "right" });
  });
  const totalY = y + summaryHeight - 17;
  fill(summaryX, totalY, summaryWidth, 17, palette.violet, 3);
  fill(summaryX + 4, totalY + 4, 1, 9, palette.gold);
  font(9, palette.paper, "bold");
  doc.text("TOTAL", summaryX + 8, totalY + 10);
  font(16, palette.paper, "bold", "times");
  doc.text(clean(summary.at(-1)![1]), right - 5, totalY + 10.5, { align: "right" });

  if (conditions.length && y + conditionsHeight <= bottom && conditionsHeight <= 85) {
    fill(left, y, conditionsWidth, conditionsHeight, palette.cream, 3);
    font(12, palette.violet, "bold", "times");
    doc.text("Condiciones", left + 5, y + 8);
    let cursor = y + 16;
    for (const { label, lines } of conditionLines) {
      font(8.5, palette.muted, "bold");
      doc.text(label, left + 5, cursor);
      font(9.5);
      doc.text(lines, left + 5, cursor + 5, { lineHeightFactor: 1.28 });
      cursor += 10 + lines.length * 4.3;
    }
  } else if (conditions.length) {
    fieldTable("Condiciones", conditions, y + summaryHeight + 7);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    if (page > 1) {
      font(11, palette.violet, "bold", "times");
      doc.text("Cotización", left, 15);
      fill(left, 17.5, 14, 1, palette.coral, 0.5);
    }
    fill(left, height - 15, contentWidth, 0.35, palette.gold);
    font(8.5, palette.muted);
    doc.text(wrap(quote.issuer.name, contentWidth - 42)[0] ?? "", left, height - 9.5);
    doc.text(`Página ${page} de ${pages}`, right, height - 9.5, { align: "right" });
  }
  return doc;
}

export async function downloadQuote(quote: Quote, amounts: QuoteAmounts) {
  const response = await fetch(quoteLogo);
  if (!response.ok) throw new Error("No se pudo cargar el logo.");
  const thumbnails = new Map<string, string>();
  const missing: number[] = [];
  for (const [index, line] of quote.lines.entries()) {
    const url = line.includeThumbnail ? quoteLineImage(line) : null;
    if (!url) continue;
    try {
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) throw new Error("image unavailable");
      const bitmap = await createImageBitmap(await imageResponse.blob());
      const scale = Math.min(240 / bitmap.width, 240 / bitmap.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const compressed = canvas.toDataURL("image/jpeg", 0.72);
      for (const candidate of quote.lines) {
        if (candidate.includeThumbnail && quoteLineImage(candidate) === url) thumbnails.set(candidate.id, compressed);
      }
    } catch {
      missing.push(index + 1);
    }
  }
  const doc = renderQuotePdf(quote, amounts, new Uint8Array(await response.arrayBuffer()), thumbnails);
  const reference = quote.reference.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 60);
  await doc.save(`Cotizacion-${reference || quote.issued}.pdf`, { returnPromise: true });
  return missing;
}
