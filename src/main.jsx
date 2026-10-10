import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabase";
import "../styles.css";
import "./react.css";

const IMAGE_BUCKET = "catalog-images";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const FALLBACK_IMAGE = "/assets/portrait.jpg";
const WHATSAPP = "https://wa.me/233549864837";
const CONTACT_EMAIL = "Otengchristiana4837@gmail.com";
const EMAIL_COMPOSE = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}`;
const HERO_DEFAULT_IMAGES = new Map([
  ["/assets/braiding.jpg", "/assets/braids1.jpeg"],
  ["/assets/wig-body-wave.jpg", "/assets/wig1.jpeg"],
  ["/assets/lashes.jpg", "/assets/eyelash1.jpeg"],
]);
const GALLERY_GROUPS = [
  { category: "wig", label: "WIG STYLE", files: ["wig1", "wig2", "wig3", "wig4", "wig5", "wig6", "wig7", "wig8", "wig10", "wig11", "wig12", "wig13", "wig14", "wig15", "wig16"] },
  { category: "nail", label: "NAIL DETAIL", files: ["nails1", "nails2", "nails3", "nails4", "nails5", "nails6"] },
  { category: "pedicure", label: "PEDICURE DETAIL", files: ["toenails1", "toenails2", "toenails3", "toenails4"] },
  { category: "lash", label: "LASH LOOK", files: ["eyelash1", "eyelash2", "eyelash3", "eyelash4"] },
  { category: "braid", label: "BRAID STYLE", files: ["braids1", "braids2", "braid3", "braids4", "braids5", "braids6", "braids7"] },
];
const GALLERY_PHOTOS = GALLERY_GROUPS.flatMap(({ category, label, files }) =>
  files.map((file, index) => ({
    src: `/assets/${file}.jpeg`,
    alt: `Obsoulba Luxe Hair ${category} style ${index + 1}`,
    caption: `${label} ${String(index + 1).padStart(2, "0")}`,
  })),
);

const money = (amount) => amount == null || amount === ""
  ? "Price on request"
  : `GH₵${Number(amount).toLocaleString("en-GH")}`;

const localDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

function queryError(error) {
  return error?.message || "Something went wrong. Please try again.";
}

function useSiteContent() {
  const [data, setData] = useState({ services: [], products: [], slides: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!supabase) {
      try {
        const response = await fetch("/api/site");
        const local = await response.json();
        if (!response.ok) throw new Error(local.error || "The salon catalogue could not be loaded.");
        setData({
          services: local.services.map((service) => ({ ...service, image_url: service.image, image_alt: service.image_alt })),
          products: local.products.map((product) => ({ ...product, image_url: product.image, image_alt: product.image_alt })),
          slides: local.slides.map((slide) => ({
            ...slide,
            price_text: slide.priceText,
            service_id: slide.serviceId,
            button_label: slide.buttonLabel,
            image_url: slide.image,
            image_position: slide.imagePosition,
          })),
        });
      } catch (loadError) {
        setError(queryError(loadError));
      }
    } else {
      const [services, products, slides] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("sort_order"),
        supabase.from("products").select("*").eq("active", true).order("sort_order"),
        supabase.from("slides").select("*").eq("active", true).order("sort_order"),
      ]);
      const failed = [services, products, slides].find((result) => result.error);
      if (failed) setError(queryError(failed.error));
      else setData({ services: services.data, products: products.data, slides: slides.data });
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { ...data, loading, error, refresh };
}

function Brand({ footer = false }) {
  return (
    <a className="brand" href="#home" aria-label="Obsoulba Luxe Hair home">
      <img src="/assets/brand-logo.jpg" alt="Obsoulba Luxe Hair" loading={footer ? "lazy" : "eager"} />
    </a>
  );
}

function AdminSetupNotice() {
  return (
    <main className="admin-page">
      <div className="admin-shell">
        <div className="admin-top"><div><a className="admin-back" href="#home">← Back to the website</a><h1>Obsoulba <em>studio.</em></h1></div></div>
        <section className="admin-panel admin-login">
          <div className="eyebrow"><span className="eyebrow-rule" /> PRIVATE ADMIN</div>
          <h2>Admin access is being set up.</h2>
          <p className="admin-panel-intro">The salon website is available now. Connect a dedicated Supabase project to enable the online studio for updating services, prices, photos and bookings.</p>
          <a className="button button-dark admin-project-link" href="https://supabase.com/dashboard/new" target="_blank" rel="noreferrer">Open Supabase project setup <span aria-hidden="true">↗</span></a>
        </section>
      </div>
    </main>
  );
}

function Header({ onBook }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const menu = [
    ["Services", "#services"],
    ["Shop wigs", "#wigs"],
    ["Our story", "#about"],
    ["Gallery", "#gallery"],
  ];
  return (
    <>
      <div className="announcement">
        <span className="announcement-mark" aria-hidden="true">✳</span>
        <span>BEAUTY, MADE PERSONAL</span>
        <span className="announcement-separator" aria-hidden="true">·</span>
        <span>ACCRA, GHANA</span>
      </div>
      <header className="site-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {menu.map(([label, href]) => <a href={href} key={href}>{label}</a>)}
        </nav>
        <div className="header-actions">
          <button className="button button-dark header-book" type="button" onClick={() => onBook()}>
            Book an appointment <span aria-hidden="true">↗</span>
          </button>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          ><span /><span /></button>
        </div>
        {menuOpen && (
          <nav className="mobile-menu" id="mobile-menu" aria-label="Mobile navigation">
            {menu.map(([label, href], index) =>
              <a href={href} key={href} onClick={closeMenu}>{label}<span>0{index + 1}</span></a>)}
            <button className="button button-pink" type="button" onClick={() => { closeMenu(); onBook(); }}>
              Book an appointment <span aria-hidden="true">↗</span>
            </button>
          </nav>
        )}
      </header>
    </>
  );
}

function Hero({ slides, services, onBook }) {
  const [current, setCurrent] = useState(0);
  const startX = React.useRef(null);
  const serviceById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const go = useCallback((index) => {
    if (slides.length) setCurrent((index + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current];
  if (!slide) return <section className="hero" aria-label="Featured services" />;
  const featuredService = serviceById.get(slide.service_id);
  const action = () => {
    if (slide.action === "wigs") document.querySelector("#wigs")?.scrollIntoView({ behavior: "smooth" });
    else if (slide.action === "services") document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" });
    else onBook(featuredService?.id || "");
  };

  return (
    <section
      className="hero"
      aria-label="Featured services"
      onPointerDown={(event) => { startX.current = event.clientX; }}
      onPointerUp={(event) => {
        if (startX.current == null) return;
        const distance = event.clientX - startX.current;
        if (Math.abs(distance) > 55) go(current + (distance < 0 ? 1 : -1));
        startX.current = null;
      }}
    >
      <div className="hero-slides" aria-live="off">
        {slides.map((item, index) => (
          <article
            className={`hero-slide${index === current ? " is-active" : ""}`}
            key={item.id}
            aria-hidden={index !== current}
            style={{
              backgroundImage: `url("${HERO_DEFAULT_IMAGES.get(item.image_url) || item.image_url || FALLBACK_IMAGE}")`,
              backgroundPosition: item.image_position || "center",
            }}
          >
            <div className="hero-content">
              <div className="hero-kicker">{item.eyebrow}</div>
              <h2>{item.headline.split("\n").map((line, lineIndex) =>
                <React.Fragment key={`${item.id}-${lineIndex}`}>{line}{lineIndex < item.headline.split("\n").length - 1 && <br />}</React.Fragment>)}</h2>
              <p className="hero-description">{item.description}</p>
              {item.price_text && <p className="hero-price">{item.price_text} <strong>{featuredService ? money(featuredService.price) : item.priceValue || ""}</strong></p>}
              <button className="button button-pink" type="button" onClick={action}>
                {item.button_label} <span aria-hidden="true">↗</span>
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="hero-edge">
        <span className="hero-index">{String(current + 1).padStart(2, "0")} <i /> {String(slides.length).padStart(2, "0")}</span>
        <div className="hero-controls">
          <button className="hero-arrow" type="button" aria-label="Previous slide" onClick={() => go(current - 1)}>←</button>
          <div className="hero-dots" aria-label="Choose a slide">
            {slides.map((item, index) => <button
              className="hero-dot"
              type="button"
              key={item.id}
              aria-label={`Show slide ${index + 1}`}
              aria-current={index === current}
              onClick={() => go(index)}
            />)}
          </div>
          <button className="hero-arrow" type="button" aria-label="Next slide" onClick={() => go(current + 1)}>→</button>
        </div>
        <span className="hero-caption">OBS OULBA / LUXE HAIR</span>
      </div>
      <div className="hero-scroll-cue"><span /> SCROLL TO DISCOVER</div>
    </section>
  );
}

function Services({ services, onBook }) {
  return (
    <section className="services-section" id="services">
      <div className="section-wrap">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="eyebrow-rule" /> YOUR MOMENT, YOUR STYLE</div><h2>Services to <em>love.</em></h2></div>
          <p>Considered details. A softer touch.<br />Always unmistakably you.</p>
        </div>
        <div className="service-rail" aria-label="Beauty services">
          {services.map((service) => (
            <article className="service-card" key={service.id}>
              <div className={`service-media${service.name === "Braiding" ? " service-media-braid-source" : ""}`}>
                <img src={service.image_url || FALLBACK_IMAGE} alt={service.image_alt || service.name} loading="lazy" decoding="async" />
                {service.popular && <span className="service-badge">Popular</span>}
                <span className="service-duration">{service.duration}</span>
              </div>
              <div className="service-body">
                <div className="service-title-row"><h3>{service.name}</h3><span className="service-start">{service.price == null ? "" : "From"}</span></div>
                <p>{service.description}</p>
                <ul className="service-features">{(service.features || []).map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <div className="service-card-footer">
                  <div><span className="service-price-label">{service.price == null ? "PERSONALISED PRICING" : "STARTING FROM"}</span><strong className="service-price">{money(service.price)}</strong></div>
                  <button className="button button-pink book-service" type="button" onClick={() => onBook(service.id)}>Book now <span aria-hidden="true">↗</span></button>
                </div>
              </div>
            </article>
          ))}
          {!services.length && <p className="empty-content">Our service list is being updated. Message us on WhatsApp and we’ll be happy to help.</p>}
        </div>
        <div className="rail-hint"><span>SWIPE TO EXPLORE</span><span className="rail-hint-line" /><span>01 — {String(services.length).padStart(2, "0")}</span></div>
      </div>
    </section>
  );
}

function Products({ products }) {
  return (
    <section className="wigs-section" id="wigs">
      <div className="section-wrap">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="eyebrow-rule" /> THE LUXE HAIR EDIT</div><h2>Meet your new <em>favourite.</em></h2></div>
          <a className="text-link desktop-only" href="#contact">Enquire about a wig <span aria-hidden="true">↗</span></a>
        </div>
        <div className="product-grid">
          {products.map((product, index) => (
            <article className="product-card" key={product.id}>
              <div className="product-media"><img src={product.image_url || FALLBACK_IMAGE} alt={product.image_alt || product.name} loading="lazy" /><span className="product-number">{String(index + 1).padStart(2, "0")}</span></div>
              <div className="product-body">
                <div><h3>{product.name}</h3><p>{product.subtitle || "A little luxury, every day."}</p></div>
                <div className="product-meta">
                  <span className="product-price">{money(product.price)}</span>
                  <a className="button button-dark" href={`${WHATSAPP}?text=${encodeURIComponent(`Hello Obsoulba Luxe Hair, I'm interested in the ${product.name}.`)}`} target="_blank" rel="noreferrer">Enquire <span aria-hidden="true">↗</span></a>
                </div>
              </div>
            </article>
          ))}
          {!products.length && <p className="empty-content">Our wig collection is being updated. Message us on WhatsApp to ask about available styles.</p>}
        </div>
      </div>
    </section>
  );
}

function BookingModal({ open, services, initialService, onClose }) {
  const [feedback, setFeedback] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceId, setServiceId] = useState("");

  useEffect(() => {
    if (!open) return;
    setServiceId(initialService || "");
    setFeedback("");
    setSuccess(false);
    document.body.classList.add("no-scroll");
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, initialService, onClose]);

  async function submitBooking(event) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSaving(true);
    setFeedback("");
    const booking = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      service_id: values.serviceId,
      appointment_date: values.date,
      preferred_time: values.time,
      notes: values.notes.trim(),
    };
    let bookingError;
    if (supabase) {
      const { error } = await supabase.from("bookings").insert(booking);
      bookingError = error;
    } else {
      try {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: booking.name,
            phone: booking.phone,
            serviceId: booking.service_id,
            date: booking.appointment_date,
            time: booking.preferred_time,
            notes: booking.notes,
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          bookingError = new Error(result.error || "Your request could not be sent. Please try WhatsApp.");
        }
      } catch (error) {
        bookingError = error;
      }
    }
    if (bookingError) setFeedback(queryError(bookingError));
    else {
      setFeedback("Your request has been received. We’ll contact you on WhatsApp to confirm your appointment.");
      setSuccess(true);
      form.reset();
      setServiceId("");
    }
    setSaving(false);
  }

  if (!open) return null;
  return (
    <div className="booking-modal is-open" aria-hidden="false">
      <button className="modal-backdrop" type="button" aria-label="Close booking form" onClick={onClose} />
      <section className="booking-panel" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close booking form">×</button>
        <div className="eyebrow"><span className="eyebrow-rule" /> YOUR TIME, YOUR WAY</div>
        <h2 id="booking-title">Let's get you <em>booked.</em></h2>
        <p className="modal-intro">Choose a service, preferred date and time. We’ll contact you on WhatsApp to confirm your appointment.</p>
        <form id="booking-form" onSubmit={submitBooking}>
          <label>Your name<input name="name" autoComplete="name" required maxLength="80" placeholder="e.g. Ama Mensah" /></label>
          <label>Phone or WhatsApp number<input name="phone" autoComplete="tel" type="tel" required maxLength="24" placeholder="+233 54 000 0000" /></label>
          <label>Choose a service
            <select name="serviceId" required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              <option value="">Choose a service</option>
              {services.map((service) => <option value={service.id} key={service.id}>{service.name}{service.price == null ? "" : ` · from ${money(service.price)}`}</option>)}
            </select>
          </label>
          <div className="form-row">
            <label>Preferred date<input name="date" type="date" min={localDate()} required /></label>
            <label>Preferred time<select name="time" required defaultValue=""><option value="">Choose a time</option><option>Morning (9am–12pm)</option><option>Afternoon (12pm–4pm)</option><option>Evening (4pm–7pm)</option></select></label>
          </div>
          <label>Anything else we should know? <span className="optional-label">OPTIONAL</span>
            <textarea name="notes" rows="3" maxLength="500" placeholder="Share a style or detail you're thinking about…" />
          </label>
          <p className={`form-feedback${success ? " success" : ""}`} role="status">{feedback}</p>
          <button className="button button-pink button-wide" type="submit" disabled={saving || success}>
            {saving ? "Sending your request…" : success ? "Request sent" : "Send appointment request"} {!saving && !success && <span aria-hidden="true">↗</span>}
          </button>
          <small>We'll only use your details to help with this appointment.</small>
        </form>
      </section>
    </div>
  );
}

function StoryAndGallery() {
  return (
    <>
      <section className="story-section" id="about">
        <div className="story-image"><img src="/assets/portrait.jpg" alt="A client wearing voluminous, glossy waves" loading="lazy" /><span className="image-note">THE OBSOULBA FEELING · EST. WITH LOVE</span></div>
        <div className="story-copy">
          <div className="eyebrow"><span className="eyebrow-rule" /> A NOTE FROM US</div>
          <h2>Come as you are.<br />Leave a little more <em>you.</em></h2>
          <p>We believe getting ready should feel like being cared for. At Obsoulba Luxe Hair, thoughtful styling, a warm welcome and the little details help you feel your best.</p>
          <a className="button button-dark" href="#book">Let's make time for you <span aria-hidden="true">↗</span></a>
          <div className="story-signature">With love, <span>Obsoulba</span></div>
        </div>
      </section>
      <section className="gallery-section section-wrap" id="gallery">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="eyebrow-rule" /> THE DETAILS DO IT</div><h2>Little moments, <em>loved.</em></h2></div>
          <a className="text-link" href={WHATSAPP} target="_blank" rel="noreferrer">Ask us about a look <span aria-hidden="true">↗</span></a>
        </div>
        <div className="gallery-grid">
          <figure className="gallery-item gallery-large"><img src="/assets/wig-deep-wave.jpg" alt="Soft, dark deep-wave wig styling" loading="lazy" /><figcaption>THE SOFT-GLAM MOMENT</figcaption></figure>
          <figure className="gallery-item"><img src="/assets/nails.jpg" alt="Pink nail art with delicate details" loading="lazy" /><figcaption>FINISHING TOUCHES</figcaption></figure>
          <figure className="gallery-item"><img src="/assets/lashes.jpg" alt="A close-up of professionally styled lashes" loading="lazy" /><figcaption>MADE TO FEEL LIKE YOU</figcaption></figure>
          <figure className="gallery-item"><img src="/assets/braiding.jpg" alt="Neat braids styled with care" loading="lazy" /><figcaption>BEAUTY IN EVERY DETAIL</figcaption></figure>
          {GALLERY_PHOTOS.map((photo) => (
            <figure className="gallery-item" key={photo.src}>
              <img src={photo.src} alt={photo.alt} loading="lazy" />
              <figcaption>{photo.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}

function Footer({ onBook }) {
  return (
    <>
      <section className="booking-callout" id="contact">
        <div className="callout-flower" aria-hidden="true">✳</div>
        <div className="eyebrow"><span className="eyebrow-rule" /> YOUR NEXT FAVOURITE LOOK STARTS HERE</div>
        <h2>A little time for <em>you?</em></h2>
        <p>Tell us what you're dreaming of. We'll take it from there.</p>
        <div className="callout-actions">
          <button className="button button-pink" type="button" onClick={() => onBook()}>Book your appointment <span aria-hidden="true">↗</span></button>
          <a className="button button-outline" href={WHATSAPP} target="_blank" rel="noreferrer">Chat with us on WhatsApp <span aria-hidden="true">↗</span></a>
        </div>
        <div className="callout-contact" aria-label="Contact Obsoulba Luxe Hair">
          <a href="tel:+233549864837"><span>CALL US</span><strong>054 986 4837</strong></a>
          <div className="callout-email">
            <a href={EMAIL_COMPOSE} target="_blank" rel="noreferrer"><span>EMAIL US</span><strong>{CONTACT_EMAIL}</strong></a>
            <a className="email-app-link" href={`mailto:${CONTACT_EMAIL}`}>Open in your email app</a>
          </div>
        </div>
      </section>
      <footer className="site-footer">
        <div className="footer-main section-wrap">
          <div className="footer-brand"><Brand footer /><p>Beauty, made personal.<br />Accra, Ghana.</p></div>
          <div className="footer-column"><span>COME ON IN</span><a href="#services">Our services</a><a href="#wigs">Shop wigs</a><a href="#about">Our story</a></div>
          <div className="footer-column"><span>SAY HELLO</span><a href="tel:+233549864837">054 986 4837</a><a href={EMAIL_COMPOSE} target="_blank" rel="noreferrer">Email us</a><a href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp us</a><a href="#gallery">View the lookbook</a></div>
          <button className="footer-book" type="button" onClick={() => onBook()}>A moment<br />for <em>you.</em><span>BOOK NOW ↗</span></button>
        </div>
        <div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} OBSOULBA LUXE HAIR</span><span>MADE WITH CARE IN GHANA</span><a href="#admin">ADMIN</a></div>
      </footer>
      <a className="whatsapp-float" href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="Chat with Obsoulba Luxe Hair on WhatsApp">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.48A11.77 11.77 0 0 0 12.14 0C5.62 0 .32 5.3.32 11.82c0 2.08.54 4.12 1.57 5.92L.22 24l6.42-1.68a11.8 11.8 0 0 0 5.5 1.4h.01c6.51 0 11.81-5.3 11.82-11.82a11.75 11.75 0 0 0-3.45-8.42ZM12.15 21.7h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.81 1 1.02-3.72-.24-.38a9.83 9.83 0 0 1-1.51-5.2c0-5.47 4.45-9.92 9.93-9.92a9.87 9.87 0 0 1 7.03 2.91 9.87 9.87 0 0 1 2.9 7.04c0 5.48-4.45 9.93-9.94 9.93Zm5.45-7.44c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.36.22-.66.07-.3-.15-1.28-.47-2.43-1.49-.9-.8-1.5-1.79-1.68-2.09-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.68-1.63-.93-2.24-.24-.58-.49-.5-.68-.51l-.58-.01c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.51s1.08 2.92 1.23 3.12c.15.2 2.13 3.25 5.16 4.56.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.07-.12-.27-.2-.57-.35Z" /></svg>
      </a>
    </>
  );
}

function Home({ content, onBook }) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [initialService, setInitialService] = useState("");
  const openBooking = useCallback((serviceId = "") => {
    setInitialService(serviceId);
    setBookingOpen(true);
    history.replaceState(null, "", `${location.pathname}${location.search}#book`);
  }, []);
  const closeBooking = useCallback(() => {
    setBookingOpen(false);
    history.replaceState(null, "", `${location.pathname}${location.search}#home`);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      if (location.hash === "#book") openBooking();
    };
    window.addEventListener("hashchange", onHashChange);
    if (location.hash === "#book") openBooking();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [openBooking]);

  if (content.loading) return <div className="site-loading"><Brand /><p>Opening the Obsoulba experience…</p></div>;
  if (content.error) return <div className="site-loading">
    <Brand />
    <p className="load-error">We’re having trouble loading the latest services and products. Please try again, or message us on <a href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp</a> for help.</p>
    <button className="button button-dark" onClick={content.refresh}>Try again</button>
    <details className="connection-details"><summary>Technical details</summary><code>{content.error}</code></details>
  </div>;
  return (
    <>
      <Header onBook={openBooking} />
      <main id="home">
        <Hero slides={content.slides} services={content.services} onBook={openBooking} />
        <section className="intro section-wrap">
          <div className="eyebrow"><span className="eyebrow-rule" /> A LITTLE LUXURY, JUST FOR YOU</div>
          <div className="intro-layout">
            <h1>Beauty that feels<br /><em>like you.</em></h1>
            <div className="intro-copy"><p>From braids and wigs to lashes and nails, enjoy thoughtful beauty services and quality hair, styled to make every day feel special.</p><a className="text-link" href="#services">Explore our services <span aria-hidden="true">↗</span></a></div>
          </div>
          <div className="intro-stamp" aria-hidden="true">O<br /><span>L</span></div>
        </section>
        <Services services={content.services} onBook={openBooking} />
        <Products products={content.products} />
        <StoryAndGallery />
      </main>
      <Footer onBook={openBooking} />
      <BookingModal open={bookingOpen} services={content.services} initialService={initialService} onClose={closeBooking} />
    </>
  );
}

async function uploadImage(file, folder, id) {
  if (!file) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 6 MB or smaller.");
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${folder}/${id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(queryError(error));
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

function storagePath(imageUrl) {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(url.pathname.slice(index + marker.length)) : null;
  } catch {
    return null;
  }
}

async function removeStoredImage(imageUrl) {
  const path = storagePath(imageUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) throw new Error(`The item was saved, but its old image could not be removed: ${queryError(error)}`);
}

function ImageUpload({ imageUrl, folder, id, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function chooseImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onUploaded(await uploadImage(file, folder, id));
    } catch (uploadError) {
      setError(queryError(uploadError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-image-upload">
      <img src={imageUrl || FALLBACK_IMAGE} alt="Current item" />
      <div>
        <label className="button button-outline upload-button">
          {busy ? "Uploading…" : "Choose image"}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} disabled={busy} />
        </label>
        <small>JPG, PNG or WebP · up to 6 MB</small>
        {error && <span className="admin-inline-error" role="alert">{error}</span>}
      </div>
    </div>
  );
}

function CatalogEditor({ item, kind, onSave, onRemove, onImageChanged }) {
  const service = kind === "service";
  const folder = service ? "services" : "products";
  const [draft, setDraft] = useState(item);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => { setDraft(item); }, [item]);
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const price = draft.price === "" || draft.price == null ? null : Number(draft.price);
    if (price != null && (!Number.isFinite(price) || price < 0 || price > 1_000_000)) {
      setError(true);
      setMessage("Enter a valid price between 0 and 1,000,000, or leave it blank.");
      setSaving(false);
      return;
    }
    const payload = {
      name: draft.name.trim(),
      price,
      image_url: draft.image_url || null,
      image_alt: draft.image_alt?.trim() || draft.name.trim(),
      sort_order: Number(draft.sort_order) || 0,
      active: Boolean(draft.active),
      ...(service ? {
        duration: draft.duration.trim(),
        description: draft.description.trim(),
        features: (Array.isArray(draft.features) ? draft.features : draft.features.split(",")).map((feature) => feature.trim()).filter(Boolean),
        popular: Boolean(draft.popular),
      } : { subtitle: draft.subtitle.trim() }),
    };
    if (!payload.name) {
      setError(true);
      setMessage("Add a name before saving.");
      setSaving(false);
      return;
    }
    const saved = await onSave(item, payload, kind);
    setError(!saved.ok);
    if (saved.warning) setError(true);
    setMessage(saved.message);
    if (saved.ok) setDraft(saved.item);
    setSaving(false);
  }

  async function remove() {
    if (!window.confirm(`Hide ${item.name} from the website? Customers will no longer see it, but its booking history will be kept.`)) return;
    setSaving(true);
    const result = await onRemove(item, kind);
    setError(!result.ok);
    if (result.warning) setError(true);
    setMessage(result.message);
    setSaving(false);
  }

  return (
    <form className="admin-item catalog-editor" onSubmit={submit}>
      <div className="admin-item-heading">
        <h3>{item.name || (service ? "New service" : "New wig")}</h3>
        <span className={`admin-visibility ${draft.active ? "" : "is-hidden"}`}>{draft.active ? "LIVE" : "HIDDEN"}</span>
      </div>
      <ImageUpload
        imageUrl={draft.image_url}
        folder={folder}
        id={item.id}
        onUploaded={(imageUrl) => {
          const previous = draft.image_url;
          set("image_url", imageUrl);
          onImageChanged?.(item.id, imageUrl, previous);
        }}
      />
      <div className="admin-grid">
        <label>Name<input required maxLength="80" value={draft.name} onChange={(event) => set("name", event.target.value)} /></label>
        <label>Price (GH₵)<input type="number" min="0" max="1000000" step="0.01" value={draft.price ?? ""} placeholder="Leave blank for price on request" onChange={(event) => set("price", event.target.value)} /></label>
        {service ? <>
          <label>Duration<input maxLength="48" value={draft.duration || ""} onChange={(event) => set("duration", event.target.value)} /></label>
          <label>Image description<input maxLength="160" value={draft.image_alt || ""} onChange={(event) => set("image_alt", event.target.value)} /></label>
          <label className="span-all">Description<textarea rows="2" maxLength="240" value={draft.description || ""} onChange={(event) => set("description", event.target.value)} /></label>
          <label className="span-all">Features (separate with commas)<input maxLength="300" value={Array.isArray(draft.features) ? draft.features.join(", ") : draft.features || ""} onChange={(event) => set("features", event.target.value)} /></label>
          <label className="admin-check"><input type="checkbox" checked={Boolean(draft.popular)} onChange={(event) => set("popular", event.target.checked)} /> Show Popular badge</label>
        </> : <>
          <label>Short description<input maxLength="160" value={draft.subtitle || ""} onChange={(event) => set("subtitle", event.target.value)} /></label>
          <label>Image description<input maxLength="160" value={draft.image_alt || ""} onChange={(event) => set("image_alt", event.target.value)} /></label>
        </>}
        <label className="admin-check"><input type="checkbox" checked={Boolean(draft.active)} onChange={(event) => set("active", event.target.checked)} /> Visible on website</label>
      </div>
      {message && <p className={`admin-status${error ? " error" : ""}`} role="status">{message}</p>}
      <div className="admin-actions">
        <button className="button button-pink" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        <button className="button button-remove" type="button" disabled={saving} onClick={remove}>Remove</button>
      </div>
    </form>
  );
}

function SlideEditor({ slide, services, onSave, onRemove, onImageChanged }) {
  const [draft, setDraft] = useState(slide);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => setDraft(slide), [slide]);
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const result = await onSave(slide, {
      eyebrow: draft.eyebrow.trim(),
      headline: draft.headline.trim(),
      description: draft.description.trim(),
      price_text: draft.price_text || null,
      service_id: draft.service_id || null,
      action: draft.action,
      button_label: draft.button_label.trim(),
      image_url: draft.image_url || null,
      image_position: draft.image_position,
      sort_order: Number(draft.sort_order) || 0,
      active: Boolean(draft.active),
    }, "slide");
    setError(!result.ok);
    setMessage(result.message);
    if (result.ok) setDraft(result.item);
    setSaving(false);
  }

  async function remove() {
    if (!window.confirm(`Hide the "${slide.eyebrow}" hero slide?`)) return;
    setSaving(true);
    const result = await onRemove(slide, "slide");
    setError(!result.ok);
    setMessage(result.message);
    setSaving(false);
  }

  return (
    <form className="admin-item catalog-editor" onSubmit={submit}>
      <div className="admin-item-heading"><h3>{draft.eyebrow || "New hero story"}</h3><span className={`admin-visibility ${draft.active ? "" : "is-hidden"}`}>{draft.active ? "LIVE" : "HIDDEN"}</span></div>
      <ImageUpload imageUrl={draft.image_url} folder="slides" id={slide.id} onUploaded={(url) => { const previous = draft.image_url; set("image_url", url); onImageChanged(slide.id, url, previous); }} />
      <div className="admin-grid">
        <label>Eyebrow<input required maxLength="80" value={draft.eyebrow || ""} onChange={(event) => set("eyebrow", event.target.value)} /></label>
        <label>Button label<input required maxLength="64" value={draft.button_label || ""} onChange={(event) => set("button_label", event.target.value)} /></label>
        <label className="span-all">Headline<textarea required rows="2" maxLength="140" value={draft.headline || ""} onChange={(event) => set("headline", event.target.value)} /></label>
        <label className="span-all">Description<textarea rows="2" maxLength="240" value={draft.description || ""} onChange={(event) => set("description", event.target.value)} /></label>
        <label>Button action<select value={draft.action || "book"} onChange={(event) => set("action", event.target.value)}><option value="book">Book an appointment</option><option value="wigs">Explore wigs</option><option value="services">View services</option></select></label>
        <label>Image focus<select value={draft.image_position || "center"} onChange={(event) => set("image_position", event.target.value)}>{["center", "top", "bottom", "left", "right", "center 35%", "center 65%"].map((position) => <option key={position}>{position}</option>)}</select></label>
        <label>Price label (optional)<input maxLength="24" value={draft.price_text || ""} onChange={(event) => set("price_text", event.target.value)} placeholder="From" /></label>
        <label>Link price to service<select value={draft.service_id || ""} onChange={(event) => set("service_id", event.target.value)}><option value="">No linked service</option>{services.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>
        <label className="admin-check"><input type="checkbox" checked={Boolean(draft.active)} onChange={(event) => set("active", event.target.checked)} /> Visible on website</label>
      </div>
      {message && <p className={`admin-status${error ? " error" : ""}`} role="status">{message}</p>}
      <div className="admin-actions"><button className="button button-pink" type="submit" disabled={saving}>{saving ? "Saving…" : "Save slide"}</button><button className="button button-remove" type="button" disabled={saving} onClick={remove}>Remove</button></div>
    </form>
  );
}

function AdminDashboard({ user, onSignOut }) {
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [slides, setSlides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const [serviceResult, productResult, slideResult, bookingResult] = await Promise.all([
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("slides").select("*").order("sort_order"),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const failed = [serviceResult, productResult, slideResult, bookingResult].find((result) => result.error);
    if (failed) setError(queryError(failed.error));
    else {
      setServices(serviceResult.data);
      setProducts(productResult.data);
      setSlides(slideResult.data);
      setBookings(bookingResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function saveItem(item, payload, kind) {
    const table = kind === "service" ? "services" : kind === "product" ? "products" : "slides";
    const oldImage = item.image_url;
    const { data, error: saveError } = await supabase.from(table).update(payload).eq("id", item.id).select().single();
    if (saveError) return { ok: false, message: queryError(saveError) };
    if (kind === "service") setServices((current) => current.map((entry) => entry.id === item.id ? data : entry));
    else if (kind === "product") setProducts((current) => current.map((entry) => entry.id === item.id ? data : entry));
    else setSlides((current) => current.map((entry) => entry.id === item.id ? data : entry));
    setNotice(`${data.name || data.eyebrow} saved successfully.`);
    try {
      if (oldImage && oldImage !== data.image_url) await removeStoredImage(oldImage);
      return { ok: true, item: data, message: `${data.name || data.eyebrow} saved successfully.` };
    } catch (cleanupError) {
      return { ok: true, warning: true, item: data, message: queryError(cleanupError) };
    }
  }

  async function addItem(kind) {
    const table = kind === "service" ? "services" : kind === "product" ? "products" : "slides";
    const position = kind === "service" ? services.length : kind === "product" ? products.length : slides.length;
    const common = { id: crypto.randomUUID(), price: null, image_url: null, image_alt: "", sort_order: position, active: true };
    const item = kind === "service"
      ? { ...common, name: "New service", duration: "", description: "", features: [], popular: false }
      : kind === "product"
        ? { ...common, name: "New wig", subtitle: "" }
        : { id: crypto.randomUUID(), eyebrow: "NEW LOOK", headline: "YOUR NEXT SIGNATURE.", description: "", price_text: null, service_id: null, action: "book", button_label: "BOOK AN APPOINTMENT", image_url: null, image_position: "center", sort_order: position, active: true };
    const { data, error: insertError } = await supabase.from(table).insert(item).select().single();
    if (insertError) {
      setError(queryError(insertError));
      return;
    }
    if (kind === "service") setServices((current) => [...current, data]);
    else if (kind === "product") setProducts((current) => [...current, data]);
    else setSlides((current) => [...current, data]);
    setNotice("New item created. Add its details and save when ready.");
    window.setTimeout(() => document.getElementById(`admin-item-${data.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  async function removeItem(item, kind) {
    const table = kind === "service" ? "services" : kind === "product" ? "products" : "slides";
    const { error: updateError } = await supabase.from(table).update({ active: false }).eq("id", item.id);
    if (updateError) return { ok: false, message: queryError(updateError) };
    if (kind === "service") setServices((current) => current.map((entry) => entry.id === item.id ? { ...entry, active: false } : entry));
    else if (kind === "product") setProducts((current) => current.map((entry) => entry.id === item.id ? { ...entry, active: false } : entry));
    else setSlides((current) => current.map((entry) => entry.id === item.id ? { ...entry, active: false } : entry));
    try {
      await removeStoredImage(item.image_url);
      return { ok: true, message: `${item.name || item.eyebrow} is now hidden from customers.` };
    } catch (removeError) {
      return { ok: true, warning: true, message: queryError(removeError) };
    }
  }

  async function updateBooking(bookingId, status) {
    const { error: updateError } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (updateError) setError(queryError(updateError));
    else setBookings((current) => current.map((booking) => booking.id === bookingId ? { ...booking, status } : booking));
  }

  function trackImageChange(id, imageUrl, oldUrl, kind) {
    if (oldUrl && oldUrl !== imageUrl) setNotice("New image uploaded. Save the item to apply it to the live website.");
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <div className="admin-top">
          <div><a className="admin-back" href="#home">← Back to the website</a><h1>Obsoulba <em>studio.</em></h1></div>
          <div className="admin-account"><span>{user.email}</span><button className="button button-outline admin-signout" type="button" onClick={onSignOut}>Sign out</button></div>
        </div>
        <section className="admin-panel">
          <div className="admin-top"><div><div className="eyebrow"><span className="eyebrow-rule" /> YOUR WEBSITE</div><h2>Make it yours.</h2></div><button className="button button-outline admin-signout" type="button" onClick={refresh}>Refresh</button></div>
          <p className="admin-panel-intro">Manage your live services, prices, wig collection, hero photography and appointment requests.</p>
          {error && <p className="admin-status error" role="alert">{error}</p>}
          {notice && <p className="admin-status success" role="status">{notice}</p>}
          {loading ? <p>Loading your studio…</p> : <>
            <section className="admin-section">
              <div className="admin-section-title"><div><h2>Hero stories</h2><p>Update slide copy, photos and focal points.</p></div><button type="button" className="button button-outline admin-add" onClick={() => addItem("slide")}>Add slide +</button></div>
              {slides.map((slide) => <div id={`admin-item-${slide.id}`} key={slide.id}><SlideEditor slide={slide} services={services.filter((service) => service.active)} onSave={saveItem} onRemove={removeItem} onImageChanged={(id, url, old) => trackImageChange(id, url, old, "slide")} /></div>)}
            </section>
            <section className="admin-section">
              <div className="admin-section-title"><div><h2>Services & pricing</h2><p>Prices are in Ghana cedis; leave a price empty to show “Price on request”.</p></div><button type="button" className="button button-outline admin-add" onClick={() => addItem("service")}>Add service +</button></div>
              {services.map((service) => <div id={`admin-item-${service.id}`} key={service.id}><CatalogEditor item={service} kind="service" onSave={saveItem} onRemove={removeItem} onImageChanged={(id, url, old) => trackImageChange(id, url, old, "service")} /></div>)}
            </section>
            <section className="admin-section">
              <div className="admin-section-title"><div><h2>Wigs for sale</h2><p>Add new products, upload photos and update prices.</p></div><button type="button" className="button button-outline admin-add" onClick={() => addItem("product")}>Add wig +</button></div>
              {products.map((product) => <div id={`admin-item-${product.id}`} key={product.id}><CatalogEditor item={product} kind="product" onSave={saveItem} onRemove={removeItem} onImageChanged={(id, url, old) => trackImageChange(id, url, old, "product")} /></div>)}
            </section>
          </>}
        </section>
        <section className="admin-panel">
          <div className="eyebrow"><span className="eyebrow-rule" /> APPOINTMENT REQUESTS</div>
          <h2>Appointment requests</h2>
          {loading ? <p>Loading appointment requests…</p> : <div className="booking-table-wrap">
            <table className="booking-table">
              <thead><tr><th>Client</th><th>Service</th><th>Preferred time</th><th>Notes</th><th>Status</th></tr></thead>
              <tbody>{bookings.length ? bookings.map((booking) => <tr key={booking.id}>
                <td>{booking.name}<br /><small><a href={`tel:${booking.phone}`}>{booking.phone}</a></small></td>
                <td>{booking.service_name}</td>
                <td>{booking.appointment_date}<br />{booking.preferred_time}</td>
                <td>{booking.notes || "—"}</td>
                <td><select aria-label={`Booking status for ${booking.name}`} value={booking.status} onChange={(event) => updateBooking(booking.id, event.target.value)}>{["new", "confirmed", "completed", "cancelled"].map((status) => <option key={status}>{status}</option>)}</select></td>
              </tr>) : <tr><td colSpan="5">No appointment requests yet.</td></tr>}</tbody>
            </table>
          </div>}
        </section>
      </div>
    </main>
  );
}

function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setMessage(queryError(error));
      setSubmitting(false);
      return;
    }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
    if (profileError || !profile?.is_admin) {
      await supabase.auth.signOut();
      setMessage(profileError ? queryError(profileError) : "This account hasn't been granted admin access yet.");
      setSubmitting(false);
      return;
    }
    onSignedIn(data.user);
    setSubmitting(false);
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <div className="admin-top"><div><a className="admin-back" href="#home">← Back to the website</a><h1>Obsoulba <em>studio.</em></h1></div></div>
        <section className="admin-panel admin-login">
          <div className="eyebrow"><span className="eyebrow-rule" /> PRIVATE ADMIN</div>
          <h2>Welcome back.</h2>
          <p className="admin-panel-intro">Sign in with the admin account created in your Supabase project.</p>
          <form className="admin-form" onSubmit={submit}>
            <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {message && <p className="admin-status error" role="alert">{message}</p>}
            <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"} {!submitting && <span aria-hidden="true">↗</span>}</button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Admin({ onHome }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (!data.user) {
        setLoading(false);
        return;
      }
      const { data: profile, error } = await supabase.from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
      if (error || !profile?.is_admin) {
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      setUser(data.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) window.alert(queryError(error));
    else {
      setUser(null);
      onHome();
    }
  }

  if (loading) return <div className="site-loading"><Brand /><p>Opening your private studio…</p></div>;
  return user ? <AdminDashboard user={user} onSignOut={signOut} /> : <AdminLogin onSignedIn={setUser} />;
}

function App() {
  const content = useSiteContent();
  const [isAdmin, setIsAdmin] = useState(location.hash === "#admin");
  useEffect(() => {
    const handleRoute = () => setIsAdmin(location.hash === "#admin");
    window.addEventListener("hashchange", handleRoute);
    return () => window.removeEventListener("hashchange", handleRoute);
  }, []);

  if (isAdmin) return supabase ? <Admin onHome={() => { location.hash = "#home"; }} /> : <AdminSetupNotice />;
  if (content.loading) return <div className="site-loading"><Brand /><p>Opening the Obsoulba experience…</p></div>;
  if (content.error) return <div className="site-loading">
    <Brand />
    <p className="load-error">We’re having trouble loading the latest services and products. Please try again, or message us on <a href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp</a> for help.</p>
    <button className="button button-dark" onClick={content.refresh}>Try again</button>
    <details className="connection-details"><summary>Technical details</summary><code>{content.error}</code></details>
  </div>;
  return <Home content={content} />;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
