// The page round a template's story (docs/FILM-TEMPLATES.md). It reads xp-content.js, dresses the
// page in the content's colours and fonts, and draws the menu, the footer and a place for the
// story ([data-xp-film-track]), which xp-lib/xp-character.js fills with the camera, the words and
// the cards. Without a model, or with the story off, it draws the same scenes as plain sections.
// Kept the same in every template that uses it (templates/_kit); style it from the template's own
// index.html through the names listed in film-shell.css.
(() => {
  const read = () => window.__XP_HASH__ || window.__XP__ || {};
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  let D = read();
  const fill = (s) => String(s == null ? "" : s).replace(/\{name\}/g, (D.brand && D.brand.name) || "").replace(/\{year\}/g, String(new Date().getFullYear()));
  const esc = (s) => fill(s).replace(/[&<>"']/g, (c) => ESC[c]);
  const href = (h) => { const v = String(h || "").trim(); return /^(https?:|mailto:|tel:|#|\/|\.\/)/i.test(v) ? v : ""; };
  const url = (u) => { const v = String(u || "").trim(); return /^(https:|data:image\/|\.\/|\/)/i.test(v) ? v : ""; };
  const model = (u) => { const v = String(u || "").trim(); return /^(https:|data:(model\/gltf-binary|application\/octet-stream);base64,|\.\/|\/)/i.test(v) ? v : ""; };
  const hasChar = () => !!model(D.character && D.character.src);
  const storyOn = () => hasChar() && !(D.film && D.film.on === false) && !window.__XP_LITE__;
  const HEX = /^#[0-9a-f]{6}$/i;
  const mixc = (a, b, p) => `color-mix(in oklab, ${a} ${p}%, ${b})`;

  // The stage's tone follows the character's gradient: light words on a dark one, dark on a light one.
  const lumOf = (h) => HEX.test(h || "") ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0) : 0;
  const stops = () => { const st = (D.design && Array.isArray(D.design.stops)) ? D.design.stops : []; return [st[0] || "#0b0b0f", st[1] || st[0] || "#9aa3b5", st[2] || st[0] || "#22232b"]; };
  const stageDark = () => { const s = stops(); return lumOf(s[0]) * 0.8 + lumOf(s[2]) * 0.2 < 0.179; };
  const stageVars = () => {
    const s = stops(), dk = stageDark();
    return { "--stage": s[0], "--xp-ink": dk ? mixc(s[0], "#ffffff", 5) : mixc(s[0], "#0c0c11", 12), "--xp-ink2": dk ? mixc(s[0], "#e7e5f0", 24) : mixc(s[0], "#3a3a46", 24) };
  };

  const fonts = new Set();
  function theme() {
    const t = D.theme || {}, root = document.documentElement;
    for (const [k, v] of Object.entries(t.colors || {})) if (HEX.test(String(v))) root.style.setProperty("--c-" + k, String(v));
    for (const [k, v] of Object.entries(t.fonts || {})) {
      const f = String(v);
      if (!/^[A-Za-z0-9 ]{2,40}$/.test(f)) continue;
      root.style.setProperty("--f-" + k, '"' + f + '"');
      if (!fonts.has(f)) {
        fonts.add(f);
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;500;600;700;800&display=swap";
        document.head.appendChild(l);
      }
    }
    for (const [k, v] of Object.entries(t)) if (typeof v === "number") root.style.setProperty("--n-" + k, String(v));
    if (typeof t.radius === "number") root.style.setProperty("--r", Math.max(0, Math.min(40, t.radius)) + "px");
    for (const [k, v] of Object.entries(stageVars())) root.style.setProperty(k, v);
    const page = (t.colors && (t.colors.page || t.colors.bg || t.colors.background)) || "#0a0a0d";
    root.style.colorScheme = lumOf(page) < 0.2 ? "dark" : "light";
    document.title = fill((D.seo && D.seo.title) || (D.brand && D.brand.name));
    const desc = fill(D.seo && D.seo.description);
    for (const sel of ['meta[name="description"]', 'meta[property="og:description"]']) { const m = document.querySelector(sel); if (m) m.setAttribute("content", desc); }
    const og = document.querySelector('meta[property="og:title"]');
    if (og) og.setAttribute("content", document.title);
  }

  const charSlot = () => hasChar() ? `<div class="xp-slot" data-xp-character="hero" role="img" aria-label="${esc((D.character && D.character.name) || "3D character")}">${url(D.character.poster) ? `<img class="xp-char-poster" src="${esc(url(D.character.poster))}" alt="" draggable="false">` : ""}</div>` : "";

  // ---------- the plain version of a scene ----------
  const typeOf = (id) => String(id).replace(/[-_]?\d+$/, "");
  const lines = (s) => fill(s).split(/\n+/).filter(Boolean).map((l) => `<span>${esc(l)}</span>`).join("");
  const itemPlain = (type, it, featured) => {
    const t = fill(it.title || it.name || it.label || it.q || "");
    const body = fill(it.text || it.a || (type === "facts" || type === "visit" ? it.value : "") || "");
    if (type === "stats") return `<div class="card"><span class="big">${esc(it.value)}</span><p>${esc(it.label || it.title)}</p></div>`;
    if (type === "plans") {
      const feats = (Array.isArray(it.features) ? it.features : String(it.features || "").split(/\n+/)).filter(Boolean);
      return `<div class="card${featured ? " feat" : ""}"><b>${esc(t)}</b><span class="big">${esc(it.price)}${it.per ? ` <small style="font-size:14px;font-weight:500;color:var(--mut)">${esc(it.per)}</small>` : ""}</span>${body ? `<p>${esc(body)}</p>` : ""}${feats.length ? `<ul>${feats.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}${it.cta ? `<a class="btn" href="${esc(href(it.ctaHref) || "#")}">${esc(it.cta)}</a>` : ""}</div>`;
    }
    if (type === "voices") return `<div class="card"><p style="color:var(--ink);font-size:17px">${esc(it.text)}</p><p><b style="color:var(--ink)">${esc(it.name)}</b>${it.role ? ` ${esc(it.role)}` : ""}</p></div>`;
    if (type === "facts" || type === "visit") return `<div class="card"><p style="text-transform:uppercase;letter-spacing:.14em;font-size:12px">${esc(it.label)}</p><b>${esc(it.value || it.title)}</b></div>`;
    return `<div class="card">${url(it.image) ? `<img src="${esc(url(it.image))}" alt="" loading="lazy">` : ""}<b>${esc(t)}</b>${it.role ? `<p>${esc(it.role)}</p>` : ""}${body ? `<p>${esc(body)}</p>` : ""}</div>`;
  };
  function plainScenes(f) {
    const order = [...new Set(String(f.order || "").split(/[\s,]+/).filter(Boolean))];
    let out = "";
    for (const id of order) {
      const s = f[id];
      const type = typeOf(id);
      if (!s || typeof s !== "object" || s.on === false || type === "hero") continue;
      const items = (Array.isArray(s.items) ? s.items : []).filter((x) => x && typeof x === "object");
      if (type === "finale") { if (s.title) out += `<section class="pl" id="start"><div class="wrap"><h2>${lines(s.title)}</h2>${s.text ? `<p class="lead">${esc(s.text)}</p>` : ""}${s.cta ? `<div class="row"><a class="btn fill" href="${esc(href(s.ctaHref) || "#")}">${esc(s.cta)}</a></div>` : ""}</div></section>`; continue; }
      if (type === "paint") {
        const sw = items.filter((x) => HEX.test(String(x.color || "")));
        out += `<section class="pl" id="${esc(id)}"><div class="wrap">${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ""}${s.title ? `<h2>${lines(s.title)}</h2>` : ""}${s.text ? `<p class="lead">${esc(s.text)}</p>` : ""}<div class="swatches">${sw.map((x) => `<i style="--c:${esc(x.color)}" title="${esc(x.title || "")}"></i>`).join("")}</div></div></section>`;
        continue;
      }
      if (!items.length && !s.title) continue;
      out += `<section class="pl" id="${esc(id)}"><div class="wrap">${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ""}${s.title ? `<h2>${lines(s.title)}</h2>` : ""}${s.text ? `<p class="lead">${esc(s.text)}</p>` : ""}${items.length ? `<div class="grid">${items.map((it, j) => itemPlain(type, it, type === "plans" && Number(s.featured) === j + 1)).join("")}</div>` : ""}${type === "visit" && s.cta ? `<div class="row"><a class="btn fill" href="${esc(href(s.ctaHref) || "#")}">${esc(s.cta)}</a></div>` : ""}</div></section>`;
    }
    return out;
  }

  function markup() {
    const nav = D.nav || {}, f = D.film || {}, h = f.hero || {}, ft = D.footer || {};
    const links = (Array.isArray(nav.links) ? nav.links : []).filter((l) => l && l.label);
    const mail = String(ft.email || (D.brand && D.brand.email) || "").trim();
    const heroLines = fill(h.title || (D.brand && D.brand.name) || "").split(/\n+/).filter(Boolean);
    const cta = nav.cta && fill(nav.cta).trim() ? `<a class="btn" href="${esc(href(nav.ctaHref) || "#")}">${esc(nav.cta)}</a>` : "";
    // The story is drawn into the empty place; without a character (or with the story off) the page
    // still opens with a plain headline and goes on in plain sections.
    const on = storyOn();
    const opening = on
      ? `<div class="film-host" data-xp-film-track></div>`
      : `<section class="pl pl-hero" id="top"><div class="wrap"><div><h1>${heroLines.map((l) => `<span>${esc(l)}</span>`).join("")}</h1>${h.text ? `<p>${esc(h.text)}</p>` : ""}${h.cta ? `<div class="row"><a class="btn" href="${esc(href(h.ctaHref) || "#")}">${esc(h.cta)}</a></div>` : ""}</div>${charSlot()}</div></section>${plainScenes(f)}`;
    const note = fill(ft.note || ft.text || "");
    return `
    <header class="nav" id="top-nav"><div class="wrap">
      <nav class="links" aria-label="Main">${links.map((l) => `<a class="l" href="${esc(href(l.href) || "#")}">${esc(l.label)}</a>`).join("")}</nav>
      <a class="brand" href="#top"><i aria-hidden="true"></i>${esc(D.brand && D.brand.name)}</a>
      <div class="right">${cta}</div>
    </div></header>
    <main id="top-main">
      ${opening}
      <div class="extras" data-xp-extras></div>
    </main>
    <footer class="foot" id="contact" data-xp-noshot><div class="wrap">
      <a class="brand" href="#top">${esc(D.brand && D.brand.name)}</a>
      <nav aria-label="Footer">${links.map((l) => `<a href="${esc(href(l.href) || "#")}">${esc(l.label)}</a>`).join("")}${mail ? `<a href="mailto:${esc(mail)}">${esc(mail)}</a>` : ""}</nav>
      <span>${esc(note)}</span>
    </div></footer>`;
  }

  // ---------- Motion: the menu turns solid once the story is over ----------
  function start() {
    const nav = document.getElementById("top-nav");
    const onScroll = () => {
      const host = document.querySelector(".xp-track");
      const end = host ? host.getBoundingClientRect().bottom : 0;
      nav.classList.toggle("solid", !host ? scrollY > 40 : end < 80);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }

  // ---------- Mount, and redraw when the builder sends new content ----------
  const root = document.getElementById("xp-root");
  let stop = null;
  function mount() {
    const y = scrollY;
    if (stop) stop();
    theme();
    root.innerHTML = markup();
    stop = start();
    scrollTo(0, y);
  }
  mount();
  if (window.__XP_PREVIEW__) {
    addEventListener("message", (e) => {
      if (e.source !== parent || !e.data || e.data.type !== "xp-data") return;
      const next = JSON.stringify(e.data.data || {});
      if (next === JSON.stringify(D)) return;
      D = JSON.parse(next);
      mount();
    });
    parent.postMessage({ type: "xp-ready" }, "*");
  }
})();
