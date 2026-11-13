// Met chaque modèle 3D à sa taille réelle (en mètres) pour que le plat
// apparaisse à la bonne dimension sur la table en réalité augmentée.
// Usage : node tools/echelle.mjs poulet tacos   (noms des fichiers dans models/, sans .glb)
// À lancer une seule fois par nouveau modèle.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DOSSIER = join(dirname(fileURLToPath(import.meta.url)), "..", "models");

// Plus grande dimension voulue, en mètres.
const TAILLES = {
  salad: 0.2, skewerVegetables: 0.22, bowlSoup: 0.17,
  burger: 0.12, burgerCheeseDouble: 0.13, fries: 0.12,
  pizza: 0.3, taco: 0.16, hotDog: 0.18, sub: 0.24,
  turkey: 0.3, tajine: 0.28,
  pancakes: 0.18, sundae: 0.16, donutSprinkles: 0.1, cake: 0.22,
  soda: 0.14, frappe: 0.16, cocktail: 0.17,
  poulet: 0.34, tacos: 0.38,
};

const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const matriceLocale = (n) => {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
};

function boite(gltf) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const visiter = (i, parent) => {
    const n = gltf.nodes[i];
    const m = mul(parent, matriceLocale(n));
    if (n.mesh !== undefined)
      for (const p of gltf.meshes[n.mesh].primitives) {
        const a = gltf.accessors[p.attributes.POSITION];
        for (let c = 0; c < 8; c++) {
          const v = [c & 1 ? a.max[0] : a.min[0], c & 2 ? a.max[1] : a.min[1], c & 4 ? a.max[2] : a.min[2]];
          for (let d = 0; d < 3; d++) {
            const w = m[d] * v[0] + m[4 + d] * v[1] + m[8 + d] * v[2] + m[12 + d];
            min[d] = Math.min(min[d], w); max[d] = Math.max(max[d], w);
          }
        }
      }
    (n.children || []).forEach((c) => visiter(c, m));
  };
  gltf.scenes[gltf.scene ?? 0].nodes.forEach((i) => visiter(i, IDENT));
  return max.map((v, d) => v - min[d]);
}

const demandes = process.argv.slice(2);
if (!demandes.length) { console.log("Indiquez les modèles à traiter, ex. : node tools/echelle.mjs poulet tacos"); process.exit(1); }

for (const nom of demandes) {
  const cible = TAILLES[nom];
  if (!cible) { console.log(nom, ": taille inconnue, ajoutez-la dans TAILLES"); continue; }
  const chemin = join(DOSSIER, nom + ".glb");
  const buf = readFileSync(chemin);
  const lenJson = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + lenJson).toString("utf8"));
  const reste = buf.subarray(20 + lenJson);

  const dims = boite(gltf);
  const f = cible / Math.max(...dims);
  const scene = gltf.scenes[gltf.scene ?? 0];
  gltf.nodes.push({ name: "taille_reelle", scale: [f, f, f], children: scene.nodes });
  scene.nodes = [gltf.nodes.length - 1];

  let json = Buffer.from(JSON.stringify(gltf), "utf8");
  const pad = (4 - (json.length % 4)) % 4;
  json = Buffer.concat([json, Buffer.alloc(pad, 0x20)]);
  const tete = Buffer.alloc(20);
  tete.write("glTF", 0); tete.writeUInt32LE(2, 4);
  tete.writeUInt32LE(20 + json.length + reste.length, 8);
  tete.writeUInt32LE(json.length, 12); tete.write("JSON", 16);
  writeFileSync(chemin, Buffer.concat([tete, json, reste]));
  console.log(nom.padEnd(20), dims.map((d) => d.toFixed(2)).join(" x "), "->", (cible * 100).toFixed(0) + " cm");
}
