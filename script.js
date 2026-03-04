const STORE_KEYS = {
  users: "egyptronix_users",
  session: "egyptronix_session",
  products: "egyptronix_products",
  cart: "egyptronix_cart",
  inquiries: "egyptronix_inquiries"
};

const DEFAULT_PRODUCTS = [
  {
    id: "e200",
    name: "TA800-25W EU Charger",
    description: "25W super-fast EU charger with 1m 3A cable and retail packaging.",
    category: "Power System",
    price: "$19.50",
    image: "TA800-25W.png"
  },
  {
    id: "e201",
    name: "TA845-45W EU Charger",
    description: "45W super-fast EU charger with 1m 5A cable and retail packaging.",
    category: "Power System",
    price: "$27.50",
    image: "TA845-45W.png"
  }
];

const IMAGE_VALIDITY_CACHE = new Map();
const IMAGE_CHECK_TIMEOUT_MS = 4000;
const WHATSAPP_PHONE = "96176086829";
const ORDER_EMAIL = "muhammadmasri641@gmail.com";
const BRAND_LOGO_FALLBACK = "Logo.png";
const WHATSAPP_CONTACT_MESSAGE = "Hello Egeptronix Masri, I am interested in your Web Systems and Power Solutions";
const FACEBOOK_PROFILE_URL = "https://www.facebook.com/EgeptronixMasri";
const TIKTOK_PROFILE_URL = "https://www.tiktok.com/@masrielectronics8";
const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/egyptronix";
const SOCIAL_LINKS = {
  facebook: {
    web: FACEBOOK_PROFILE_URL
  },
  tiktok: {
    web: TIKTOK_PROFILE_URL
  },
  instagram: {
    web: INSTAGRAM_PROFILE_URL
  }
};
let activeModalProduct = null;
const DEFAULT_MODAL_SELECTIONS = Object.freeze({ color: "Black", socket: "EU" });
let activeModalSelections = { ...DEFAULT_MODAL_SELECTIONS };
const CHARGER_WATTAGE_OPTIONS = ["25W", "45W"];
let activeModalWattageProducts = {};
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
    let settled = false;
    const finalize = (isLoaded) => {
      if (settled) {
        return;
      }
      settled = true;
      imageEl.classList.remove("is-loading");
      imageEl.classList.add("is-loaded");
      resolve(isLoaded);
    };
    const onLoad = () => finalize(true);
    const onError = () => finalize(false);

    imageEl.addEventListener("load", onLoad, { once: true });
    imageEl.addEventListener("error", onError, { once: true });
    imageEl.src = src;

    if (imageEl.complete) {
      requestAnimationFrame(() => {
        if (imageEl.naturalWidth > 0) {
          onLoad();
          return;
        }
        onError();
      });
    }
  });
}

function applyStandardFitMode(imageEl, fitMode = "auto") {
  if (!imageEl) {
    return;
  }

  imageEl.classList.add("standard-fit-image");
  imageEl.classList.remove("standard-fit--cover");
  imageEl.classList.remove("standard-fit--contain");

  let resolvedMode = fitMode;
  if (fitMode === "auto") {
    const naturalWidth = Number(imageEl.naturalWidth || 0);
    const naturalHeight = Number(imageEl.naturalHeight || 0);
    if (!naturalWidth || !naturalHeight) {
      resolvedMode = "contain";
    } else {
      const ratio = naturalWidth / naturalHeight;
      resolvedMode = ratio > 1.2 || ratio < 0.82 ? "contain" : "cover";
    }
  }

  if (resolvedMode !== "contain" && resolvedMode !== "cover") {
    resolvedMode = "contain";
  }
  imageEl.classList.add(resolvedMode === "cover" ? "standard-fit--cover" : "standard-fit--contain");
}

function resolveImageMeta(isFallback, options = {}) {
  return {
    alt: isFallback
      ? (options.fallbackAlt || "Egyptronix logo fallback image")
      : (options.alt || "Egyptronix product image"),
    title: isFallback
      ? (options.fallbackTitle || "Egyptronix logo fallback image")
      : (options.title || "Egyptronix product image")
  };
}

function applyImageMeta(imageEl, isFallback, options = {}) {
  if (!imageEl) {
    return;
  }
  const imageMeta = resolveImageMeta(isFallback, options);
  imageEl.alt = imageMeta.alt;
  imageEl.title = imageMeta.title;
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
  imageEl.classList.remove("standard-fit--cover");
  imageEl.classList.remove("standard-fit--contain");

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
  applyImageMeta(imageEl, useFallback, options);

  if (fallbackClass) {
    imageEl.classList.toggle(fallbackClass, useFallback);
  }

  const imageLoaded = await setImageSourceWithFade(imageEl, finalSrc);
  if (imageEl.dataset.requestToken !== requestToken) {
    return;
  }

  if (!imageLoaded) {
    if (fallbackClass) {
      imageEl.classList.add(fallbackClass);
    }
    applyImageMeta(imageEl, true, options);
    console.warn("[Egyptronix] Image load failed. Switching to placeholder.", {
      requested: normalizedPath,
      attempted: finalSrc
    });
    await setImageSourceWithFade(imageEl, placeholderImage);
    if (imageEl.dataset.requestToken !== requestToken) {
      return;
    }
    applyStandardFitMode(imageEl, "contain");
    return;
  }

  const fitMode = useFallback ? "contain" : (options.fitMode || "auto");
  applyStandardFitMode(imageEl, fitMode);
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

function getCartItems() {
  return ensureArray(readJSON(STORE_KEYS.cart, []));
}

function setCartItems(items) {
  writeJSON(STORE_KEYS.cart, ensureArray(items));
}

function getInquiries() {
  return ensureArray(readJSON(STORE_KEYS.inquiries, []));
}

function setInquiries(items) {
  writeJSON(STORE_KEYS.inquiries, ensureArray(items));
}

function parsePriceValue(priceText) {
  const numeric = String(priceText || "").replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(amount) {
  return `$${amount.toFixed(2)}`;
}

function buildOrderMessage(cartItems) {
  const lines = [
    "Hello Egeptronix Masri,",
    "",
    "New order request from Egyptronix E-Commerce System:",
    ""
  ];
  let total = 0;

  cartItems.forEach((item, index) => {
    const lineTotal = item.unitPrice * item.quantity;
    total += lineTotal;
    lines.push(`${index + 1}. ${item.name} x${item.quantity} - ${formatPrice(lineTotal)}`);
  });

  lines.push("");
  lines.push(`Total Price: ${formatPrice(total)}`);
  lines.push("Please confirm payment and delivery details.");
  return lines.join("\n");
}

function buildProductPurchaseMessage(product, selections = null) {
  const safeName = String(product?.name || "this product").trim();
  const safePrice = String(product?.price || "N/A").trim();
  const selectedColor = selections?.color || DEFAULT_MODAL_SELECTIONS.color;
  const selectedSocket = selections?.socket || DEFAULT_MODAL_SELECTIONS.socket;
  return `Hello Egeptronix Masri, I want to buy the ${safeName} priced at ${safePrice} from Egyptronix.\nColor: ${selectedColor}\nSocket Standard: ${selectedSocket}`;
}

function legacyBuildQuickItemInquiryMessage(product) {
  return buildQuickItemInquiryMessage(product);
}

function legacyBuildModalChatMessage(product) {
  return buildModalChatMessage(product);
}

function buildQuickItemInquiryMessage(product) {
  const safeName = String(product?.name || "this product").trim();
  const safePrice = String(product?.price || "N/A").trim();
  return `Quick inquiry: ${safeName} priced at ${safePrice}.\n\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0633\u0631\u064A\u0639: ${safeName} \u0628\u0633\u0639\u0631 ${safePrice}.`;
}

function buildModalChatMessage(product) {
  const safeName = String(product?.name || "this product").trim();
  const safePrice = String(product?.price || "N/A").trim();
  return `I want to order the ${safeName} priced at ${safePrice}.\n\u0623\u0631\u064A\u062F \u0637\u0644\u0628 ${safeName} \u0628\u0633\u0639\u0631 ${safePrice}.`;
}

function openWhatsAppWithMessage(message) {
  const safeMessage = String(message || "").trim();
  if (!safeMessage) {
    return;
  }
  const whatsAppUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(safeMessage)}`;
  const waWindow = window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
  if (!waWindow || waWindow.closed) {
    window.location.href = whatsAppUrl;
  }
}

function logInquiry(product, message) {
  const inquiries = getInquiries();
  const record = {
    id: product?.id || "",
    name: product?.name || "",
    price: product?.price || "",
    message,
    createdAt: new Date().toISOString()
  };
  inquiries.push(record);
  setInquiries(inquiries);
  console.log("Inquiry logged:", record);
}

function sendInquiryEmailCopy(product, message) {
  const subject = `Egyptronix Buy Now - ${product?.name || "Product"}`;
  const body = `${message}\n\nProduct ID: ${product?.id || "N/A"}\nTimestamp: ${new Date().toISOString()}`;
  const mailtoUrl = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const emailWindow = window.open(mailtoUrl, "_blank");
  if (!emailWindow || emailWindow.closed) {
    window.location.href = mailtoUrl;
  }
}

function showCardCheckoutConfirmation(node, message) {
  if (!node) {
    return;
  }
  node.textContent = message;
  node.classList.add("is-visible");
}

function hideCardCheckoutConfirmation(node) {
  if (!node) {
    return;
  }
  node.classList.remove("is-visible");
}

function handleProductPurchase(product, confirmationNode) {
  if (!product) {
    return;
  }
  const message = buildProductPurchaseMessage(product);
  logInquiry(product, message);
  showCardCheckoutConfirmation(confirmationNode, "Redirecting to WhatsApp and Email checkout...");

  window.setTimeout(() => {
    openWhatsAppWithMessage(message);
    sendInquiryEmailCopy(product, message);

    window.setTimeout(() => hideCardCheckoutConfirmation(confirmationNode), 1400);
  }, 230);
}

function openProductWhatsAppInquiry(product) {
  if (!product) {
    return;
  }
  const message = buildQuickItemInquiryMessage(product);
  openWhatsAppWithMessage(message);
}

function addToCart(product) {
  if (!product || !product.id) {
    return;
  }
  const unitPrice = parsePriceValue(product.price);
  if (!unitPrice) {
    alert("This product is not purchasable yet.");
    return;
  }

  const cartItems = getCartItems();
  const existing = cartItems.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cartItems.push({
      id: product.id,
      name: product.name || "Egyptronix Product",
      quantity: 1,
      unitPrice
    });
  }
  setCartItems(cartItems);
  renderCart();
}

function removeFromCart(productId) {
  const nextItems = getCartItems().filter((item) => item.id !== productId);
  setCartItems(nextItems);
  renderCart();
}

function renderCart() {
  const cartItemsNode = document.getElementById("cartItems");
  const cartTotalNode = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (!cartItemsNode || !cartTotalNode || !checkoutBtn) {
    return;
  }

  const cartItems = getCartItems();
  cartItemsNode.innerHTML = "";

  if (!cartItems.length) {
    const empty = document.createElement("p");
    empty.className = "cart-empty";
    empty.textContent = "Your cart is empty. Add TA800 or TA845 to continue.";
    cartItemsNode.appendChild(empty);
    cartTotalNode.textContent = "Total: $0.00";
    checkoutBtn.disabled = true;
    return;
  }

  let total = 0;
  cartItems.forEach((item) => {
    const lineTotal = item.quantity * item.unitPrice;
    total += lineTotal;

    const row = document.createElement("div");
    row.className = "cart-item-row";

    const meta = document.createElement("div");
    meta.className = "cart-item-meta";
    meta.innerHTML = `
      <p class="cart-item-name">${item.name}</p>
      <p class="cart-item-qty">Qty: ${item.quantity} | ${formatPrice(lineTotal)}</p>
    `;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-ghost cart-remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.dataset.cartRemove = item.id;

    row.appendChild(meta);
    row.appendChild(removeBtn);
    cartItemsNode.appendChild(row);
  });

  cartTotalNode.textContent = `Total: ${formatPrice(total)}`;
  checkoutBtn.disabled = false;
}

function handleCheckout() {
  const cartItems = getCartItems();
  if (!cartItems.length) {
    alert("Your cart is empty.");
    return;
  }

  const orderMessage = buildOrderMessage(cartItems);
  const whatsAppUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(orderMessage)}`;
  const emailSubject = "Egyptronix Checkout Order";
  const emailUrl = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(orderMessage)}`;

  window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
  window.location.href = emailUrl;
}

function setupCartSection() {
  const cartItemsNode = document.getElementById("cartItems");
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (!cartItemsNode || !checkoutBtn) {
    return;
  }

  cartItemsNode.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const removeBtn = target.closest("[data-cart-remove]");
    if (!removeBtn) {
      return;
    }
    removeFromCart(removeBtn.dataset.cartRemove);
  });

  checkoutBtn.addEventListener("click", handleCheckout);
  renderCart();
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

function getCleanProfileUrl(rawUrl) {
  try {
    const parsedUrl = new URL(String(rawUrl || "").trim());
    return `${parsedUrl.origin}${parsedUrl.pathname}`.replace(/\/+$/, "");
  } catch (_) {
    return String(rawUrl || "").trim();
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

    const cleanUrl = getCleanProfileUrl(config.web);
    anchor.href = cleanUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  });
}

function resolveProductWattage(product) {
  const source = `${product?.name || ""} ${product?.description || ""}`;
  if (/25\s*W/i.test(source)) {
    return "25W";
  }
  if (/45\s*W/i.test(source)) {
    return "45W";
  }
  return "";
}

function collectModalWattageProducts(triggerProduct) {
  const products = getAllProducts();
  const variants = {};

  products.forEach((product) => {
    const wattage = resolveProductWattage(product);
    if (!CHARGER_WATTAGE_OPTIONS.includes(wattage)) {
      return;
    }
    if (!variants[wattage]) {
      variants[wattage] = product;
    }
  });

  const triggerWattage = resolveProductWattage(triggerProduct);
  if (triggerProduct && CHARGER_WATTAGE_OPTIONS.includes(triggerWattage) && !variants[triggerWattage]) {
    variants[triggerWattage] = triggerProduct;
  }

  if (!Object.keys(variants).length && triggerProduct) {
    variants[CHARGER_WATTAGE_OPTIONS[0]] = triggerProduct;
  }

  return variants;
}

function updateVariationButtonsState(modal) {
  if (!modal) {
    return;
  }
  const variationButtons = modal.querySelectorAll(".variation-btn");
  variationButtons.forEach((button) => {
    const group = button.dataset.variationGroup;
    const value = button.dataset.variationValue;
    const isActive = Boolean(group && value && activeModalSelections[group] === value);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function getModalVariantProducts() {
  const variants = [];
  CHARGER_WATTAGE_OPTIONS.forEach((wattage) => {
    const product = activeModalWattageProducts[wattage];
    if (product) {
      variants.push(product);
    }
  });
  if (!variants.length && activeModalProduct) {
    variants.push(activeModalProduct);
  }
  return variants;
}

function setModalStatusMessage(statusNode, message, durationMs = 1600) {
  if (!statusNode) {
    return;
  }
  const existingTimer = Number.parseInt(statusNode.dataset.hideTimer || "", 10);
  if (Number.isFinite(existingTimer)) {
    window.clearTimeout(existingTimer);
  }
  showCardCheckoutConfirmation(statusNode, message);
  const nextTimer = window.setTimeout(() => {
    hideCardCheckoutConfirmation(statusNode);
    delete statusNode.dataset.hideTimer;
  }, durationMs);
  statusNode.dataset.hideTimer = String(nextTimer);
}

function renderProductModalGallery(product, imageNode, thumbsNode) {
  if (!imageNode || !thumbsNode) {
    return;
  }
  const variantProducts = getModalVariantProducts();
  const currentProduct = product || activeModalProduct || variantProducts[0] || null;
  const productName = currentProduct?.name || "Egyptronix Product";
  const alternateProductImage = variantProducts.find((item) => item?.id !== currentProduct?.id)?.image;
  const fallbackImage = normalizeProductImagePath(
    alternateProductImage || variantProducts[0]?.image || DEFAULT_PRODUCTS[0]?.image
  );
  const currentImage = normalizeProductImagePath(currentProduct?.image);
  if (currentProduct) {
    console.log("[Egyptronix] Modal image source:", {
      productId: currentProduct.id || "N/A",
      image: currentImage,
      fallback: fallbackImage
    });
  }
  thumbsNode.innerHTML = "";

  void renderSafeProductImage(imageNode, currentImage, {
    alt: `${productName} product photo`,
    title: `${productName} | Egyptronix`,
    fallbackAlt: "Egyptronix product placeholder image",
    fallbackTitle: "Egyptronix product placeholder image",
    fallbackSrc: fallbackImage,
    placeholderLabel: productName,
    fallbackClass: "product-modal-image--fallback",
    fitMode: "cover"
  });

  if (variantProducts.length <= 1) {
    thumbsNode.classList.add("hidden");
    return;
  }
  thumbsNode.classList.remove("hidden");

  variantProducts.forEach((galleryProduct, index) => {
    const galleryName = galleryProduct?.name || `Charger ${index + 1}`;
    const galleryImage = normalizeProductImagePath(galleryProduct?.image);
    const isActive = Boolean(currentProduct && galleryProduct?.id === currentProduct.id);
    const thumbButton = document.createElement("button");
    thumbButton.type = "button";
    thumbButton.className = "modal-thumb";
    thumbButton.dataset.modalProductId = galleryProduct?.id || "";
    thumbButton.setAttribute("aria-label", `Switch to ${galleryName}`);
    thumbButton.classList.toggle("is-active", isActive);
    thumbButton.setAttribute("aria-current", isActive ? "true" : "false");

    const thumbImage = document.createElement("img");
    thumbImage.className = "modal-thumb-image";
    thumbButton.appendChild(thumbImage);

    void renderSafeProductImage(thumbImage, galleryImage, {
      alt: `${galleryName} thumbnail ${index + 1}`,
      title: `${galleryName} thumbnail ${index + 1}`,
      fallbackAlt: "Egyptronix product thumbnail placeholder",
      fallbackTitle: "Egyptronix product thumbnail placeholder",
      fallbackSrc: fallbackImage,
      placeholderLabel: `${galleryName} thumb`,
      fallbackClass: "modal-thumb-image--fallback",
      fitMode: "cover"
    });

    thumbsNode.appendChild(thumbButton);
  });
}

function renderModalProductContent(product, refs) {
  if (!product || !refs) {
    return;
  }

  const {
    nameNode,
    priceNode,
    categoryNode,
    descriptionNode,
    imageNode,
    thumbsNode,
    specsNode
  } = refs;

  activeModalProduct = product;
  nameNode.textContent = product?.name || "Unnamed Product";
  categoryNode.textContent = product?.category || "General";
  descriptionNode.textContent = product?.description || "No description available.";
  priceNode.textContent = product?.price || "N/A";
  renderProductModalSpecs(product, specsNode);
  renderProductModalGallery(product, imageNode, thumbsNode);
}

function renderProductModalSpecs(product, specsNode) {
  if (!specsNode) {
    return;
  }
  const powerMatch = String(product?.name || "").match(/(\d+)\s*W/i);
  const powerSpec = powerMatch ? `${powerMatch[1]}W` : "N/A";
  const specs = [
    ["Product", product?.name || "Unnamed Product"],
    ["Category", product?.category || "General"],
    ["Power Output", powerSpec],
    ["Price", product?.price || "N/A"],
    ["Model ID", product?.id || "N/A"],
    ["Description", product?.description || "No description available"]
  ];

  specsNode.innerHTML = "";
  specs.forEach(([label, value]) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="modal-spec-key">${label}</span>
      <span class="modal-spec-value">${value}</span>
    `;
    specsNode.appendChild(item);
  });
}

function openProductDetailsModal(product) {
  const modal = document.getElementById("productDetailsModal");
  const nameNode = document.getElementById("productModalName");
  const priceNode = document.getElementById("productModalPrice");
  const categoryNode = document.getElementById("productModalCategory");
  const descriptionNode = document.getElementById("productModalDescription");
  const imageNode = document.getElementById("productModalImage");
  const thumbsNode = document.getElementById("productModalThumbs");
  const specsNode = document.getElementById("productModalSpecs");
  const statusNode = document.getElementById("productModalStatus");
  const facebookNode = document.getElementById("productModalFacebook");
  const tiktokNode = document.getElementById("productModalTikTok");

  if (
    !modal || !nameNode || !priceNode || !categoryNode ||
    !descriptionNode || !imageNode || !thumbsNode || !specsNode || !statusNode
  ) {
    return;
  }

  activeModalSelections = { ...DEFAULT_MODAL_SELECTIONS };
  activeModalWattageProducts = collectModalWattageProducts(product);

  const fallbackProduct =
    product ||
    activeModalWattageProducts["25W"] ||
    activeModalWattageProducts["45W"] ||
    null;
  const clickedProduct =
    Object.values(activeModalWattageProducts).find((candidate) => candidate?.id === product?.id) ||
    product ||
    null;
  const defaultProduct = clickedProduct || activeModalWattageProducts["25W"] || fallbackProduct;
  if (!defaultProduct) {
    return;
  }

  hideCardCheckoutConfirmation(statusNode);
  renderModalProductContent(defaultProduct, {
    nameNode,
    priceNode,
    categoryNode,
    descriptionNode,
    imageNode,
    thumbsNode,
    specsNode
  });
  updateVariationButtonsState(modal);

  if (facebookNode) {
    facebookNode.href = getCleanProfileUrl(FACEBOOK_PROFILE_URL);
    facebookNode.target = "_blank";
    facebookNode.rel = "noopener noreferrer";
  }
  if (tiktokNode) {
    tiktokNode.href = getCleanProfileUrl(TIKTOK_PROFILE_URL);
    tiktokNode.target = "_blank";
    tiktokNode.rel = "noopener noreferrer";
  }

  if (!modal.open) {
    modal.showModal();
  }
}

function setupProductDetailsModal() {
  const modal = document.getElementById("productDetailsModal");
  const closeBtn = document.getElementById("closeProductModalBtn");
  const nameNode = document.getElementById("productModalName");
  const priceNode = document.getElementById("productModalPrice");
  const categoryNode = document.getElementById("productModalCategory");
  const descriptionNode = document.getElementById("productModalDescription");
  const imageNode = document.getElementById("productModalImage");
  const thumbsNode = document.getElementById("productModalThumbs");
  const specsNode = document.getElementById("productModalSpecs");
  const addToCartBtn = document.getElementById("productModalAddToCartBtn");
  const chatBtn = document.getElementById("productModalChatBtn");
  const startOrderBtn = document.getElementById("productModalStartOrderBtn");
  const statusNode = document.getElementById("productModalStatus");
  if (
    !modal || !closeBtn || !nameNode || !priceNode || !categoryNode ||
    !descriptionNode || !imageNode || !thumbsNode || !specsNode ||
    !addToCartBtn || !chatBtn || !startOrderBtn || !statusNode
  ) {
    return;
  }

  closeBtn.addEventListener("click", () => modal.close());

  modal.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const thumbButton = target.closest(".modal-thumb[data-modal-product-id]");
    if (thumbButton) {
      const selectedProductId = thumbButton.dataset.modalProductId;
      const selectedProduct = Object.values(activeModalWattageProducts).find((productRef) => {
        return productRef?.id === selectedProductId;
      });
      if (!selectedProduct || selectedProduct.id === activeModalProduct?.id) {
        return;
      }
      console.log("[Egyptronix] Thumbnail selected:", {
        productId: selectedProduct.id || "N/A",
        image: normalizeProductImagePath(selectedProduct.image)
      });
      renderModalProductContent(selectedProduct, {
        nameNode,
        priceNode,
        categoryNode,
        descriptionNode,
        imageNode,
        thumbsNode,
        specsNode
      });
      setModalStatusMessage(statusNode, `${selectedProduct.name} selected.`, 1200);
      return;
    }

    const variationBtn = target.closest(".variation-btn");
    if (!variationBtn) {
      return;
    }
    const group = variationBtn.dataset.variationGroup;
    const value = variationBtn.dataset.variationValue;
    if (!group || !value) {
      return;
    }
    activeModalSelections[group] = value;
    updateVariationButtonsState(modal);
    setModalStatusMessage(statusNode, `${group === "color" ? "Color" : "Socket"} selected: ${value}`, 1200);
  });

  modal.addEventListener("click", (event) => {
    const modalBox = modal.getBoundingClientRect();
    const clickedOutside = (
      event.clientX < modalBox.left ||
      event.clientX > modalBox.right ||
      event.clientY < modalBox.top ||
      event.clientY > modalBox.bottom
    );
    if (clickedOutside) {
      modal.close();
    }
  });

  addToCartBtn.addEventListener("click", () => {
    if (!activeModalProduct) {
      return;
    }
    addToCart(activeModalProduct);
    setModalStatusMessage(statusNode, "Item added to cart.");
  });

  chatBtn.addEventListener("click", () => {
    if (!activeModalProduct) {
      return;
    }
    const message = buildModalChatMessage(activeModalProduct);
    logInquiry(activeModalProduct, message);
    setModalStatusMessage(statusNode, "Redirecting to WhatsApp...");
    openWhatsAppWithMessage(message);
  });

  startOrderBtn.addEventListener("click", () => {
    if (!activeModalProduct) {
      return;
    }
    const message = buildProductPurchaseMessage(activeModalProduct, activeModalSelections);
    logInquiry(activeModalProduct, message);
    setModalStatusMessage(statusNode, "Opening email order draft...");
    sendInquiryEmailCopy(activeModalProduct, message);
  });

  modal.addEventListener("close", () => {
    activeModalProduct = null;
    activeModalSelections = { ...DEFAULT_MODAL_SELECTIONS };
    activeModalWattageProducts = {};
    hideCardCheckoutConfirmation(statusNode);
    const existingTimer = Number.parseInt(statusNode.dataset.hideTimer || "", 10);
    if (Number.isFinite(existingTimer)) {
      window.clearTimeout(existingTimer);
      delete statusNode.dataset.hideTimer;
    }
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
  card.className = "card product-card product-card--interactive";

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
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Open product details for ${safeProductName}`);

  void renderSafeProductImage(productImage, product.image, {
    alt: `${safeProductName} product photo`,
    title: `${safeProductName} | Egyptronix`,
    fallbackAlt: "Egyptronix product placeholder image",
    fallbackTitle: "Egyptronix product placeholder image",
    fallbackSrc: DEFAULT_PRODUCTS[0].image,
    placeholderLabel: safeProductName,
    fallbackClass: "product-image--fallback",
    fitMode: "contain"
  });

  const quickWhatsappBtn = document.createElement("button");
  quickWhatsappBtn.type = "button";
  quickWhatsappBtn.className = "card-whatsapp-icon";
  quickWhatsappBtn.setAttribute("aria-label", `Quick WhatsApp inquiry for ${safeProductName}`);
  quickWhatsappBtn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.2 3.8A9.85 9.85 0 0 0 12 1a10 10 0 0 0-8.7 14.9L2 22l6.3-1.6A10 10 0 1 0 20.2 3.8Zm-8.2 16a8.25 8.25 0 0 1-4.2-1.2l-.3-.2-3.7 1 1-3.6-.2-.3a8.3 8.3 0 1 1 7.4 4.3Zm4.6-6.2c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a6.7 6.7 0 0 1-2-1.2 7.3 7.3 0 0 1-1.4-1.7c-.2-.3 0-.5.2-.7.2-.2.3-.4.5-.6.1-.2.2-.3.3-.5s0-.4 0-.5-.7-1.8-1-2.5c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.7 1.2 2.9 2 3.1 4.8 4.3c2.8 1.2 2.8.8 3.3.8.5 0 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.2-.1-.4-.2-.7-.4Z"
        fill="currentColor" />
    </svg>
  `;
  quickWhatsappBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openProductWhatsAppInquiry(product);
  });

  card.appendChild(quickWhatsappBtn);
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
  const openCardModal = () => {
    card.classList.add("is-pressed");
    window.setTimeout(() => card.classList.remove("is-pressed"), 200);
    openProductDetailsModal(product);
  };

  card.addEventListener("click", openCardModal);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCardModal();
    }
  });

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

  const featuredProduct = products.find((product) => resolveProductWattage(product) === "25W") || products[0];
  if (featuredProduct) {
    grid.appendChild(createProductCard(featuredProduct));
  }
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

async function auditProductImagePaths() {
  const products = getAllProducts();
  if (!products.length) {
    return;
  }
  for (const product of products) {
    const originalPath = String(product?.image || "").trim();
    const normalizedPath = normalizeProductImagePath(originalPath);
    const isValid = await isImageValid(normalizedPath);
    console.log("[Egyptronix] Product image path audit:", {
      productId: product?.id || "N/A",
      productName: product?.name || "N/A",
      originalPath,
      normalizedPath,
      isValid
    });
  }
}

function init() {
  seedData();
  void auditProductImagePaths();
  setupSocialLinks();
  setupContactSection();
  setupProductDetailsModal();
  setupCartSection();
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
