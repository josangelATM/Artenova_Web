import { Fragment } from "react";
import { Link as MuiLink } from "@mui/material";

type TextPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const urlPattern = /https?:\/\/\S+/g;
const trailingPunctuation = /[.,!?;:]+$/;

function trimTrailingDelimiter(url: string) {
  let value = url.replace(trailingPunctuation, "");
  while (value.endsWith(")") && (value.match(/\(/g)?.length ?? 0) < (value.match(/\)/g)?.length ?? 0)) {
    value = value.slice(0, -1);
  }
  return value;
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function splitRawTextWithLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(urlPattern)) {
    const rawValue = match[0];
    const start = match.index ?? 0;
    const trimmedValue = trimTrailingDelimiter(rawValue);
    const trimmedEnd = start + trimmedValue.length;
    const rawEnd = start + rawValue.length;

    if (start > cursor) {
      parts.push({ type: "text", value: text.slice(cursor, start) });
    }

    parts.push({ type: "link", value: trimmedValue, href: trimmedValue });

    if (rawEnd > trimmedEnd) {
      parts.push({ type: "text", value: text.slice(trimmedEnd, rawEnd) });
    }

    cursor = rawEnd;
  }

  if (cursor < text.length) {
    parts.push({ type: "text", value: text.slice(cursor) });
  }

  return parts;
}

export function splitTextWithLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let cursor = 0;
  let searchIndex = 0;

  while (searchIndex < text.length) {
    const labelStart = text.indexOf("[", searchIndex);
    if (labelStart === -1) break;

    const labelEnd = text.indexOf("]", labelStart + 1);
    if (labelEnd === -1 || text[labelEnd + 1] !== "(") {
      searchIndex = labelStart + 1;
      continue;
    }

    const label = text.slice(labelStart + 1, labelEnd);
    if (!label) {
      searchIndex = labelStart + 1;
      continue;
    }

    let urlEnd = labelEnd + 2;
    let depth = 1;
    while (urlEnd < text.length && depth > 0) {
      const current = text[urlEnd];
      if (current === "(") depth += 1;
      if (current === ")") depth -= 1;
      urlEnd += 1;
    }

    if (depth !== 0) {
      searchIndex = labelStart + 1;
      continue;
    }

    const href = text.slice(labelEnd + 2, urlEnd - 1);
    if (!isValidHttpUrl(href)) {
      searchIndex = labelStart + 1;
      continue;
    }

    if (labelStart > cursor) {
      parts.push(...splitRawTextWithLinks(text.slice(cursor, labelStart)));
    }
    parts.push({ type: "link", value: label, href });

    cursor = urlEnd;
    searchIndex = urlEnd;
  }

  if (cursor < text.length) {
    parts.push(...splitRawTextWithLinks(text.slice(cursor)));
  }

  return parts;
}

export function AutoLinkedText({ text }: { text: string }) {
  return (
    <>
      {splitTextWithLinks(text).map((part, index) => {
        if (part.type === "text") {
          return <Fragment key={`text-${index}`}>{part.value}</Fragment>;
        }

        return (
          <MuiLink
            key={`link-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            underline="always"
            color="inherit"
            sx={{ overflowWrap: "anywhere" }}
          >
            {part.value}
          </MuiLink>
        );
      })}
    </>
  );
}
