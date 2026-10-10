import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { DatabaseSync } from "node:sqlite";

const scrypt = promisify(scryptCallback);
const root = resolve(".");
const dataDirectory = resolve(process.env.DATA_DIRECTORY || join(root, ".data"));
const adminSetupToken = process.env.ADMIN_SETUP_TOKEN || "";
await mkdir(dataDirectory, { recursive: true });
const database = new DatabaseSync(join(dataDirectory, "obsoulba.sqlite"));
database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
database.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    username TEXT NOT NULL UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL, duration TEXT NOT NULL,
    description TEXT NOT NULL, features TEXT NOT NULL, image TEXT NOT NULL,
    image_alt TEXT NOT NULL, popular INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL, subtitle TEXT NOT NULL,
    image TEXT NOT NULL, image_alt TEXT NOT NULL, sort_order INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS slides (
    id TEXT PRIMARY KEY, eyebrow TEXT NOT NULL, headline TEXT NOT NULL, description TEXT NOT NULL,
    price_text TEXT, service_id TEXT, action TEXT NOT NULL, button_label TEXT NOT NULL,
    image TEXT NOT NULL, image_position TEXT NOT NULL, sort_order INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, service_id TEXT NOT NULL,
    date TEXT NOT NULL, time TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const seedServices = [
  { id: "braiding", name: "Braiding", price: 180, duration: "2 – 6 hrs", description: "Thoughtful, beautiful braids made to feel like you. From neat knotless styles to classic cornrows.", features: ["Knotless braids", "Box braids", "Cornrows", "Fulani braids"], image: "/assets/braiding-service.jpg", imageAlt: "Beautifully styled braids", popular: 1 },
  { id: "lash-extensions", name: "Lash Extensions", price: 150, duration: "1.5 – 2 hrs", description: "A little more flutter, a lot more you. Carefully applied lashes that flatter your natural eye shape.", features: ["Classic lashes", "Hybrid volume", "Soft glam", "Lash lift"], image: "/assets/lashes-service.jpg", imageAlt: "Close-up of styled lash extensions", popular: 0 },
  { id: "cluster-lashes", name: "Cluster Lashes", price: 80, duration: "45 – 60 mins", description: "A soft, effortless finish for the days you want your eyes to do the talking.", features: ["Natural clusters", "Wispy finish", "Lightweight feel"], image: "/assets/lashes-service.jpg", imageAlt: "Soft, fluttery lash extensions", popular: 0 },
  { id: "nail-services", name: "Nail Services", price: 80, duration: "1 – 2.5 hrs", description: "Treat yourself to a considered manicure, from a clean natural finish to detailed nail art.", features: ["Gel nails", "Acrylic sets", "Nail art", "Press-on nails"], image: "/assets/nails.jpg", imageAlt: "Pink and pearl nail art", popular: 1 },
  { id: "wig-installation", name: "Wig Installation", price: null, duration: "1.5 – 3 hrs", description: "A seamless, comfortable install finished with the detail and care your look deserves.", features: ["Custom fit", "Natural hairline", "Styled finish"], image: "/assets/wig-installation.jpg", imageAlt: "Sleek wig installation detail", popular: 0 },
];

const seedProducts = [
  { id: "body-wave", name: "Body Wave", price: null, subtitle: "Soft movement. Effortless polish.", image: "/assets/wig-body-wave.jpg", imageAlt: "Long, glossy body wave wig" },
  { id: "silk-straight", name: "Silk Straight", price: null, subtitle: "A sleek classic, made to last.", image: "/assets/wig-straight.jpg", imageAlt: "Sleek, straight black wig" },
  { id: "deep-wave", name: "Deep Wave", price: null, subtitle: "Beautiful volume with a little drama.", image: "/assets/wig-deep-wave.jpg", imageAlt: "Full, dark deep-wave wig" }
];

const seedSlides = [
  { id: "braiding", eyebrow: "BRAIDING", headline: "YOUR BEAUTY,\nYOUR SIGNATURE.", description: "Premium braiding crafted for your unique style.", price_text: "From", service_id: "braiding", action: "book", button_label: "BOOK AN APPOINTMENT", image: "/assets/braiding.jpg", image_position: "top" },
  { id: "wigs", eyebrow: "WIGS", headline: "LUXURY HAIR.\nEFFORTLESS CONFIDENCE.", description: "Discover beautiful wigs and professional wig installation.", price_text: null, service_id: null, action: "wigs", button_label: "EXPLORE WIGS", image: "/assets/wig-body-wave.jpg", image_position: "top" },
  { id: "lashes-nails", eyebrow: "LASHES & NAILS", headline: "THE FINISHING\nTOUCH.", description: "Complete your look with our professional beauty services.", price_text: null, service_id: null, action: "services", button_label: "VIEW SERVICES", image: "/assets/lashes.jpg", image_position: "top" }
];

if (Number(database.prepare("SELECT COUNT(*) AS count FROM services").get().count) === 0) {
  const insert = database.prepare("INSERT INTO services (id,name,price,duration,description,features,image,image_alt,popular,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)");
  seedServices.forEach((item, index) => insert.run(item.id, item.name, item.price, item.duration, item.description, JSON.stringify(item.features), item.image, item.imageAlt, item.popular, index));
}
if (Number(database.prepare("SELECT COUNT(*) AS count FROM products").get().count) === 0) {
  const insert = database.prepare("INSERT INTO products (id,name,price,subtitle,image,image_alt,sort_order) VALUES (?,?,?,?,?,?,?)");
  seedProducts.forEach((item, index) => insert.run(item.id, item.name, item.price, item.subtitle, item.image, item.imageAlt, index));
}
if (Number(database.prepare("SELECT COUNT(*) AS count FROM slides").get().count) === 0) {
  const insert = database.prepare("INSERT INTO slides (id,eyebrow,headline,description,price_text,service_id,action,button_label,image,image_position,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  seedSlides.forEach((item, index) => insert.run(item.id, item.eyebrow, item.headline, item.description, item.price_text, item.service_id, item.action, item.button_label, item.image, item.image_position, index));
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};
const loginAttempts = new Map();
const statuses = new Set(["new", "confirmed", "completed", "cancelled"]);
const publicService = (row) => ({ ...row, features: JSON.parse(row.features), popular: Boolean(row.popular) });
const adminService = (row) => ({ ...publicService(row) });
const publicSlide = (row, serviceMap) => ({
  id: row.id, eyebrow: row.eyebrow, headline: row.headline, description: row.description,
  priceText: row.price_text, priceValue: row.service_id ? serviceMap.get(row.service_id) : "",
  action: row.action, buttonLabel: row.button_label, image: row.image, imagePosition: row.image_position
});
const getServices = () => database.prepare("SELECT * FROM services ORDER BY sort_order, name").all().map(publicService);
const getProducts = () => database.prepare("SELECT * FROM products ORDER BY sort_order, name").all();
const getSlides = () => {
  const serviceMap = new Map(getServices().map((service) => [service.id, service.price == null ? "" : `GH₵${Number(service.price).toLocaleString("en-GH")}`]));
  return database.prepare("SELECT * FROM slides ORDER BY sort_order, id").all().map((row) => publicSlide(row, serviceMap));
};
const getAdminSite = () => ({
  slides: database.prepare("SELECT * FROM slides ORDER BY sort_order, id").all().map((row) => ({
    id: row.id, eyebrow: row.eyebrow, headline: row.headline, description: row.description, priceText: row.price_text,
    serviceId: row.service_id, action: row.action, buttonLabel: row.button_label, image: row.image, imagePosition: row.image_position
  })),
  services: getServices(),
  products: getProducts()
});
const sendJson = (response, status, value, headers = {}) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers });
  response.end(JSON.stringify(value));
};
const readJson = async (request, limit = 65536) => {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > limit) throw Object.assign(new Error("Request is too large."), { status: 413 });
  }
  try { return JSON.parse(body || "{}"); }
  catch { throw Object.assign(new Error("Request must contain valid JSON."), { status: 400 }); }
};
const cookieValue = (request, name) => {
  const cookies = request.headers.cookie || "";
  const entry = cookies.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : "";
};
const sessionToken = (request) => {
  const raw = cookieValue(request, "obsoulba_session");
  if (!raw) return false;
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const session = database.prepare("SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?").get(tokenHash, Date.now());
  return Boolean(session);
};
const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
function sessionCookie(response, token) {
  response.setHeader("Set-Cookie", `obsoulba_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secureCookie}`);
}
async function createSession(response) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  database.prepare("INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)").run(tokenHash, Date.now() + 8 * 60 * 60 * 1000);
  sessionCookie(response, token);
}
function requireAdmin(request, response) {
  if (sessionToken(request)) return true;
  sendJson(response, 401, { error: "Your session has expired. Please sign in again." });
  return false;
}
const validString = (value, max = 240) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
const validImage = (value) => typeof value === "string" && /^\/assets\/[a-z0-9-]+\.(jpg|png)$/i.test(value) && existsSync(resolve(root, `.${value}`));
const validPrice = (value) => value === null || value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1000000);
function cleanPrice(value) { return value === "" || value == null ? null : Number(value); }
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function checkPayloadArray(value, expected, type) {
  if (!Array.isArray(value) || value.length !== expected.length) throw Object.assign(new Error(`Expected ${expected.length} ${type} records.`), { status: 400 });
  const expectedIds = new Set(expected.map((item) => item.id));
  if (value.some((item) => !item || !expectedIds.has(item.id)) || new Set(value.map((item) => item.id)).size !== value.length) {
    throw Object.assign(new Error(`The ${type} list contains invalid or duplicate records.`), { status: 400 });
  }
}

async function handleApi(request, response, url) {
  const path = url.pathname;
  if (request.method === "GET" && path === "/api/site") {
    return sendJson(response, 200, { slides: getSlides(), services: getServices(), products: getProducts() }, { "Cache-Control": "public, max-age=30" });
  }
  if (request.method === "POST" && path === "/api/bookings") {
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const serviceId = typeof body.serviceId === "string" ? body.serviceId : "";
    const date = typeof body.date === "string" ? body.date : "";
    const time = typeof body.time === "string" ? body.time : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const service = database.prepare("SELECT id FROM services WHERE id = ?").get(serviceId);
    if (!validString(name, 80) || !/^[+0-9()\-\s]{7,24}$/.test(phone) || !service || !validDate(date) || date < new Date().toISOString().slice(0, 10) || !validString(time, 50) || notes.length > 500) {
      return sendJson(response, 400, { error: "Please check your name, phone number, service and preferred appointment date." });
    }
    const id = randomBytes(12).toString("hex");
    database.prepare("INSERT INTO bookings (id,name,phone,service_id,date,time,notes) VALUES (?,?,?,?,?,?,?)").run(id, name, phone, serviceId, date, time, notes);
    return sendJson(response, 201, { message: "Thank you — your request is with us. We'll be in touch shortly to confirm." });
  }
  if (request.method === "GET" && path === "/api/admin/status") {
    const configured = Boolean(database.prepare("SELECT id FROM admins WHERE id = 1").get());
    return sendJson(response, 200, { configured, authenticated: sessionToken(request), setupTokenRequired: Boolean(adminSetupToken || process.env.NODE_ENV === "production") });
  }
  if (request.method === "POST" && (path === "/api/admin/setup" || path === "/api/admin/login")) {
    const ip = request.socket.remoteAddress || "unknown";
    const attempt = loginAttempts.get(ip) || { count: 0, expires: 0 };
    if (attempt.expires > Date.now() && attempt.count >= 8) return sendJson(response, 429, { error: "Too many sign-in attempts. Please wait 15 minutes and try again." });
    const body = await readJson(request);
    if (path.endsWith("/setup")) {
      if (database.prepare("SELECT id FROM admins WHERE id = 1").get()) return sendJson(response, 409, { error: "An admin account already exists. Please sign in." });
      if (process.env.NODE_ENV === "production" && !adminSetupToken) return sendJson(response, 503, { error: "Set ADMIN_SETUP_TOKEN before opening initial admin setup." });
      if (adminSetupToken) {
        const supplied = Buffer.from(typeof body.setupToken === "string" ? body.setupToken : "");
        const expected = Buffer.from(adminSetupToken);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return sendJson(response, 401, { error: "The setup token is not valid." });
      }
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!/^[a-zA-Z0-9_.-]{3,48}$/.test(username) || password.length < 12 || password.length > 100) return sendJson(response, 400, { error: "Use a 3–48 character username and a password of at least 12 characters." });
      const salt = randomBytes(16).toString("hex");
      const hash = (await scrypt(password, salt, 64)).toString("hex");
      if (database.prepare("SELECT id FROM admins WHERE id = 1").get()) return sendJson(response, 409, { error: "An admin account already exists. Please sign in." });
      database.prepare("INSERT INTO admins (id,username,password_salt,password_hash) VALUES (1,?,?,?)").run(username, salt, hash);
      await createSession(response);
      loginAttempts.delete(ip);
      return sendJson(response, 201, { authenticated: true });
    }
    const admin = database.prepare("SELECT username,password_salt,password_hash FROM admins WHERE id = 1").get();
    const password = typeof body.password === "string" ? body.password : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    let authenticated = false;
    if (admin && username === admin.username && password.length <= 100) {
      const hash = await scrypt(password, admin.password_salt, 64);
      const saved = Buffer.from(admin.password_hash, "hex");
      authenticated = hash.length === saved.length && timingSafeEqual(hash, saved);
    }
    if (!authenticated) {
      const next = attempt.expires > Date.now() ? { ...attempt, count: attempt.count + 1 } : { count: 1, expires: Date.now() + 15 * 60 * 1000 };
      loginAttempts.set(ip, next);
      return sendJson(response, 401, { error: "That username or password doesn't match." });
    }
    loginAttempts.delete(ip);
    await createSession(response);
    return sendJson(response, 200, { authenticated: true });
  }
  if (request.method === "POST" && path === "/api/admin/logout") {
    const token = cookieValue(request, "obsoulba_session");
    if (token) database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(createHash("sha256").update(token).digest("hex"));
    response.setHeader("Set-Cookie", `obsoulba_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookie}`);
    return sendJson(response, 200, { authenticated: false });
  }
  if (path.startsWith("/api/admin/") && !requireAdmin(request, response)) return;
  if (request.method === "GET" && path === "/api/admin/site") return sendJson(response, 200, getAdminSite());
  if (request.method === "GET" && path === "/api/admin/bookings") {
    const bookings = database.prepare(`SELECT bookings.*, services.name AS serviceName
      FROM bookings LEFT JOIN services ON services.id = bookings.service_id
      ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END, bookings.created_at DESC LIMIT 200`).all();
    return sendJson(response, 200, bookings);
  }
  if (request.method === "PUT" && path === "/api/admin/site") {
    const body = await readJson(request);
    const old = getAdminSite();
    checkPayloadArray(body.slides, old.slides, "slide");
    checkPayloadArray(body.services, old.services, "service");
    checkPayloadArray(body.products, old.products, "product");
    for (const slide of body.slides) {
      if (!validString(slide.eyebrow, 80) || !validString(slide.headline, 140) || !validString(slide.description, 240) || !validString(slide.buttonLabel, 64) || !validImage(slide.image) || !["center","top","bottom","left","right","center 35%","center 65%"].includes(slide.imagePosition)) {
        return sendJson(response, 400, { error: "Check the slide text, image path and image focus. Use a local /assets/ image path." });
      }
    }
    for (const service of body.services) {
      if (!validString(service.name, 80) || !validPrice(service.price) || !validString(service.duration, 48) || !validString(service.description, 240) || !validImage(service.image)) {
        return sendJson(response, 400, { error: "Check each service name, price, duration, description and local image path." });
      }
    }
    for (const product of body.products) {
      if (!validString(product.name, 80) || !validPrice(product.price) || !validString(product.subtitle, 160) || !validImage(product.image)) {
        return sendJson(response, 400, { error: "Check each wig name, price, description and local image path." });
      }
    }
    database.exec("BEGIN");
    try {
      const slideUpdate = database.prepare("UPDATE slides SET eyebrow=?,headline=?,description=?,button_label=?,image=?,image_position=? WHERE id=?");
      body.slides.forEach((s) => slideUpdate.run(s.eyebrow.trim(), s.headline.trim(), s.description.trim(), s.buttonLabel.trim(), s.image, s.imagePosition, s.id));
      const serviceUpdate = database.prepare("UPDATE services SET name=?,price=?,duration=?,description=?,image=? WHERE id=?");
      body.services.forEach((s) => serviceUpdate.run(s.name.trim(), cleanPrice(s.price), s.duration.trim(), s.description.trim(), s.image, s.id));
      const productUpdate = database.prepare("UPDATE products SET name=?,price=?,subtitle=?,image=? WHERE id=?");
      body.products.forEach((p) => productUpdate.run(p.name.trim(), cleanPrice(p.price), p.subtitle.trim(), p.image, p.id));
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    return sendJson(response, 200, getAdminSite());
  }
  const bookingStatus = path.match(/^\/api\/admin\/bookings\/([a-f0-9]{24})$/);
  if (request.method === "PATCH" && bookingStatus) {
    const body = await readJson(request);
    if (!statuses.has(body.status)) return sendJson(response, 400, { error: "Choose a valid booking status." });
    const result = database.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(body.status, bookingStatus[1]);
    if (!result.changes) return sendJson(response, 404, { error: "That booking could not be found." });
    return sendJson(response, 200, { updated: true });
  }
  sendJson(response, 404, { error: "Not found." });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    if (!["GET", "HEAD"].includes(request.method || "")) {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }
    const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const file = resolve(root, `.${normalize(requested)}`);
    if (!file.startsWith(`${root}/`) || !existsSync(file) || !(await stat(file)).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found.");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(file).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Cache-Control": extname(file) === ".html" ? "no-cache" : "public, max-age=604800"
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  } catch (error) {
    const status = Number(error.status) || 500;
    if (status === 500) console.error("Request failed:", error);
    if (!response.headersSent) sendJson(response, status, { error: status === 500 ? "The server couldn't complete that request." : error.message });
    else response.destroy();
  }
});

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
server.listen(port, host, () => {
  console.log(`Obsoulba Luxe Hair is ready at http://${host}:${port}`);
  console.log(`Admin studio: http://${host}:${port}/#admin`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    database.close();
    server.close(() => process.exit(0));
  });
}
