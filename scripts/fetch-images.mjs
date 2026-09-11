// usage: node fetch-images.mjs map.json  (map: [{url, out}]) -> downloads and converts to JPG (max 1600px)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
const map = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const root = "/home/user/boquetterie/public/images";
for (const { url, out } of map) {
  const dest = path.join(root, out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) { console.error("FAIL", out, res.status); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(dest);
  console.log("ok", out);
}
