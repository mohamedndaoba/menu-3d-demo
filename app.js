(() => {
  const R = window.RESTAURANT;
  const $ = (id) => document.getElementById(id);
  const fcfa = (n) => n.toLocaleString("fr-FR").replace(/\s/g, " ") + " " + R.devise;
  // Un modèle est un fichier .glb, sauf si la fiche précise une autre extension (ex. "poulet.gltf").
  const modele = (p) => "models/" + (p.modele.includes(".") ? p.modele : p.modele + ".glb");
  const table = new URLSearchParams(location.search).get("table");

  let categorie = "tout";
  let filtre = "";
  let platOuvert = null;
  let quantite = 1;
  const panier = new Map(); // id du plat -> quantité

  // ── En-tête ──────────────────────────────
  const h = new Date().getHours();
  $("salut").textContent = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  $("nom-restau").textContent = R.nom;
  $("slogan").textContent = R.slogan;
  $("table").textContent = table ? `Table ${table}` : "";
  document.title = `${R.nom} · Menu 3D`;

  // ── Catégories ───────────────────────────
  const cats = [{ id: "tout", nom: "Tout" }, ...R.categories];
  $("categories").innerHTML = cats
    .map((c) => `<button class="cat" data-cat="${c.id}" aria-pressed="${c.id === categorie}">${c.nom}</button>`)
    .join("");
  $("categories").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    categorie = b.dataset.cat;
    document.querySelectorAll(".cat").forEach((x) => x.setAttribute("aria-pressed", x === b));
    afficherListe();
    window.scrollTo({ top: $("categories").offsetTop - 1 });
  });

  $("recherche").addEventListener("input", (e) => {
    filtre = e.target.value.trim().toLowerCase();
    afficherListe();
  });

  // ── Liste ────────────────────────────────
  const sansAccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  function carte(p) {
    return `
      <article class="carte">
        ${p.vedette ? '<span class="badge">Vedette</span>' : ""}
        <span class="badge-3d">3D</span>
        <button class="carte-zone" data-plat="${p.id}" aria-label="${p.nom}, ${fcfa(p.prix)}">
          <div class="carte-vue">
            ${p.photo
              ? `<img src="photos/${p.photo}.jpg" alt="" loading="lazy" >`
              : `<model-viewer src="${modele(p)}" alt="" loading="lazy" interaction-prompt="none"
              environment-image="neutral" exposure="0.85" shadow-intensity="1"
              camera-orbit="30deg 62deg auto" disable-zoom disable-pan disable-tap></model-viewer>`}
          </div>
          <div class="carte-texte">
            <p class="carte-nom">${p.nom}</p>
            <p class="carte-prix">${fcfa(p.prix)}</p>
          </div>
        </button>
        <button class="carte-plus" data-ajout="${p.id}" aria-label="Ajouter ${p.nom} à la commande"><span>+</span></button>
      </article>`;
  }

  function afficherListe() {
    const f = sansAccent(filtre);
    const blocs = R.categories
      .filter((c) => categorie === "tout" || c.id === categorie)
      .map((c) => {
        const plats = R.plats.filter((p) => p.cat === c.id && (!f || sansAccent(p.nom + " " + p.desc).includes(f)));
        if (!plats.length) return "";
        return `<h2 class="section-titre">${c.nom}</h2><div class="grille">${plats.map(carte).join("")}</div>`;
      })
      .join("");
    $("liste").innerHTML = blocs || '<p class="vide">Aucun plat trouvé. Essayez un autre mot.</p>';
  }

  $("liste").addEventListener("click", (e) => {
    const ajout = e.target.closest("[data-ajout]");
    if (ajout) return ajouter(ajout.dataset.ajout, 1);
    const plat = e.target.closest("[data-plat]");
    if (plat) ouvrirPlat(plat.dataset.plat);
  });

  // ── Feuilles ─────────────────────────────
  function ouvrir(id) {
    $(id).hidden = false;
    document.body.style.overflow = "hidden";
    $(id).querySelector("[data-fermer]").focus();
  }
  function fermerTout() {
    document.querySelectorAll(".voile").forEach((v) => (v.hidden = true));
    document.body.style.overflow = "";
  }
  document.querySelectorAll(".voile").forEach((v) =>
    v.addEventListener("click", (e) => {
      if (e.target === v || e.target.closest("[data-fermer]")) fermerTout();
    })
  );
  document.addEventListener("keydown", (e) => e.key === "Escape" && fermerTout());

  // ── Fiche plat ───────────────────────────
  const vue = $("vue3d");

  function majBoutonAjout() {
    $("qte").textContent = quantite;
    $("ajouter").textContent = `Ajouter · ${fcfa(platOuvert.prix * quantite)}`;
  }

  function ouvrirPlat(id) {
    platOuvert = R.plats.find((p) => p.id === id);
    quantite = 1;
    vue.src = modele(platOuvert);
    vue.alt = `${platOuvert.nom} en 3D`;
    $("plat-nom").textContent = platOuvert.nom;
    $("plat-prix").textContent = fcfa(platOuvert.prix);
    $("plat-desc").textContent = platOuvert.desc;
    $("plat-puces").innerHTML = `<li>${platOuvert.kcal} kcal</li><li>Prêt en ${platOuvert.minutes} min</li>`;
    $("astuce").classList.remove("cache");
    majBoutonAjout();
    ouvrir("voile-plat");
  }

  // Sur ordinateur, la réalité augmentée n'existe pas : on l'explique.
  vue.addEventListener("load", () => ($("note-ar").hidden = vue.canActivateAR));
  vue.addEventListener("camera-change", (e) => {
    if (e.detail.source === "user-interaction") $("astuce").classList.add("cache");
  });

  $("moins").addEventListener("click", () => { quantite = Math.max(1, quantite - 1); majBoutonAjout(); });
  $("plus").addEventListener("click", () => { quantite = Math.min(20, quantite + 1); majBoutonAjout(); });
  $("ajouter").addEventListener("click", () => { ajouter(platOuvert.id, quantite); fermerTout(); });

  // ── Commande ─────────────────────────────
  function ajouter(id, n) {
    const q = (panier.get(id) || 0) + n;
    if (q <= 0) panier.delete(id);
    else panier.set(id, Math.min(q, 20));
    majPanier();
  }

  function majPanier() {
    let nb = 0, total = 0;
    const lignes = [];
    for (const [id, q] of panier) {
      const p = R.plats.find((x) => x.id === id);
      nb += q;
      total += p.prix * q;
      lignes.push(`
        <li class="ligne">
          <span class="ligne-nom">${p.nom}<small>${fcfa(p.prix * q)}</small></span>
          <span class="quantite" role="group" aria-label="Quantité de ${p.nom}">
            <button data-q="-1" data-id="${id}" aria-label="Moins">−</button>
            <output>${q}</output>
            <button data-q="1" data-id="${id}" aria-label="Plus">+</button>
          </span>
        </li>`);
    }
    $("barre-panier").hidden = nb === 0;
    $("barre-nb").textContent = nb;
    $("barre-total").textContent = fcfa(total);
    $("lignes").innerHTML = lignes.join("");
    $("total").textContent = fcfa(total);

    const texte = [
      `Bonjour ${R.nom}, je souhaite commander :`,
      ...[...panier].map(([id, q]) => {
        const p = R.plats.find((x) => x.id === id);
        return `• ${q} × ${p.nom} (${fcfa(p.prix * q)})`;
      }),
      `Total : ${fcfa(total)}`,
      table ? `Table ${table}` : "",
    ].filter(Boolean).join("\n");
    $("commander").href = `https://wa.me/${R.whatsapp}?text=${encodeURIComponent(texte)}`;

    if (nb === 0 && !$("voile-panier").hidden) fermerTout();
  }

  $("barre-panier").addEventListener("click", () => ouvrir("voile-panier"));
  $("lignes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]");
    if (b) ajouter(b.dataset.id, Number(b.dataset.q));
  });

  // ── QR code ──────────────────────────────
  $("ouvrir-qr").addEventListener("click", () => {
    const lien = location.origin + location.pathname + location.search;
    const qr = qrcode(0, "M");
    qr.addData(lien);
    qr.make();
    $("qr").innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    $("qr-lien").textContent = lien;
    ouvrir("voile-qr");
  });

  $("credits").textContent = (R.credits || []).length ? "Modèles 3D — " + R.credits.join(" · ") : "";

  afficherListe();
})();
