// Solmar Cover Studio — entrypoint (Node 22, standard library only).
//
// Hands the app in: copies app/ and screenshots/ from this repository
// into the output directory and writes dossier.json there, built by the
// kit's vendored library from the repository's own files.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader MAKEFUN_OUTPUT_DIR stands in for /output; when it is
// unset the program writes to /output.

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

// The gate's own caps for this bounty (RULES.txt): the dossier holds at
// most 1.5 MiB, its text at most 160 KiB, at most 4 screenshots, and
// index.html at most 1 MiB.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  max_bytes: 1572864,
  max_images: 4,
  index_html_max_bytes: 1048576,
};

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

async function copyTreeIntoOutput() {
  // Start from a clean output for the three entries this program owns,
  // so a stale file from an earlier run can never leak into the entry.
  await rm(join(outputDir, "app"), { recursive: true, force: true });
  await rm(join(outputDir, "screenshots"), { recursive: true, force: true });
  await rm(join(outputDir, "dossier.json"), { force: true });
  await mkdir(outputDir, { recursive: true });
  await cp(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });
  await cp(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), { recursive: true });
}

async function writeDossier() {
  const dossier = await buildDossier(repoRoot, DOSSIER_CAPS);
  const bytes = typeof dossier === "string" ? dossier : Buffer.from(dossier);
  await writeFile(join(outputDir, "dossier.json"), bytes);
}

await copyTreeIntoOutput();
await writeDossier();

// Sanity read-back: the dossier the library wrote is the one on disk,
// and it names exactly the screenshots this program copied.
const written = await readFile(join(outputDir, "dossier.json"), "utf8");
const parsed = JSON.parse(written);
if (parsed.schema !== "makefun/dossier/v1") {
  throw new Error(`unexpected dossier schema: ${parsed.schema}`);
}
const { readdir } = await import("node:fs/promises");
const shotFiles = (await readdir(join(outputDir, "screenshots")))
  .filter((name) => !name.startsWith("."))
  .sort();
const dossierNames = parsed.images.map((image) => image.name).sort();
if (JSON.stringify(shotFiles) !== JSON.stringify(dossierNames)) {
  throw new Error(`dossier screenshots ${dossierNames} do not match output ${shotFiles}`);
}
console.log(`wrote ${outputDir}/dossier.json (${written.length} bytes, ${parsed.images.length} screenshots)`);
