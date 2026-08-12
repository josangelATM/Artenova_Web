import { mkdir, readdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultGraduationCatalogJsonRelativePath, parseGraduationCatalogPages } from "../lib/graduationCatalog";

type ParsedArgs = {
  pdf?: string;
  out: string;
};

type PythonCandidate = {
  command: string;
  args: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) continue;
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args.set(token.slice(2), next);
      index += 1;
    }
  }

  return {
    pdf: args.get("pdf") ?? undefined,
    out: args.get("out") ?? fileURLToPath(new URL(defaultGraduationCatalogJsonRelativePath(), import.meta.url)),
  };
}

async function resolveDefaultPdfPath() {
  const downloadsDir = path.join(os.homedir(), "Downloads");
  const entries = await readdir(downloadsDir, { withFileTypes: true });
  const matchingFile = entries.find((entry) => {
    if (!entry.isFile()) return false;
    const normalized = entry.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return normalized === "catalogo de graduacion.pdf";
  });

  if (!matchingFile) {
    throw new Error("No se encontro el PDF por defecto en Downloads. Usa --pdf <ruta-del-pdf>.");
  }

  return path.join(downloadsDir, matchingFile.name);
}

function getPythonCandidates(): PythonCandidate[] {
  const candidates: PythonCandidate[] = [];
  if (process.env.PYTHON_BIN) {
    candidates.push({ command: process.env.PYTHON_BIN, args: [] });
  }
  candidates.push({ command: "python", args: [] });
  candidates.push(process.platform === "win32" ? { command: "py", args: ["-3"] } : { command: "python3", args: [] });
  return candidates;
}

async function extractPdfPages(pdfPath: string) {
  const pythonScript = [
    "import json, sys",
    "import pdfplumber",
    "pdf_path = sys.argv[1]",
    "with pdfplumber.open(pdf_path) as pdf:",
    "    pages = [(page.extract_text() or '') for page in pdf.pages]",
    "print(json.dumps({'pages': pages}, ensure_ascii=False))",
  ].join("\n");

  let lastError: unknown = null;

  for (const candidate of getPythonCandidates()) {
    try {
      const payload = await new Promise<string>((resolve, reject) => {
        const child = spawn(candidate.command, [...candidate.args, "-c", pythonScript, pdfPath], {
          env: {
            ...process.env,
            PYTHONIOENCODING: "utf-8",
          },
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        child.on("error", reject);
        child.on("close", (code) => {
          if (code === 0) {
            resolve(stdout);
            return;
          }
          reject(new Error(stderr.trim() || `El comando ${candidate.command} termino con codigo ${code}.`));
        });
      });

      const parsed = JSON.parse(payload) as { pages?: string[] };
      if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
        throw new Error("La extraccion del PDF no devolvio paginas legibles.");
      }
      return parsed.pages;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `No se pudo extraer el PDF. Define PYTHON_BIN o instala Python con pdfplumber. Detalle: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

async function main() {
  const { pdf: requestedPdf, out } = parseArgs(process.argv.slice(2));
  const pdf = requestedPdf ?? await resolveDefaultPdfPath();
  const pages = await extractPdfPages(pdf);
  const catalog = parseGraduationCatalogPages(pages, path.basename(pdf));

  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    pdf,
    out,
    itemCount: catalog.meta.itemCount,
    slugs: catalog.products.map((product) => product.slug),
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error("Uso: pnpm --filter @artenova/api catalog:extract-graduation -- --pdf <ruta-del-pdf> --out <ruta-json>");
  process.exitCode = 1;
});
