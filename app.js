const state = { site: null, currentSlide: 0, slideTimer: null, adminReady: false };
const html = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const money = (amount) => amount == null ? "Price on request" : `GH₵${Number(amount).toLocaleString("en-GH")}`;
const imagePath = (src) => /^\/assets\/[a-z0-9-]+\.(?:jpg|png)$/i.test(src || "") ? src : "/assets/portrait.jpg";

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}

function renderSlides(slides) {
  const container = document.querySelector(".hero-slides");
  const dots = document.querySelector(".hero-dots");
  container.innerHTML = slides.map((slide, index) => `
    <article class="hero-slide${index === 0 ? " is-active" : ""}" data-slide="${index}" style="background-image:url('${imagePath(slide.image)}');background-position:${html(slide.imagePosition || "center")}">
      <div class="hero-content">
        <div class="hero-kicker">${html(slide.eyebrow)}</div>
        <h2>${html(slide.headline).replace(/\n/g, "<br>")}</h2>
        <p class="hero-description">${html(slide.description)}</p>
        ${slide.priceText ? `<p class="hero-price">${html(slide.priceText)} <strong>${html(slide.priceValue || "")}</strong></p>` : ""}
        <a class="button button-pink" href="${slide.action === "wigs" ? "#wigs" : slide.action === "services" ? "#services" : "#book"}">${html(slide.buttonLabel)} <span aria-hidden="true">↗</span></a>
      </div>
    </article>`).join("");
  dots.innerHTML = slides.map((_, index) => `<button class="hero-dot" type="button" data-go-slide="${index}" aria-label="Show slide ${index + 1}" aria-current="${index === 0}"></button>`).join("");
  state.currentSlide = 0;
  updateSlideUI();
  resetSlideTimer();
}

function updateSlideUI() {
  const slides = [...document.querySelectorAll(".hero-slide")];
  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === state.currentSlide);
    slide.setAttribute("aria-hidden", String(index !== state.currentSlide));
  });
  document.querySelectorAll(".hero-dot").forEach((dot, index) => dot.setAttribute("aria-current", String(index === state.currentSlide)));
  const position = String(state.currentSlide + 1).padStart(2, "0");
  const current = document.querySelector(".hero-index");
  if (current) current.innerHTML = `${position} <i></i> ${String(slides.length).padStart(2, "0")}`;
}

function goToSlide(index, userAction = false) {
  const total = document.querySelectorAll(".hero-slide").length;
  if (!total) return;
  state.currentSlide = (index + total) % total;
  updateSlideUI();
  if (userAction) resetSlideTimer();
}

function resetSlideTimer() {
  window.clearInterval(state.slideTimer);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    state.slideTimer = window.setInterval(() => goToSlide(state.currentSlide + 1), 6000);
  }
}

function renderServices(services) {
  const list = document.querySelector("#service-list");
  document.querySelector(".rail-hint span:last-child").textContent = `01 — ${String(services.length).padStart(2, "0")}`;
  list.innerHTML = services.map((service) => `
    <article class="service-card">
      <div class="service-media${service.id === "braiding" ? " service-media-braid-source" : ""}">
        <img src="${imagePath(service.image)}?v=5" alt="${html(service.imageAlt || service.name)}" loading="lazy" decoding="async">
        ${service.popular ? '<span class="service-badge">Popular</span>' : ""}
        <span class="service-duration">${html(service.duration)}</span>
      </div>
      <div class="service-body">
        <div class="service-title-row"><h3>${html(service.name)}</h3><span class="service-start">${service.price == null ? "" : "From"}</span></div>
        <p>${html(service.description)}</p>
        <ul class="service-features">${(service.features || []).map((feature) => `<li>${html(feature)}</li>`).join("")}</ul>
        <div class="service-card-footer">
          <div><span class="service-price-label">${service.price == null ? "PERSONALISED PRICING" : "STARTING FROM"}</span><strong class="service-price">${money(service.price)}</strong></div>
          <button class="button button-pink book-service" type="button" data-service-id="${html(service.id)}">Book now <span aria-hidden="true">↗</span></button>
        </div>
      </div>
    </article>`).join("");
}

function renderProducts(products) {
  document.querySelector("#product-list").innerHTML = products.map((product, index) => `
    <article class="product-card">
      <div class="product-media"><img src="${imagePath(product.image)}" alt="${html(product.imageAlt || product.name)}" loading="lazy"><span class="product-number">0${index + 1}</span></div>
      <div class="product-body">
        <div><h3>${html(product.name)}</h3><p>${html(product.subtitle || "A little luxury, every day.")}</p></div>
        <div class="product-meta"><span class="product-price">${money(product.price)}</span><a class="button button-dark" href="https://wa.me/233549864837?text=${encodeURIComponent(`Hello Obsoulba Luxe Hair, I'm interested in the ${product.name}.`)}" target="_blank" rel="noreferrer">Enquire <span aria-hidden="true">↗</span></a></div>
      </div>
    </article>`).join("");
}

function populateBookingServices(services) {
  const select = document.querySelector("#booking-service");
  select.innerHTML = `<option value="">Choose a service</option>${services.map((service) => `<option value="${html(service.id)}">${html(service.name)}${service.price == null ? "" : ` · from ${money(service.price)}`}</option>`).join("")}`;
}

async function loadSite() {
  try {
    state.site = await api("/api/site");
    renderSlides(state.site.slides);
    renderServices(state.site.services);
    renderProducts(state.site.products);
    populateBookingServices(state.site.services);
    document.querySelector('#booking-form [name="date"]').min = new Date().toISOString().slice(0, 10);
    document.querySelector("#year").textContent = new Date().getFullYear();
    if (location.hash === "#book") openBooking();
  } catch (error) {
    const message = `<p class="load-error">We couldn't load the latest services just now. Please refresh or contact us on WhatsApp.</p>`;
    document.querySelector("#service-list").innerHTML = message;
    document.querySelector("#product-list").innerHTML = message;
  }
}

const bookingModal = document.querySelector("#booking-modal");
function openBooking(serviceId = "") {
  if (!state.site) return;
  const select = document.querySelector("#booking-service");
  if (serviceId) select.value = serviceId;
  bookingModal.classList.add("is-open");
  bookingModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  history.replaceState(null, "", `${location.pathname}${location.search}#book`);
  window.setTimeout(() => document.querySelector("#booking-form [name=name]").focus(), 120);
}

function closeBooking() {
  bookingModal.classList.remove("is-open");
  bookingModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
  history.replaceState(null, "", `${location.pathname}${location.search}#home`);
}

document.addEventListener("click", (event) => {
  const bookButton = event.target.closest("[data-service-id]");
  if (bookButton) openBooking(bookButton.dataset.serviceId);
  if (event.target.closest("[data-close-booking]")) closeBooking();
  const dot = event.target.closest("[data-go-slide]");
  if (dot) goToSlide(Number(dot.dataset.goSlide), true);
  if (event.target.closest(".hero-next")) goToSlide(state.currentSlide + 1, true);
  if (event.target.closest(".hero-prev")) goToSlide(state.currentSlide - 1, true);
});

document.querySelectorAll('a[href="#book"]').forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  openBooking();
}));

document.querySelector("#booking-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.querySelector("#booking-feedback");
  const submit = form.querySelector('[type="submit"]');
  feedback.textContent = "";
  feedback.classList.remove("success");
  submit.disabled = true;
  submit.textContent = "Sending your request…";
  const formData = new FormData(form);
  const booking = Object.fromEntries(formData.entries());
  try {
    const result = await api("/api/bookings", { method: "POST", body: booking });
    feedback.textContent = result.message;
    feedback.classList.add("success");
    form.reset();
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Request my appointment <span aria-hidden="true">↗</span>';
  }
});

const menuToggle = document.querySelector(".menu-toggle");
menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  menuToggle.setAttribute("aria-label", expanded ? "Open menu" : "Close menu");
  document.querySelector("#mobile-menu").hidden = expanded;
});
document.querySelector("#mobile-menu").addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    document.querySelector("#mobile-menu").hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  }
});

let touchStartX = 0;
const hero = document.querySelector(".hero");
hero.addEventListener("pointerdown", (event) => { touchStartX = event.clientX; }, { passive: true });
hero.addEventListener("pointerup", (event) => {
  const distance = event.clientX - touchStartX;
  if (Math.abs(distance) > 55) goToSlide(state.currentSlide + (distance < 0 ? 1 : -1), true);
}, { passive: true });
hero.addEventListener("mouseenter", () => window.clearInterval(state.slideTimer));
hero.addEventListener("mouseleave", resetSlideTimer);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && bookingModal.classList.contains("is-open")) closeBooking();
});

const adminPage = document.querySelector("#admin-page");
function adminShell(body) {
  adminPage.innerHTML = `<div class="admin-shell"><div class="admin-top"><div><a class="admin-back" href="#home">← Back to the website</a><h1>Obsoulba <em>studio.</em></h1></div><a class="admin-back" href="#home">VIEW WEBSITE ↗</a></div>${body}</div>`;
}
function adminStatus(message = "", error = false) {
  const status = document.querySelector(".admin-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", error);
}
function renderAdminLogin(configured, setupTokenRequired) {
  const heading = configured ? "Welcome back." : "First, let's set up your studio.";
  const intro = configured ? "Sign in to manage your services, prices, hero stories and appointment requests." : "Choose an admin username and a strong password. This first setup is available only while no admin account exists.";
  adminShell(`<section class="admin-panel admin-login"><div class="eyebrow"><span class="eyebrow-rule"></span> PRIVATE ADMIN</div><h2>${heading}</h2><p class="admin-panel-intro">${intro}</p><form class="admin-form" id="admin-auth-form">
    ${!configured && setupTokenRequired ? '<label>One-time setup token<input type="password" name="setupToken" autocomplete="one-time-code" required maxlength="200"></label>' : ""}
    ${configured ? "" : '<label>Admin username<input name="username" autocomplete="username" required minlength="3" maxlength="48"></label>'}
    <label>${configured ? "Username" : "Password"}<input name="${configured ? "username" : "password"}" autocomplete="${configured ? "username" : "new-password"}" required minlength="${configured ? 3 : 12}" maxlength="100" ${configured ? "" : 'type="password"'}></label>
    ${configured ? '<label>Password<input type="password" name="password" autocomplete="current-password" required minlength="12" maxlength="100"></label>' : ""}
    <p class="admin-status" role="status"></p><button class="button button-dark" type="submit">${configured ? "Sign in" : "Create admin account"} <span aria-hidden="true">↗</span></button>
  </form></section>`);
  document.querySelector("#admin-auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(configured ? "/api/admin/login" : "/api/admin/setup", { method: "POST", body: values });
      await loadAdmin();
    } catch (error) {
      adminStatus(error.message, true);
    }
  });
}

function adminPriceInput(label, name, value) {
  return `<label>${label} (GH₵)<input name="${name}" type="number" min="0" max="1000000" step="1" value="${value == null ? "" : html(value)}" placeholder="Leave blank for price on request"></label>`;
}
function adminItemField(label, name, value, placeholder = "") {
  return `<label>${label}<input name="${name}" value="${html(value || "")}" maxlength="240" placeholder="${html(placeholder)}"></label>`;
}
function adminTextArea(label, name, value, rows = 2) {
  return `<label>${label}<textarea name="${name}" rows="${rows}" maxlength="240">${html(value || "")}</textarea></label>`;
}
function renderAdminContent(data, bookings) {
  const slides = data.slides.map((slide, index) => `<div class="admin-item"><h3>Slide 0${index + 1} · ${html(slide.eyebrow)}</h3><div class="admin-grid">
    ${adminItemField("Eyebrow", `slide.${slide.id}.eyebrow`, slide.eyebrow)}
    ${adminItemField("Button label", `slide.${slide.id}.buttonLabel`, slide.buttonLabel)}
    ${adminTextArea("Headline", `slide.${slide.id}.headline`, slide.headline, 3)}
    ${adminItemField("Description", `slide.${slide.id}.description`, slide.description)}
    ${adminItemField("Image path", `slide.${slide.id}.image`, slide.image)}
    <label>Image focus<select name="slide.${slide.id}.imagePosition">${["center","top","bottom","left","right","center 35%","center 65%"].map((pos) => `<option value="${pos}" ${slide.imagePosition === pos ? "selected" : ""}>${pos}</option>`).join("")}</select></label>
  </div></div>`).join("");
  const services = data.services.map((service) => `<div class="admin-item"><h3>${html(service.name)} · ${html(service.duration)}</h3><div class="admin-grid">
    ${adminItemField("Service name", `service.${service.id}.name`, service.name)}
    ${adminPriceInput("Starting price", `service.${service.id}.price`, service.price)}
    ${adminItemField("Duration", `service.${service.id}.duration`, service.duration)}
    ${adminItemField("Image path", `service.${service.id}.image`, service.image)}
    <label class="span-all">Description<textarea name="service.${service.id}.description" rows="2" maxlength="240">${html(service.description)}</textarea></label>
  </div></div>`).join("");
  const products = data.products.map((product) => `<div class="admin-item"><h3>${html(product.name)}</h3><div class="admin-grid">
    ${adminItemField("Product name", `product.${product.id}.name`, product.name)}
    ${adminPriceInput("Product price", `product.${product.id}.price`, product.price)}
    ${adminItemField("Image path", `product.${product.id}.image`, product.image)}
    ${adminItemField("Short description", `product.${product.id}.subtitle`, product.subtitle)}
  </div></div>`).join("");
  const rows = bookings.length ? bookings.map((booking) => `<tr><td>${html(booking.name)}<br><small>${html(booking.phone)}</small></td><td>${html(booking.serviceName)}</td><td>${html(booking.date)}<br>${html(booking.time)}</td><td><select data-booking-status="${html(booking.id)}">${["new","confirmed","completed","cancelled"].map((status) => `<option ${booking.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></td></tr>`).join("") : '<tr><td colspan="4">No appointment requests yet.</td></tr>';
  adminShell(`<section class="admin-panel"><div class="admin-top"><div><div class="eyebrow"><span class="eyebrow-rule"></span> YOUR WEBSITE</div><h2>Make it yours.</h2></div><button class="button button-outline admin-logout" type="button" style="color:var(--ink);border-color:var(--line)">Sign out</button></div><p class="admin-panel-intro">Update your slideshow, service descriptions and prices, and wig products. Changes appear on the website after you save.</p>
    <form id="admin-site-form" class="admin-form"><div><h2>Hero stories</h2>${slides}</div><div><h2>Your services & pricing</h2>${services}</div><div><h2>Wigs for sale</h2>${products}</div><p class="admin-status" role="status"></p><div class="admin-actions"><button class="button button-pink" type="submit">Save website changes <span aria-hidden="true">↗</span></button><span class="admin-note">Prices are stored in your local SQLite database. Leave a price blank to show “Price on request”.</span></div></form></section>
    <section class="admin-panel"><div class="eyebrow"><span class="eyebrow-rule"></span> APPOINTMENT REQUESTS</div><h2>Bookings to follow up.</h2><div class="booking-table-wrap"><table class="booking-table"><thead><tr><th>Client</th><th>Service</th><th>Preferred time</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`);
  document.querySelector("#admin-site-form").addEventListener("submit", saveAdminSite);
  document.querySelectorAll("[data-booking-status]").forEach((select) => select.addEventListener("change", async () => {
    try {
      await api(`/api/admin/bookings/${encodeURIComponent(select.dataset.bookingStatus)}`, { method: "PATCH", body: { status: select.value } });
    } catch (error) {
      adminStatus(error.message, true);
    }
  }));
  document.querySelector(".admin-logout").addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST", body: {} });
      await loadAdmin();
    } catch (error) { adminStatus(error.message, true); }
  });
}

function readAdminSiteForm(form) {
  const data = state.adminData;
  const values = Object.fromEntries(new FormData(form));
  const slides = data.slides.map((slide) => ({
    ...slide,
    eyebrow: values[`slide.${slide.id}.eyebrow`],
    buttonLabel: values[`slide.${slide.id}.buttonLabel`],
    headline: values[`slide.${slide.id}.headline`],
    description: values[`slide.${slide.id}.description`],
    image: values[`slide.${slide.id}.image`],
    imagePosition: values[`slide.${slide.id}.imagePosition`]
  }));
  const services = data.services.map((service) => ({
    ...service,
    name: values[`service.${service.id}.name`],
    price: values[`service.${service.id}.price`],
    duration: values[`service.${service.id}.duration`],
    image: values[`service.${service.id}.image`],
    description: values[`service.${service.id}.description`]
  }));
  const products = data.products.map((product) => ({
    ...product,
    name: values[`product.${product.id}.name`],
    price: values[`product.${product.id}.price`],
    image: values[`product.${product.id}.image`],
    subtitle: values[`product.${product.id}.subtitle`]
  }));
  return { slides, services, products };
}

async function saveAdminSite(event) {
  event.preventDefault();
  const submit = event.currentTarget.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const updated = await api("/api/admin/site", { method: "PUT", body: readAdminSiteForm(event.currentTarget) });
    state.adminData = updated;
    adminStatus("Saved. Your public website is up to date.");
  } catch (error) {
    adminStatus(error.message, true);
  } finally {
    submit.disabled = false;
  }
}

async function loadAdmin() {
  adminPage.hidden = false;
  document.querySelector("body > main#home").hidden = true;
  document.querySelector(".site-footer").hidden = true;
  document.querySelector(".whatsapp-float").hidden = true;
  try {
    const { configured, authenticated, setupTokenRequired } = await api("/api/admin/status");
    if (!configured || !authenticated) {
      renderAdminLogin(configured, setupTokenRequired);
      return;
    }
    const [data, bookings] = await Promise.all([api("/api/admin/site"), api("/api/admin/bookings")]);
    state.adminData = data;
    renderAdminContent(data, bookings);
  } catch (error) {
    adminShell(`<section class="admin-panel"><h2>We couldn't open the studio.</h2><p class="admin-panel-intro">${html(error.message)}</p><button class="button button-dark" type="button" onclick="location.reload()">Try again</button></section>`);
  }
}

function syncRoute() {
  if (location.hash === "#admin") {
    loadAdmin();
  } else {
    adminPage.hidden = true;
    document.querySelector("body > main#home").hidden = false;
    document.querySelector(".site-footer").hidden = false;
    document.querySelector(".whatsapp-float").hidden = false;
  }
}
window.addEventListener("hashchange", syncRoute);

loadSite().then(() => {
  if (location.hash === "#admin") syncRoute();
});
