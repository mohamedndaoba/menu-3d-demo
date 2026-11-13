// Allège un modèle 3D trop lourd pour le téléphone : fusionne les points très
// proches (le détail reste dans l'image plaquée dessus) et retire les données
// inutiles. À utiliser sur les scans de plats réels.
// Usage : node tools/alleger.mjs tacos 200   (200 = finesse ; plus petit = plus léger)
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [nom, finesseTxt] = process.argv.slice(2);
if (!nom) { console.log("Ex. : node tools/alleger.mjs tacos 200"); process.exit(1); }
const FINESSE = Number(finesseTxt || 200);
const chemin = join(dirname(fileURLToPath(import.meta.url)), "..", "models", nom + ".glb");

const buf = readFileSync(chemin);
const lenJson = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + lenJson).toString("utf8"));
const bin = buf.subarray(20 + lenJson + 8, 20 + lenJson + 8 + buf.readUInt32LE(20 + lenJson));

const NB = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const LIRE = {
  5120: [1, (d, o) => d.getInt8(o)], 5121: [1, (d, o) => d.getUint8(o)],
  5122: [2, (d, o) => d.getInt16(o, true)], 5123: [2, (d, o) => d.getUint16(o, true)],
  5125: [4, (d, o) => d.getUint32(o, true)], 5126: [4, (d, o) => d.getFloat32(o, true)],
};
function lire(i) {
  const a = gltf.accessors[i], bv = gltf.bufferViews[a.bufferView];
  const n = NB[a.type], [taille, f] = LIRE[a.componentType];
  const pas = bv.byteStride || n * taille;
  const dv = new DataView(bin.buffer, bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0));
  const div = a.normalized ? { 5121: 255, 5123: 65535 }[a.componentType] || 1 : 1;
  const out = new Float64Array(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = f(dv, k * pas + c * taille) / div;
  return out;
}

const morceaux = []; // nouveaux blocs binaires
const vues = [], acces = [];
let position = 0;
function ajouter(octets, cible) {
  const pad = (4 - (octets.length % 4)) % 4;
  vues.push({ buffer: 0, byteOffset: position, byteLength: octets.length, ...(cible ? { target: cible } : {}) });
  morceaux.push(octets, Buffer.alloc(pad));
  position += octets.length + pad;
  return vues.length - 1;
}

let avant = 0, apres = 0;
for (const mesh of gltf.meshes) {
  for (const prim of mesh.primitives) {
    const pos = lire(prim.attributes.POSITION);
    const uv = prim.attributes.TEXCOORD_0 !== undefined ? lire(prim.attributes.TEXCOORD_0) : null;
    const nv = pos.length / 3;
    const idx = prim.indices !== undefined ? lire(prim.indices) : Float64Array.from({ length: nv }, (_, k) => k);
    avant += idx.length / 3;

    const pa = gltf.accessors[prim.attributes.POSITION];
    const cellule = Math.max(pa.max[0] - pa.min[0], pa.max[1] - pa.min[1], pa.max[2] - pa.min[2]) / FINESSE;

    // Un point représentant par petite case de l'espace (et par zone d'image).
    const cases = new Map(), nouveau = new Int32Array(nv), P = [], U = [];
    for (let v = 0; v < nv; v++) {
      const cle =
        Math.floor((pos[v * 3] - pa.min[0]) / cellule) + "," +
        Math.floor((pos[v * 3 + 1] - pa.min[1]) / cellule) + "," +
        Math.floor((pos[v * 3 + 2] - pa.min[2]) / cellule) +
        (uv ? "," + Math.floor(uv[v * 2] * 24) + "," + Math.floor(uv[v * 2 + 1] * 24) : "");
      let r = cases.get(cle);
      if (r === undefined) {
        r = P.length / 3;
        cases.set(cle, r);
        P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        if (uv) U.push(uv[v * 2], uv[v * 2 + 1]);
      }
      nouveau[v] = r;
    }
    const I = [];
    for (let t = 0; t < idx.length; t += 3) {
      const a = nouveau[idx[t]], b = nouveau[idx[t + 1]], c = nouveau[idx[t + 2]];
      if (a !== b && b !== c && a !== c) I.push(a, b, c);
    }
    apres += I.length / 3;

    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < P.length; k++) { min[k % 3] = Math.min(min[k % 3], Math.fround(P[k])); max[k % 3] = Math.max(max[k % 3], Math.fround(P[k])); }

    const attrs = {};
    acces.push({ bufferView: ajouter(Buffer.from(new Float32Array(P).buffer), 34962), componentType: 5126, count: P.length / 3, type: "VEC3", min, max });
    attrs.POSITION = acces.length - 1;
    if (uv) {
      acces.push({ bufferView: ajouter(Buffer.from(new Float32Array(U).buffer), 34962), componentType: 5126, count: U.length / 2, type: "VEC2" });
      attrs.TEXCOORD_0 = acces.length - 1;
    }
    const petit = P.length / 3 < 65536;
    const octetsI = Buffer.from((petit ? new Uint16Array(I) : new Uint32Array(I)).buffer);
    acces.push({ bufferView: ajouter(octetsI, 34963), componentType: petit ? 5123 : 5125, count: I.length, type: "SCALAR" });
    prim.attributes = attrs;
    prim.indices = acces.length - 1;
    delete prim.targets;
  }
}

// Les images sont recopiées telles quelles.
for (const img of gltf.images || []) {
  if (img.bufferView === undefined) continue;
  const bv = gltf.bufferViews[img.bufferView];
  img.bufferView = ajouter(Buffer.from(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)));
}

const corps = Buffer.concat(morceaux);
gltf.accessors = acces;
gltf.bufferViews = vues;
gltf.buffers = [{ byteLength: corps.length }];
delete gltf.animations; delete gltf.skins;

let json = Buffer.from(JSON.stringify(gltf), "utf8");
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const tete = Buffer.alloc(12), tj = Buffer.alloc(8), tb = Buffer.alloc(8);
tete.write("glTF", 0); tete.writeUInt32LE(2, 4); tete.writeUInt32LE(12 + 8 + json.length + 8 + corps.length, 8);
tj.writeUInt32LE(json.length, 0); tj.write("JSON", 4);
tb.writeUInt32LE(corps.length, 0); tb.write("BIN\0", 4);
writeFileSync(chemin, Buffer.concat([tete, tj, json, tb, corps]));
console.log(`${nom} : ${avant} -> ${apres} triangles, ${(buf.length / 1e6).toFixed(1)} -> ${((12 + 16 + json.length + corps.length) / 1e6).toFixed(1)} Mo`);
