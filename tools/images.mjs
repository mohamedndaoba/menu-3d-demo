// Sort les images d'un modèle 3D pour les alléger, puis les remet dedans.
//   node tools/images.mjs sortir poulet    -> crée tools/tmp/poulet_0.png, ...
//   (on convertit ces images en .jpg plus légers)
//   node tools/images.mjs remettre poulet  -> remet les .jpg dans models/poulet.glb
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [action, nom] = process.argv.slice(2);
const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const chemin = join(racine, "models", nom + ".glb");
const tmp = join(racine, "tools", "tmp");
mkdirSync(tmp, { recursive: true });

const buf = readFileSync(chemin);
const lenJson = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + lenJson).toString("utf8"));
const bin = buf.subarray(20 + lenJson + 8, 20 + lenJson + 8 + buf.readUInt32LE(20 + lenJson));
const octets = (bv) => bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);

if (action === "sortir") {
  (gltf.images || []).forEach((img, i) => {
    const ext = img.mimeType === "image/png" ? "png" : "jpg";
    writeFileSync(join(tmp, `${nom}_${i}.${ext}`), octets(gltf.bufferViews[img.bufferView]));
    console.log(`${nom}_${i}.${ext}`, (gltf.bufferViews[img.bufferView].byteLength / 1e6).toFixed(2), "Mo");
  });
  console.log("matières :", gltf.materials.map((m) => m.alphaMode || "OPAQUE").join(", "));
} else if (action === "remettre") {
  // On reconstruit le bloc binaire : tout est recopié, sauf les images remplacées.
  const morceaux = [];
  let position = 0;
  const remplace = new Map();
  (gltf.images || []).forEach((img, i) => {
    const f = join(tmp, `${nom}_${i}.jpg`);
    if (existsSync(f)) { remplace.set(img.bufferView, readFileSync(f)); img.mimeType = "image/jpeg"; }
  });
  gltf.bufferViews.forEach((bv, i) => {
    const data = remplace.get(i) || octets(bv);
    const pad = (4 - (data.length % 4)) % 4;
    morceaux.push(data, Buffer.alloc(pad));
    bv.byteOffset = position;
    bv.byteLength = data.length;
    position += data.length + pad;
  });
  const corps = Buffer.concat(morceaux);
  gltf.buffers = [{ byteLength: corps.length }];
  let json = Buffer.from(JSON.stringify(gltf), "utf8");
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const tete = Buffer.alloc(12), tj = Buffer.alloc(8), tb = Buffer.alloc(8);
  tete.write("glTF", 0); tete.writeUInt32LE(2, 4); tete.writeUInt32LE(28 + json.length + corps.length, 8);
  tj.writeUInt32LE(json.length, 0); tj.write("JSON", 4);
  tb.writeUInt32LE(corps.length, 0); tb.write("BIN\0", 4);
  writeFileSync(chemin, Buffer.concat([tete, tj, json, tb, corps]));
  console.log(`${nom} : ${(buf.length / 1e6).toFixed(1)} -> ${((28 + json.length + corps.length) / 1e6).toFixed(1)} Mo`);
} else {
  console.log("Action inconnue. Utilisez : sortir ou remettre");
}
