// Découpe un modèle .glb en petits fichiers (un .gltf + des morceaux .bin + les images).
// Utile quand la connexion est lente : chaque petit fichier s'envoie et se charge vite.
// Usage : node tools/eclater.mjs poulet
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const nom = process.argv[2];
if (!nom) { console.log("Ex. : node tools/eclater.mjs poulet"); process.exit(1); }
const dossier = join(dirname(fileURLToPath(import.meta.url)), "..", "models");
const chemin = join(dossier, nom + ".glb");

const buf = readFileSync(chemin);
const lenJson = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + lenJson).toString("utf8"));
const bin = buf.subarray(20 + lenJson + 8, 20 + lenJson + 8 + buf.readUInt32LE(20 + lenJson));
const octets = (bv) => bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);

const fichiers = [];
// 1. Les images deviennent des fichiers à part.
const vuesImages = new Set();
(gltf.images || []).forEach((img, i) => {
  if (img.bufferView === undefined) return;
  const ext = img.mimeType === "image/png" ? "png" : "jpg";
  const f = `${nom}_img${i}.${ext}`;
  writeFileSync(join(dossier, f), octets(gltf.bufferViews[img.bufferView]));
  fichiers.push([f, gltf.bufferViews[img.bufferView].byteLength]);
  vuesImages.add(img.bufferView);
  img.uri = f;
  delete img.bufferView;
  delete img.mimeType;
});

// 2. Chaque bloc de géométrie devient un petit fichier .bin.
const nouvelIndex = new Map(), vues = [], buffers = [];
gltf.bufferViews.forEach((bv, i) => {
  if (vuesImages.has(i)) return;
  const f = `${nom}_${buffers.length}.bin`;
  const data = octets(bv);
  writeFileSync(join(dossier, f), data);
  fichiers.push([f, data.length]);
  nouvelIndex.set(i, vues.length);
  buffers.push({ uri: f, byteLength: data.length });
  const { byteOffset, ...reste } = bv;
  vues.push({ ...reste, buffer: buffers.length - 1, byteOffset: 0 });
});
for (const a of gltf.accessors) if (a.bufferView !== undefined) a.bufferView = nouvelIndex.get(a.bufferView);
gltf.bufferViews = vues;
gltf.buffers = buffers;

writeFileSync(join(dossier, nom + ".gltf"), JSON.stringify(gltf));
unlinkSync(chemin);
fichiers.sort((a, b) => b[1] - a[1]);
console.log(`${nom} : ${fichiers.length + 1} fichiers, le plus gros : ${fichiers[0][0]} ${(fichiers[0][1] / 1024).toFixed(0)} Ko`);
console.log(fichiers.slice(0, 6).map(([f, t]) => `${f} ${(t / 1024).toFixed(0)}Ko`).join(" | "));
