const STORE_KEYS = {
  users: "egyptronix_users",
  session: "egyptronix_session",
  products: "egyptronix_products"
};

const DEFAULT_PRODUCTS = [
  {
    id: "e200",
    name: "TA800 25W EU Plug Charger",
    description: "25W charger with 1m 3A cable and retail packaging.",
    category: "Power System",
    price: "$19.50",
    image: "../TA800 25W.png"
  },
  {
    id: "e201",
    name: "TA845 45W Charger",
    description: "45W charger with 1m 5A cable and retail packaging.",
    category: "Power System",
    price: "$27.50",
    image: "../TA845 45W.png"
  }
];

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function hashValue(input) {
  return btoa(input);
}

function seedData() {
  const users = ensureArray(readJSON(STORE_KEYS.users, []));
  if (!users.length) {
    users.push({
      id: "u_admin",
      name: "System Admin",
      email: "admin@egyptronix.com",
      passwordHash: hashValue("Admin@123"),
      role: "admin"
    });
    writeJSON(STORE_KEYS.users, users);
  }

  const storedProducts = ensureArray(readJSON(STORE_KEYS.products, []));
  const productsById = new Map(storedProducts.map((product) => [product.id, product]));
  let hasChanges = false;

  DEFAULT_PRODUCTS.forEach((product) => {
    const existingProduct = productsById.get(product.id);
    if (!existingProduct) {
      storedProducts.push(product);
      hasChanges = true;
      return;
    }

    const mergedProduct = { ...existingProduct, ...product };
    if (JSON.stringify(mergedProduct) !== JSON.stringify(existingProduct)) {
      Object.assign(existingProduct, product);
      hasChanges = true;
    }
  });

  if (hasChanges || (!storedProducts.length && DEFAULT_PRODUCTS.length)) {
    writeJSON(STORE_KEYS.products, storedProducts.length ? storedProducts : DEFAULT_PRODUCTS);
  }
}

function getSession() {
  return readJSON(STORE_KEYS.session, null);
}

function setSession(user) {
  writeJSON(STORE_KEYS.session, { id: user.id, role: user.role, name: user.name, email: user.email });
}

function clearSession() {
  localStorage.removeItem(STORE_KEYS.session);
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "card product-card";

  const category = document.createElement("p");
  category.className = "pill";
  category.textContent = product.category || "General";

  const title = document.createElement("h3");
  title.textContent = product.name || "Unnamed Product";

  const description = document.createElement("p");
  description.textContent = product.description || "";

  const detailsLink = document.createElement("a");
  detailsLink.className = "btn btn-ghost";
  detailsLink.href = `details.html?id=${product.id}`;
  detailsLink.textContent = "View Details";

  card.appendChild(category);
  card.appendChild(title);
  card.appendChild(description);
  if (product.price) {
    const price = document.createElement("p");
    price.className = "price-note";
    price.textContent = `Price: ${product.price}`;
    card.appendChild(price);
  }
  card.appendChild(detailsLink);
  return card;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) {
    return;
  }
  const products = ensureArray(readJSON(STORE_KEYS.products, []));
  grid.innerHTML = "";

  if (!products.length) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "card product-card";
    emptyCard.innerHTML = "<h3>No products available right now.</h3>";
    grid.appendChild(emptyCard);
    return;
  }

  products.forEach((product) => {
    grid.appendChild(createProductCard(product));
  });
}

function updateAuthUI() {
  const session = getSession();
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminSection = document.getElementById("adminSection");
  if (!loginBtn || !logoutBtn) {
    return;
  }

  if (session) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    if (adminSection) {
      adminSection.classList.toggle("hidden", session.role !== "admin");
    }
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    if (adminSection) {
      adminSection.classList.add("hidden");
    }
  }
}

function showAuthTab(mode) {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");

  if (!loginForm || !registerForm || !tabLogin || !tabRegister) {
    return;
  }

  const isLogin = mode === "login";
  loginForm.classList.toggle("hidden", !isLogin);
  registerForm.classList.toggle("hidden", isLogin);
  tabLogin.classList.toggle("active", isLogin);
  tabRegister.classList.toggle("active", !isLogin);
}

function wireAuthModal() {
  const modal = document.getElementById("authModal");
  const loginBtn = document.getElementById("loginBtn");
  const openRegisterBtn = document.getElementById("openRegisterBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const productForm = document.getElementById("productForm");

  if (!modal) {
    return;
  }

  loginBtn?.addEventListener("click", () => {
    showAuthTab("login");
    modal.showModal();
  });

  openRegisterBtn?.addEventListener("click", () => {
    showAuthTab("register");
    modal.showModal();
  });

  closeModalBtn?.addEventListener("click", () => modal.close());
  tabLogin?.addEventListener("click", () => showAuthTab("login"));
  tabRegister?.addEventListener("click", () => showAuthTab("register"));

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    const users = ensureArray(readJSON(STORE_KEYS.users, []));
    const user = users.find((u) => u.email === email && u.passwordHash === hashValue(password));
    if (!user) {
      alert("Invalid credentials.");
      return;
    }

    setSession(user);
    updateAuthUI();
    modal.close();
    loginForm.reset();
  });

  registerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value;
    const users = ensureArray(readJSON(STORE_KEYS.users, []));
    const exists = users.some((u) => u.email === email);
    if (exists) {
      alert("This email is already registered.");
      return;
    }

    const newUser = {
      id: `u_${Date.now()}`,
      name,
      email,
      passwordHash: hashValue(password),
      role: "customer"
    };

    users.push(newUser);
    writeJSON(STORE_KEYS.users, users);
    setSession(newUser);
    updateAuthUI();
    renderProducts();
    modal.close();
    registerForm.reset();
  });

  logoutBtn?.addEventListener("click", () => {
    clearSession();
    updateAuthUI();
  });

  productForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const session = getSession();
    if (!session || session.role !== "admin") {
      alert("Unauthorized action.");
      return;
    }

    const name = document.getElementById("productName").value.trim();
    const description = document.getElementById("productDesc").value.trim();
    const category = document.getElementById("productCategory").value.trim();

    const products = ensureArray(readJSON(STORE_KEYS.products, []));
    products.push({
      id: `e${Date.now()}`,
      name,
      description,
      category
    });
    writeJSON(STORE_KEYS.products, products);
    renderProducts();
    productForm.reset();
  });
}

function renderDetailsPage() {
  const detailsName = document.getElementById("detailsName");
  const detailsCategory = document.getElementById("detailsCategory");
  const detailsDescription = document.getElementById("detailsDescription");
  const detailsPrice = document.getElementById("detailsPrice");
  const detailsImage = document.getElementById("detailsImage");

  if (!detailsName || !detailsCategory || !detailsDescription || !detailsPrice || !detailsImage) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  const products = ensureArray(readJSON(STORE_KEYS.products, []));
  const product = products.find((p) => p.id === productId);

  if (!product) {
    detailsName.textContent = "Product Not Found";
    detailsCategory.textContent = "Category";
    detailsDescription.textContent = "The selected product is not available.";
    detailsPrice.textContent = "";
    detailsPrice.classList.add("hidden");
    detailsImage.classList.add("hidden");
    return;
  }

  detailsName.textContent = product.name;
  detailsCategory.textContent = product.category;
  detailsDescription.textContent = product.description;
  if (product.image) {
    detailsImage.src = product.image;
    detailsImage.alt = `${product.name} product photo`;
    detailsImage.classList.remove("hidden");
  } else {
    detailsImage.removeAttribute("src");
    detailsImage.alt = "Product photo";
    detailsImage.classList.add("hidden");
  }
  if (product.price) {
    detailsPrice.textContent = `Price: ${product.price}`;
    detailsPrice.classList.remove("hidden");
  } else {
    detailsPrice.textContent = "";
    detailsPrice.classList.add("hidden");
  }
}

function init() {
  seedData();
  renderProducts();
  wireAuthModal();
  updateAuthUI();
  renderDetailsPage();
  const yearNode = document.getElementById("currentYear");
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }
}

document.addEventListener("DOMContentLoaded", init);
