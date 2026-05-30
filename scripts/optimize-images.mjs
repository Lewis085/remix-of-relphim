/**
 * Comprime e converte imagens pesadas para WebP/JPEG otimizado.
 * Roda uma vez: node scripts/optimize-images.mjs
 */
import sharp from "sharp";
import path from "path";
import fs from "fs";

const ASSETS = path.resolve("src/assets");

const tasks = [
  {
    input:  "banner-celeste.jpg",
    output: "banner-celeste.jpg",
    format: "jpeg",
    options: { quality: 75, mozjpeg: true },
    resize: { width: 1280, withoutEnlargement: true },
  },
  {
    input:  "instituto-logo.png",
    output: "instituto-logo.webp",
    format: "webp",
    options: { quality: 80 },
    resize: { width: 200, withoutEnlargement: true },
  },
  {
    input:  "notif-avatar.png",
    output: "notif-avatar.webp",
    format: "webp",
    options: { quality: 75 },
    resize: { width: 96, withoutEnlargement: true },
  },
  {
    input:  "heart-logo.png",
    output: "heart-logo.webp",
    format: "webp",
    options: { quality: 80 },
    resize: { width: 128, withoutEnlargement: true },
  },
];

for (const task of tasks) {
  const inputPath  = path.join(ASSETS, task.input);
  const outputPath = path.join(ASSETS, task.output);

  if (!fs.existsSync(inputPath)) {
    console.log(`⏭  Skipping ${task.input} (not found)`);
    continue;
  }

  const before = fs.statSync(inputPath).size;

  let pipeline = sharp(inputPath);

  if (task.resize) {
    pipeline = pipeline.resize(task.resize);
  }

  if (task.format === "webp") {
    pipeline = pipeline.webp(task.options);
  } else if (task.format === "jpeg") {
    pipeline = pipeline.jpeg(task.options);
  }

  await pipeline.toFile(outputPath + ".tmp");

  // Se o output é diferente do input, remover o original
  if (task.input !== task.output && fs.existsSync(inputPath)) {
    fs.unlinkSync(inputPath);
  }

  // Mover o .tmp para o final
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  fs.renameSync(outputPath + ".tmp", outputPath);

  const after = fs.statSync(outputPath).size;
  const pct = ((1 - after / before) * 100).toFixed(1);
  console.log(`✅ ${task.input} → ${task.output}: ${(before/1024).toFixed(0)}KB → ${(after/1024).toFixed(0)}KB (${pct}% menor)`);
}

console.log("\n🎉 Done! Update import paths if filenames changed.");
