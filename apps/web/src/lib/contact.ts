export function whatsappHref(value?: string | null, text?: string) {
  const digits = value?.replace(/\D/g, "");
  if (!digits) return "";
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
