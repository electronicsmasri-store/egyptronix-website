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
    image: "TA800-25W.png"
  },
  {
    id: "e201",
    name: "TA845 45W Charger",
    description: "45W charger with 1m 5A cable and retail packaging.",
    category: "Power System",
    price: "$27.50",
    image: "TA845-45W.png"
  }
];

const IMAGE_VALIDITY_CACHE = new Map();
const IMAGE_CHECK_TIMEOUT_MS = 4000;
const WHATSAPP_PHONE = "96176086829";
const BRAND_LOGO_FALLBACK = "Logo.png";
const WHATSAPP_CONTACT_MESSAGE = "Hello Egeptronix Masri, I am interested in your Web Systems and Power Solutions";
const TIKTOK_HANDLE = "@EgeptronixMasri";
const SOCIAL_LINKS = {
  facebook: {
    web: "https://www.facebook.com/EgeptronixMasri",
    app: "fb://facewebmodal/f?href=https%3A%2F%2Fwww.facebook.com%2FEgeptronixMasri"
  },
  tiktok: {
    web: `https://www.tiktok.com/${TIKTOK_HANDLE}`,
    app: `snssdk1233://user/profile/${encodeURIComponent(TIKTOK_HANDLE)}`
  }
};
const PRODUCT_VIDEO_PREVIEWS = {
  e201: {
    title: "TA845 45W Charger Review",
    description:
      "Watch the TA845 unboxing and performance walkthrough, including energy-efficiency observations in real use.",
    url: "https://www.tiktok.com/@egyptronix/video/7458454500000000000"
  }
};

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

function normalizeProductImagePath(imagePath) {
  const value = String(imagePath || "").trim();
  if (!value) {
    return "";
  }

  const knownPaths = new Map([
    ["../TA800 25W.png", "TA800-25W.png"],
    ["TA800 25W.png", "TA800-25W.png"],
    ["../TA845 45W.png", "TA845-45W.png"],
    ["TA845 45W.png", "TA845-45W.png"]
  ]);

  return knownPaths.get(value) || value;
}

function buildEgyptronixPlaceholderSvg(label = "Image unavailable") {
  const safeLabel = String(label || "Image unavailable").slice(0, 48);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960" role="img" aria-label="Egyptronix Placeholder">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1e33"/>
      <stop offset="100%" stop-color="#081120"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#18c1bf"/>
      <stop offset="100%" stop-color="#ffd166"/>
    </linearGradient>
  </defs>
  <rect width="960" height="960" rx="64" fill="url(#bg)"/>
  <rect x="72" y="72" width="816" height="816" rx="48" fill="none" stroke="url(#line)" stroke-width="8" opacity="0.85"/>
  <g transform="translate(480 380)">
    <rect x="-110" y="-92" width="220" height="184" rx="22" fill="none" stroke="#18c1bf" stroke-width="16"/>
    <path d="M-170 0h58M112 0h58M0 -150v56M0 96v56" stroke="#ffd166" stroke-width="14" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="26" fill="#18c1bf"/>
  </g>
  <text x="50%" y="610" text-anchor="middle" fill="#e9f0ff" font-family="Manrope, Arial, sans-serif" font-size="54" font-weight="700">EGYPTRONIX</text>
  <text x="50%" y="680" text-anchor="middle" fill="#a9b7cc" font-family="Manrope, Arial, sans-serif" font-size="34">${safeLabel}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

function probeImage(url, timeoutMs = IMAGE_CHECK_TIMEOUT_MS) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    if (String(url).startsWith("data:image/")) {
      resolve(true);
      return;
    }

    let settled = false;
    const probe = new Image();

    const finalize = (isValid) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(isValid);
    };

    const timer = setTimeout(() => finalize(false), timeoutMs);
    probe.onload = () => finalize(true);
    probe.onerror = () => finalize(false);
    probe.src = url;
  });
}

async function isImageValid(url) {
  const normalized = String(url || "").trim();
  if (!normalized) {
    return false;
  }
  if (IMAGE_VALIDITY_CACHE.has(normalized)) {
    return IMAGE_VALIDITY_CACHE.get(normalized);
  }
  const valid = await probeImage(normalized);
  IMAGE_VALIDITY_CACHE.set(normalized, valid);
  return valid;
}

function setImageSourceWithFade(imageEl, src) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      imageEl.classList.remove("is-loading");
      imageEl.classList.add("is-loaded");
      resolve();
    };

    imageEl.addEventListener("load", finish, { once: true });
    imageEl.src = src;

    if (imageEl.complete && imageEl.naturalWidth > 0) {
      requestAnimationFrame(finish);
    }
  });
}

async function renderSafeProductImage(imageEl, imagePath, options = {}) {
  if (!imageEl) {
    return;
  }

  const requestToken = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  imageEl.dataset.requestToken = requestToken;
  imageEl.loading = "lazy";
  imageEl.decoding = "async";
  imageEl.classList.add("is-loading");
  imageEl.classList.remove("is-loaded");
  imageEl.classList.remove("hidden");

  const fallbackClass = options.fallbackClass || "";
  if (fallbackClass) {
    imageEl.classList.remove(fallbackClass);
  }

  const normalizedPath = normalizeProductImagePath(imagePath);
  const placeholderLabel = options.placeholderLabel || "Image unavailable";
  const placeholderImage = buildEgyptronixPlaceholderSvg(placeholderLabel);
  const fallbackCandidate = options.fallbackSrc || BRAND_LOGO_FALLBACK;
  const [validPrimaryImage, validFallbackImage] = await Promise.all([
    isImageValid(normalizedPath),
    isImageValid(fallbackCandidate)
  ]);

  if (imageEl.dataset.requestToken !== requestToken) {
    return;
  }

  const fallbackImage = validFallbackImage ? fallbackCandidate : placeholderImage;
  const useFallback = !validPrimaryImage;
  const finalSrc = useFallback ? fallbackImage : normalizedPath;
  imageEl.alt = useFallback
    ? (options.fallbackAlt || "Egyptronix logo fallback image")
    : (options.alt || "Egyptronix product image");
  imageEl.title = useFallback
    ? (options.fallbackTitle || "Egyptronix logo fallback image")
    : (options.title || "Egyptronix product image");

  if (fallbackClass) {
    imageEl.classList.toggle(fallbackClass, useFallback);
  }

  await setImageSourceWithFade(imageEl, finalSrc);
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

function getAllProducts() {
  const storedProducts = ensureArray(readJSON(STORE_KEYS.products, []));
  return storedProducts.length ? storedProducts : DEFAULT_PRODUCTS;
}

function resolveProductNameFromContext() {
  const params = new URLSearchParams(window.location.search);
  const explicitName = params.get("product");
  if (explicitName && explicitName.trim()) {
    return explicitName.trim();
  }

  const productId = params.get("id");
  if (!productId) {
    return "[Product Name]";
  }

  const products = getAllProducts();
  const matchedProduct = products.find((product) => product.id === productId);
  return matchedProduct?.name || "[Product Name]";
}

function openWebLink(url) {
  if (!url) {
    return;
  }
  const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!openedWindow) {
    window.location.href = url;
  }
}

function openSocialWithFallback(appUrl, webUrl) {
  if (!appUrl) {
    openWebLink(webUrl);
    return;
  }

  let appOpened = false;
  const onVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  try {
    const deepLinkFrame = document.createElement("iframe");
    deepLinkFrame.setAttribute("aria-hidden", "true");
    deepLinkFrame.tabIndex = -1;
    deepLinkFrame.style.display = "none";
    deepLinkFrame.src = appUrl;
    document.body.appendChild(deepLinkFrame);

    window.setTimeout(() => {
      deepLinkFrame.remove();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (!appOpened) {
        openWebLink(webUrl);
      }
    }, 900);
  } catch (_) {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    openWebLink(webUrl);
  }
}

function setupSocialLinks() {
  const socialAnchors = document.querySelectorAll("[data-social-link]");
  if (!socialAnchors.length) {
    return;
  }

  socialAnchors.forEach((anchor) => {
    const platform = anchor.dataset.socialLink;
    const config = SOCIAL_LINKS[platform];
    if (!config) {
      return;
    }

    anchor.href = config.web;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      openSocialWithFallback(config.app, config.web);
    });
  });
}

function setupContactSection() {
  const whatsAppLinks = document.querySelectorAll("[data-whatsapp-link]");
  if (!whatsAppLinks.length) {
    return;
  }

  const whatsAppUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_CONTACT_MESSAGE)}`;

  whatsAppLinks.forEach((link) => {
    link.href = whatsAppUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  const hint = document.getElementById("whatsAppHint");
  if (hint) {
    hint.textContent = "Tap WhatsApp to contact Egeptronix Masri directly about Web Systems and Power Solutions.";
  }
}

function updateVideoPreviewCard(product) {
  const card = document.getElementById("videoPreviewCard");
  const title = document.getElementById("videoPreviewTitle");
  const description = document.getElementById("videoPreviewDescription");
  const link = document.getElementById("videoPreviewLink");

  if (!card || !title || !description || !link) {
    return;
  }

  const preview = product ? PRODUCT_VIDEO_PREVIEWS[product.id] : null;
  if (!preview) {
    card.classList.remove("is-visible");
    card.setAttribute("aria-hidden", "true");
    return;
  }

  title.textContent = preview.title;
  description.textContent = preview.description;
  link.href = preview.url;
  card.classList.add("is-visible");
  card.setAttribute("aria-hidden", "false");
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

  const productMedia = document.createElement("div");
  productMedia.className = "product-media";

  const productImage = document.createElement("img");
  productImage.className = "product-image";
  productMedia.appendChild(productImage);

  const safeProductName = product.name || "Egyptronix Product";
  void renderSafeProductImage(productImage, product.image, {
    alt: `${safeProductName} product photo`,
    title: `${safeProductName} | Egyptronix`,
    fallbackAlt: "Egyptronix logo fallback image",
    fallbackTitle: "Egyptronix logo fallback image",
    fallbackSrc: BRAND_LOGO_FALLBACK,
    placeholderLabel: safeProductName,
    fallbackClass: "product-image--fallback"
  });

  const detailsLink = document.createElement("a");
  detailsLink.className = "btn btn-ghost";
  detailsLink.href = `details.html?id=${product.id}`;
  detailsLink.textContent = "View Details";

  card.appendChild(category);
  card.appendChild(title);
  card.appendChild(productMedia);
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
    updateVideoPreviewCard(null);
    return;
  }

  detailsName.textContent = product.name;
  detailsCategory.textContent = product.category;
  detailsDescription.textContent = product.description;
  const safeProductName = product.name || "Egyptronix Product";
  void renderSafeProductImage(detailsImage, product.image, {
    alt: `${safeProductName} product photo`,
    title: `${safeProductName} | Egyptronix`,
    fallbackAlt: "Egyptronix logo fallback image",
    fallbackTitle: "Egyptronix logo fallback image",
    fallbackSrc: BRAND_LOGO_FALLBACK,
    placeholderLabel: safeProductName,
    fallbackClass: "details-product-image--fallback"
  });

  if (product.price) {
    detailsPrice.textContent = `Price: ${product.price}`;
    detailsPrice.classList.remove("hidden");
  } else {
    detailsPrice.textContent = "";
    detailsPrice.classList.add("hidden");
  }

  updateVideoPreviewCard(product);
}

function init() {
  seedData();
  setupSocialLinks();
  setupContactSection();
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


