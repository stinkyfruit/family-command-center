import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const folders = {
  generalCompletionAnimations: "public/animations/general/completions",
  halloweenCompletionAnimations: "public/animations/holidays/halloween/completions",
  christmasAnimations: "public/animations/holidays/christmas",
};

async function animationUrls(folder) {
  const files = await readdir(path.join(process.cwd(), folder), { withFileTypes: true });
  return files
    .filter((file) => file.isFile() && file.name.endsWith(".json"))
    .map((file) => `/${folder.replace(/^public\//, "")}/${encodeURIComponent(file.name)}`)
    .sort((first, second) => first.localeCompare(second));
}

const entries = await Promise.all(Object.entries(folders).map(async ([name, folder]) => [name, await animationUrls(folder)]));
const manifest = `// This file is generated automatically. Do not edit it by hand.\n${entries.map(([name, urls]) => `export const ${name} = ${JSON.stringify(urls, null, 2)} as const;`).join("\n\n")}\n`;

const outputDirectory = path.join(process.cwd(), "src/generated");
await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "animation-manifest.ts"), manifest);
