const CATALOG_URL = "assets/data/produkter.json";
const CUSTOMER_MEDIA_URL = "assets/data/klistreverksted-media.json";
const CART_KEY = "klistreverkstedet-cart";
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

// (Uploadcare will enforce image-only uploads; we keep no local file validation)

let catalogProducts = [];

function byId(id) {
  return document.getElementById(id);
}

function formatPrice(value) {
  return new Intl.NumberFormat("no-NO", {
    maximumFractionDigits: 0,
  }).format(value);
}

function safePath(path) {
  return encodeURI(path);
}

function getShippingOption() {
  const selected = document.querySelector('[data-shipping-option]:checked');

  if (!selected) {
    return {
      label: "Hente selv på baksalen",
      cost: 0,
    };
  }

  return {
    label: selected.value,
    cost: Number(selected.dataset.shippingCost || "0"),
  };
}

function getTipAmount() {
  const tipInput = byId("tip-amount-input");

  if (!tipInput) {
    return 0;
  }

  const tipValue = Number(tipInput.value || "0");
  return Number.isFinite(tipValue) && tipValue > 0 ? Math.round(tipValue) : 0;
}

function getCartSubtotal() {
  return loadCart().reduce((subtotal, entry) => {
    const product = getProductById(entry.id);
    const unitPrice = product && typeof product.price === "number" ? product.price : 0;
    return subtotal + unitPrice * entry.quantity;
  }, 0);
}

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getProductById(productId) {
  return catalogProducts.find((product) => product.id === productId);
}

function addToCart(productId) {
  const cart = loadCart();
  const item = cart.find((entry) => entry.id === productId);

  if (item) {
    item.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }

  saveCart(cart);
  renderCart();
  openCartDrawer();
}

function setQuantity(productId, quantity) {
  const cart = loadCart();
  const item = cart.find((entry) => entry.id === productId);

  if (!item) {
    return;
  }

  item.quantity = quantity;

  if (item.quantity <= 0) {
    const nextCart = cart.filter((entry) => entry.id !== productId);
    saveCart(nextCart);
  } else {
    saveCart(cart);
  }

  renderCart();
}

function clearCart() {
  saveCart([]);
  renderCart();
}

function renderProducts(products) {
  const grid = byId("product-grid");

  if (!grid) {
    return;
  }

  if (!products.length) {
    grid.innerHTML = '<p class="empty-state">Ingen produkter er lagt inn enda.</p>';
    return;
  }

  grid.innerHTML = products
    .map((product) => {
      const hasPrice = typeof product.price === "number";
      return `
        <article class="product-card">
          <div class="product-card__top">
            <span class="pill">${product.tag || "Produkt"}</span>
            <strong class="product-price">${hasPrice ? `${formatPrice(product.price)} kr` : "Pris på forespørsel"}</strong>
          </div>
          <img class="product-image" src="${safePath(product.image)}" alt="${product.name}" loading="lazy" decoding="async">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <button class="btn btn-primary btn-small" type="button" data-order-product="${product.id}">Send forespørsel</button>
        </article>
      `;
    })
    .join("");
}

function renderCustomerMedia(items) {
  const grid = byId("customer-media-grid");

  if (!grid) {
    return;
  }

  if (!items.length) {
    grid.innerHTML = '<p class="empty-state">Ingen kundebilder er lagt inn enda.</p>';
    return;
  }

  grid.innerHTML = items
    .map((item) => {
      return `
        <article class="gallery-card">
          <img src="${safePath(item.src)}" alt="${item.alt || "Kundebilde"}" loading="lazy" decoding="async">
          <div class="gallery-card__body">
            <h3>${item.title || "Fornøyd kunde"}</h3>
            <p>${item.caption || "Takk for tilliten."}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCart() {
  const cartPanel = byId("cart-panel");
  const cartItems = byId("cart-items");
  const cartTotal = byId("cart-total");
  const cartShippingTotal = byId("cart-shipping-total");
  const cartGrandTotal = byId("cart-grand-total");
  const cartCount = byId("cart-count");

  if (!cartPanel || !cartItems || !cartTotal || !cartCount) {
    return;
  }

  const cart = loadCart();
  let quantitySum = 0;
  let totalPrice = 0;
  const shipping = getShippingOption();
  const tipAmount = getTipAmount();

  if (!cart.length) {
    cartItems.innerHTML = '<p class="empty-state">Handlekurven er tom ennå.</p>';
    cartTotal.textContent = "0 kr";
    if (cartShippingTotal) {
      cartShippingTotal.textContent = `${formatPrice(shipping.cost)} kr`;
    }
    if (cartGrandTotal) {
      cartGrandTotal.textContent = `${formatPrice(shipping.cost + tipAmount)} kr`;
    }
    cartCount.textContent = "0";
    syncCartSummary();
    return;
  }

  cartItems.innerHTML = cart
    .map((entry) => {
      const product = getProductById(entry.id);

      if (!product) {
        return "";
      }

      quantitySum += entry.quantity;
      const unitPrice = typeof product.price === "number" ? product.price : 0;
      const lineTotal = unitPrice * entry.quantity;
      totalPrice += lineTotal;

      return `
        <div class="cart-row">
          <img class="cart-thumb" src="${safePath(product.image)}" alt="${product.name}" loading="lazy" decoding="async">
          <div class="cart-row__meta">
            <strong>${product.name}</strong>
            <p class="cart-meta-sub">Antall: ${entry.quantity}</p>
            <div class="cart-line-total">${unitPrice ? `${formatPrice(lineTotal)} kr` : ""}</div>
          </div>
          <div class="cart-row__actions">
            <div class="qty-group">
              <button class="qty-btn" type="button" data-cart-action="minus" data-product-id="${product.id}" aria-label="Minsk antall">-</button>
              <span class="qty-value">${entry.quantity}</span>
              <button class="qty-btn" type="button" data-cart-action="plus" data-product-id="${product.id}" aria-label="Øk antall">+</button>
            </div>
            <div class="remove-group">
              <button class="cart-remove" type="button" data-cart-action="remove" data-product-id="${product.id}" aria-label="Fjern produkt">
                <span class="remove-icon" aria-hidden="true">✕</span>
                <span class="remove-text">Fjern</span>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  cartTotal.textContent = `${formatPrice(totalPrice)} kr`;
  if (cartShippingTotal) {
    cartShippingTotal.textContent = `${shipping.cost === 0 ? "Gratis" : `${formatPrice(shipping.cost)} kr`}`;
  }
  if (cartGrandTotal) {
    cartGrandTotal.textContent = `${formatPrice(totalPrice + shipping.cost + tipAmount)} kr`;
  }
  cartCount.textContent = String(quantitySum);
  syncCartSummary();
}

function buildCartMessage() {
  const cart = loadCart();

  if (!cart.length) {
    return "Ingen produkter i handlekurven.";
  }

  return cart
    .map((entry) => {
      const product = getProductById(entry.id);
      if (!product) {
        return null;
      }

      const priceText = typeof product.price === "number" ? ` (${formatPrice(product.price)} kr)` : "";
      return `${product.name}${priceText} x ${entry.quantity}`;
    })
    .filter(Boolean)
    .join("\n");
}

function syncCartSummary() {
  const summaryInput = byId("cart-summary-input");
  const shippingMethodInput = byId("shipping-method-input");
  const shippingCostInput = byId("shipping-cost-input");
  const tipAmountInput = byId("tip-amount-input");
  const orderTotalInput = byId("order-total-input");

  const shipping = getShippingOption();
  const tipAmount = getTipAmount();
  const orderTotal = getCartSubtotal() + shipping.cost + tipAmount;

  if (summaryInput) {
    summaryInput.value = `${buildCartMessage()}\nFrakt: ${shipping.label} (${shipping.cost === 0 ? "gratis" : `${formatPrice(shipping.cost)} kr`})\nTips: ${tipAmount === 0 ? "0 kr" : `${formatPrice(tipAmount)} kr`}`.trim();
  }

  if (shippingMethodInput) {
    shippingMethodInput.value = shipping.label;
  }

  if (shippingCostInput) {
    shippingCostInput.value = String(shipping.cost);
  }

  if (tipAmountInput) {
    tipAmountInput.value = tipAmount ? String(tipAmount) : "";
  }

  if (orderTotalInput) {
    orderTotalInput.value = `${formatPrice(orderTotal)} kr`;
  }
}

async function loadCatalog() {
  const response = await fetch(CATALOG_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Kunne ikke hente produktlisten.");
  }

  return response.json();
}

async function loadCustomerMedia() {
  const response = await fetch(CUSTOMER_MEDIA_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Kunne ikke hente kundebilder.");
  }

  return response.json();
}

function setYear() {
  const year = byId("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

function setStatus(message, isError = false) {
  const status = byId("form-status");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("form-note--error", isError);
}

function setupMobileNav() {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (!navToggle || !siteNav) {
    return;
  }

  const closeNav = () => {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Åpne meny");
    siteNav.classList.remove("is-open");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    const nextOpen = !isOpen;
    navToggle.setAttribute("aria-expanded", String(nextOpen));
    navToggle.setAttribute("aria-label", nextOpen ? "Lukk meny" : "Åpne meny");
    siteNav.classList.toggle("is-open", nextOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      closeNav();
    }
  });
}

function setupEvents() {
  document.addEventListener("click", (event) => {
    const orderButton = event.target.closest("[data-order-product]");
    if (orderButton) {
      const productId = orderButton.dataset.orderProduct;
      addToCart(productId);
      return;
    }

    const addButton = event.target.closest("[data-add-to-cart]");
    if (addButton) {
      addToCart(addButton.dataset.addToCart);
      return;
    }

    const cartButton = event.target.closest("[data-cart-action]");
    if (!cartButton) {
      return;
    }

    const productId = cartButton.dataset.productId;
    const action = cartButton.dataset.cartAction;
    const cart = loadCart();
    const item = cart.find((entry) => entry.id === productId);

    if (!item && action !== "remove") {
      return;
    }

    if (action === "plus") {
      setQuantity(productId, item.quantity + 1);
    }

    if (action === "minus") {
      setQuantity(productId, item.quantity - 1);
    }

    if (action === "remove") {
      const nextCart = cart.filter((entry) => entry.id !== productId);
      saveCart(nextCart);
      renderCart();
    }
  });

  const clearButton = byId("clear-cart");
  if (clearButton) {
    clearButton.addEventListener("click", clearCart);
  }

  document.querySelectorAll("[data-shipping-option]").forEach((input) => {
    input.addEventListener("change", () => {
      renderCart();
    });
  });

  const tipAmountInput = byId("tip-amount-input");
  if (tipAmountInput) {
    tipAmountInput.addEventListener("input", () => {
      renderCart();
    });
  }

  const orderForm = byId("order-form");
  if (orderForm) {
    orderForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const cart = loadCart();
      if (!cart.length) {
        setStatus("Handlekurven er tom.", true);
        return;
      }

      const formData = new FormData(orderForm);
      const shipping = getShippingOption();
      const tipAmount = getTipAmount();
      const orderTotal = `${formatPrice(getCartSubtotal() + shipping.cost + tipAmount)} kr`;
      formData.set("shipping_method", shipping.label);
      formData.set("shipping_cost", String(shipping.cost));
      formData.set("tip_amount", String(tipAmount));
      formData.set("order_total", orderTotal);
      formData.set("message", `${formData.get("message") || ""}\n\nHandlekurv:\n${buildCartMessage()}\n\nFrakt: ${shipping.label} (${shipping.cost === 0 ? "gratis" : `${formatPrice(shipping.cost)} kr`})\nTips: ${tipAmount === 0 ? "0 kr" : `${formatPrice(tipAmount)} kr`}\nTotal: ${orderTotal}`.trim());

      // optional URL field for reference (kept from previous flow)
      const attachmentUrlInput = byId("attachment-url-input");
      if (attachmentUrlInput && attachmentUrlInput.value) {
        formData.set("attachment_url", attachmentUrlInput.value);
      }

      try {
        setStatus("Sender bestillingen ...");

        const response = await fetch(WEB3FORMS_ENDPOINT, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Kunne ikke sende bestillingen.");
        }

        clearCart();
        orderForm.reset();
        setStatus("Bestillingen er sendt.");
            // Redirect to a simple thank-you page after a short delay
            try {
              setTimeout(() => {
                window.location.href = 'thank-you.html';
              }, 800);
            } catch (e) { /* ignore */ }
      } catch (error) {
        setStatus("Noe gikk galt. Prøv igjen om litt.", true);
      }
    });
  }
}

function openCartDrawer() {
  const cartPanel = byId("cart-panel");
  const cartOverlay = byId("cart-overlay");
  const cartToggle = byId("cart-toggle");

  if (!cartPanel || !cartToggle || !cartOverlay) {
    return;
  }

  cartPanel.classList.add("is-open");
  cartOverlay.hidden = false;
  cartToggle.setAttribute("aria-expanded", "true");
}

function closeCartDrawer() {
  const cartPanel = byId("cart-panel");
  const cartOverlay = byId("cart-overlay");
  const cartToggle = byId("cart-toggle");

  if (!cartPanel || !cartToggle || !cartOverlay) {
    return;
  }

  cartPanel.classList.remove("is-open");
  cartOverlay.hidden = true;
  cartToggle.setAttribute("aria-expanded", "false");
}

function setupCartDrawer() {
  const cartToggle = byId("cart-toggle");
  const cartClose = byId("cart-close");
  const cartOverlay = byId("cart-overlay");

  if (!cartToggle) {
    return;
  }

  cartToggle.addEventListener("click", () => {
    const expanded = cartToggle.getAttribute("aria-expanded") === "true";
    if (expanded) {
      closeCartDrawer();
      return;
    }

    openCartDrawer();
  });

  if (cartClose) {
    cartClose.addEventListener("click", closeCartDrawer);
  }

  if (cartOverlay) {
    cartOverlay.addEventListener("click", closeCartDrawer);
  }
}

function setupGoofyEasterEgg() {
  const egg = document.querySelector("[data-goofy-easter-egg]");

  if (!egg) {
    return;
  }

  const maxClicks = 10;
  const maxViewportRatio = 0.95;

  egg.dataset.clickCount = egg.dataset.clickCount || "0";
  egg.style.setProperty("--goofy-scale", egg.dataset.clickCount === "0" ? "1" : egg.dataset.clickCount);

  const setEggScale = (clickCount) => {
    const nextScale = 1 + clickCount * 0.22;
    egg.style.setProperty("--goofy-scale", String(nextScale));
  };

  setEggScale(Number(egg.dataset.clickCount));

  egg.addEventListener("click", () => {
    if (egg.classList.contains("is-exploding")) {
      return;
    }

    const nextClickCount = Number(egg.dataset.clickCount || "0") + 1;
    egg.dataset.clickCount = String(nextClickCount);

    if (nextClickCount >= maxClicks) {
      const viewportCap = Math.floor(Math.min(window.innerWidth, window.innerHeight) * maxViewportRatio);
      const baseSize = 12;
      const explodeScale = viewportCap / baseSize;
      egg.style.setProperty("--goofy-scale", String(explodeScale));
      egg.classList.add("is-exploding");

      window.setTimeout(() => {
        egg.hidden = true;
      }, 980);

      return;
    }

    setEggScale(nextClickCount);
  });
}

function setupUploadcare() {
  if (typeof uploadcare === 'undefined') {
    // Uploadcare script not loaded yet; try again later
    return;
  }

  const widget = uploadcare.Widget('[role=uploadcare-uploader]');
  const hiddenInput = byId('reference-image-url');

  if (!widget) {
    return;
  }

  widget.onChange((filePromise) => {
    if (!filePromise) {
      if (hiddenInput) hiddenInput.value = "";
      return;
    }

    // filePromise is a Promise-like Uploadcare File object
    filePromise.done((fileInfo) => {
      const url = fileInfo && (fileInfo.cdnUrl || fileInfo.cdn_url || fileInfo.originalUrl || fileInfo.original_url);
      if (hiddenInput) hiddenInput.value = url || "";
    }).fail(() => {
      if (hiddenInput) hiddenInput.value = "";
      setStatus('Opplasting feilet. Prøv igjen.', true);
    });
  });
}

async function initSite() {
  setYear();
  setupMobileNav();
  setupCartDrawer();
  setupGoofyEasterEgg();
  setupEvents();
  // Initialize Uploadcare widget handling (if script already loaded)
  try { setupUploadcare(); } catch (e) { /* ignore */ }

  try {
    const catalog = await loadCatalog();
    catalogProducts = Array.isArray(catalog.products) ? catalog.products : [];
    renderProducts(catalogProducts);
    const customerMediaResponse = await loadCustomerMedia();
    renderCustomerMedia(Array.isArray(customerMediaResponse.media) ? customerMediaResponse.media : []);
    renderCart();
    syncCartSummary();
  } catch (error) {
    const productGrid = byId("product-grid");
    const customerMediaGrid = byId("customer-media-grid");

    if (productGrid) {
      productGrid.innerHTML = '<p class="empty-state">Produktlisten kunne ikke lastes akkurat nå.</p>';
    }

    if (customerMediaGrid) {
      customerMediaGrid.innerHTML = '<p class="empty-state">Kundebilder kunne ikke lastes akkurat nå.</p>';
    }
  }
}

initSite();
