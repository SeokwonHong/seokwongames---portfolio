import { mkdir, readdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";

const root = new URL("../Media/", import.meta.url);

const images = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"
]);

const videos = new Set([".mp4", ".webm", ".ogv"]);

await mkdir(root, { recursive: true });

for (const project of await readdir(root, { withFileTypes: true })) {
  if (!project.isDirectory()) continue;

  const folder = new URL(`${encodeURIComponent(project.name)}/`, root);
  const files = await readdir(folder, { withFileTypes: true });

  files.sort((a, b) =>
    a.name.localeCompare(b.name, "en", { numeric: true })
  );

  const items = [];

  for (const file of files) {
    if (!file.isFile()) continue;

    const extension = extname(file.name).toLowerCase();
    const type = images.has(extension)
      ? "image"
      : videos.has(extension)
        ? "video"
        : null;

    if (!type) continue;

    items.push({
      src: encodeURIComponent(file.name),
      type,
      title: file.name.slice(0, -extension.length)
    });
  }

  await writeFile(
    new URL("gallery.json", folder),
    JSON.stringify(items, null, 2)
  );
}