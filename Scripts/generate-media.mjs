import { mkdir, readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import ffmpeg from "ffmpeg-static";

const root = fileURLToPath(new URL("../Media/", import.meta.url));

const images = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"
]);
const videos = new Set([".mp4", ".webm", ".ogv"]);

async function generate(folder) {
  const files = await readdir(folder, { withFileTypes: true });

  files.sort((a, b) =>
    a.name.localeCompare(b.name, "en", { numeric: true })
  );

  const output = join(folder, "_generated");
  await mkdir(output, { recursive: true });

  const items = [];

  for (const file of files) {
    // Never process generated previews again.
    if (file.name === "_generated") continue;

    const source = join(folder, file.name);

    if (file.isDirectory()) {
      await generate(source);
      continue;
    }

    if (!file.isFile()) continue;

    const extension = extname(file.name).toLowerCase();
    const type = images.has(extension)
      ? "image"
      : videos.has(extension) ? "video" : null;

    if (!type) continue;

    // Extract one still frame from videos.
    const input = type === "video"
      ? execFileSync(ffmpeg, [
          "-v", "error",
          "-ss", "0.1",
          "-i", source,
          "-frames:v", "1",
          "-vf", "scale=1280:720:force_original_aspect_ratio=decrease",
          "-f", "image2pipe",
          "-vcodec", "png",
          "pipe:1"
        ], {
          windowsHide: true,
          maxBuffer: 32 * 1024 * 1024
        })
      : source;

    const base = join(output, file.name);
    const thumbnail = sharp(input)
      .rotate()
      .resize(480, 270, {
        fit: "inside",
        withoutEnlargement: true
      });

    await thumbnail.clone()
      .avif({ quality: 45, effort: 4 })
      .toFile(`${base}.thumb.avif`);

    await thumbnail.clone()
      .webp({ quality: 75 })
      .toFile(`${base}.thumb.webp`);

    // Larger image for the lightbox or video poster.
    await sharp(input)
      .rotate()
      .resize(1600, 1600, {
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 82 })
      .toFile(`${base}.preview.webp`);

    const name = encodeURIComponent(file.name);

    items.push({
      src: name,
      type,
      title: file.name.slice(0, -extension.length),
      thumbAvif: `_generated/${name}.thumb.avif`,
      thumbWebp: `_generated/${name}.thumb.webp`,
      preview: `_generated/${name}.preview.webp`
    });
  }

  await writeFile(
    join(folder, "gallery.json"),
    JSON.stringify(items, null, 2)
  );

  console.log(`${folder}: ${items.length} items prepared`);
}

await mkdir(root, { recursive: true });

for (const project of await readdir(root, { withFileTypes: true })) {
  if (project.isDirectory() && project.name !== "_generated") {
    await generate(join(root, project.name));
  }
}