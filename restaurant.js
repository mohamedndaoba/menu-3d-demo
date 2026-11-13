// ─────────────────────────────────────────────────────────────
//  FICHE DU RESTAURANT
//  Pour revendre le site à un autre restaurant : on ne change
//  que ce fichier (nom, WhatsApp, plats, prix) + les modèles 3D.
// ─────────────────────────────────────────────────────────────
window.RESTAURANT = {
  nom: "Le Baobab",
  slogan: "Grill & saveurs",
  devise: "F",
  // Numéro WhatsApp qui reçoit les commandes (format international, sans +).
  // Numéro fictif pour la démo : à remplacer par celui du restaurant.
  whatsapp: "221770000000",

  // Auteurs des modèles 3D à citer (licence Creative Commons Attribution).
  credits: [
    "Poulet rôti : Persio Augusto Torno Suguinoshita (Sketchfab, CC BY)",
    "Tacos : Zoltanfood (Sketchfab, CC BY)",
  ],

  categories: [
    { id: "entrees", nom: "Entrées" },
    { id: "plats", nom: "Plats" },
    { id: "burgers", nom: "Burgers & snacks" },
    { id: "desserts", nom: "Desserts" },
    { id: "boissons", nom: "Boissons" },
  ],

  plats: [
    { id: "salade", cat: "entrees", nom: "Salade fraîcheur", prix: 2500, kcal: 220, minutes: 8, modele: "salad",
      desc: "Salade croquante du jour, crudités et vinaigrette maison." },
    { id: "soupe", cat: "entrees", nom: "Soupe du jour", prix: 2000, kcal: 180, minutes: 5, modele: "bowlSoup",
      desc: "Soupe de légumes mijotée, servie bien chaude." },
    { id: "brochette-legumes", cat: "entrees", nom: "Brochette de légumes", prix: 2000, kcal: 150, minutes: 10, modele: "skewerVegetables",
      desc: "Légumes de saison grillés au feu de bois." },

    { id: "poulet", cat: "plats", nom: "Poulet rôti entier", prix: 9000, kcal: 1400, minutes: 25, modele: "poulet.gltf", photo: "poulet", vedette: true,
      desc: "Poulet fermier rôti doré, à partager à 2 ou 3. Servi avec pommes de terre." },
    { id: "tajine", cat: "plats", nom: "Tajine maison", prix: 6500, kcal: 640, minutes: 20, modele: "tajine",
      desc: "Mijoté longuement aux épices douces, servi dans son plat." },
    { id: "pizza", cat: "plats", nom: "Pizza Margherita", prix: 5000, kcal: 820, minutes: 15, modele: "pizza",
      desc: "Pâte fine, sauce tomate, mozzarella fondante. 30 cm." },
    { id: "tacos", cat: "plats", nom: "Tacos garnis", prix: 3500, kcal: 520, minutes: 10, modele: "tacos.gltf", photo: "tacos", vedette: true,
      desc: "Deux tacos garnis de viande, oignons et crudités, servis sur planche avec citron vert." },

    { id: "burger", cat: "burgers", nom: "Burger classique", prix: 3500, kcal: 560, minutes: 12, modele: "burger", vedette: true,
      desc: "Steak grillé, salade, tomate et sauce maison dans un pain brioché." },
    { id: "double-cheese", cat: "burgers", nom: "Double cheese", prix: 4500, kcal: 780, minutes: 12, modele: "burgerCheeseDouble",
      desc: "Deux steaks, double fromage fondu. Pour les grosses faims." },
    { id: "hot-dog", cat: "burgers", nom: "Hot-dog", prix: 2500, kcal: 390, minutes: 8, modele: "hotDog",
      desc: "Saucisse grillée, pain moelleux, moutarde et ketchup." },
    { id: "sandwich", cat: "burgers", nom: "Sandwich baguette", prix: 3000, kcal: 520, minutes: 8, modele: "sub",
      desc: "Baguette garnie, crudités fraîches et sauce au choix." },
    { id: "frites", cat: "burgers", nom: "Frites maison", prix: 1500, kcal: 310, minutes: 6, modele: "fries",
      desc: "Frites dorées et croustillantes, coupées sur place." },

    { id: "pancakes", cat: "desserts", nom: "Pancakes au sirop", prix: 2500, kcal: 430, minutes: 8, modele: "pancakes",
      desc: "Pile de pancakes moelleux, beurre et sirop." },
    { id: "coupe-glacee", cat: "desserts", nom: "Coupe glacée", prix: 2500, kcal: 350, minutes: 4, modele: "sundae",
      desc: "Glace, chantilly et coulis, servie en coupe." },
    { id: "donut", cat: "desserts", nom: "Donut glacé", prix: 1000, kcal: 260, minutes: 2, modele: "donutSprinkles",
      desc: "Donut moelleux, glaçage et vermicelles colorés." },
    { id: "gateau", cat: "desserts", nom: "Gâteau du chef", prix: 2000, kcal: 380, minutes: 3, modele: "cake",
      desc: "La part de gâteau du jour, faite maison." },

    { id: "soda", cat: "boissons", nom: "Soda bien frais", prix: 1000, kcal: 140, minutes: 1, modele: "soda",
      desc: "Au choix, servi avec glaçons." },
    { id: "frappe", cat: "boissons", nom: "Café frappé", prix: 2000, kcal: 210, minutes: 4, modele: "frappe",
      desc: "Café glacé mixé, chantilly." },
    { id: "cocktail", cat: "boissons", nom: "Cocktail de fruits", prix: 2500, kcal: 160, minutes: 4, modele: "cocktail",
      desc: "Jus de fruits frais pressés, sans alcool." },
  ],
};
