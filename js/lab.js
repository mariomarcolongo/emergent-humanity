import { SECTIONS as ALL_SECTIONS } from "../content/sections.js";
const PILOT = ALL_SECTIONS.filter((s) =>
  ["emergent-organism", "alignment", "entropy"].includes(s.id),
);
import { createExperiment, describe } from "./models/index.js";
import { mountExperiment, pauseAll } from "./runtime/experiment.js";
// The pilot route allows the first migration gate to be verified independently.
const SECTIONS = new URLSearchParams(location.search).has("pilot")
  ? PILOT
  : ALL_SECTIONS;
const instances = new Map();
let active = null;
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
function control(c) {
  if (c.type === "button") {
    const e = el("button", "viz-btn", c.label);
    e.type = "button";
    e.id = `ctrl-${c.id}`;
    return e;
  }
  const wrap = el(
    "label",
    c.type === "switch" ? "switch-container" : "slider-container",
  );
  wrap.append(el("span", "slider-label", c.label));
  const input = el("input");
  input.id = `ctrl-${c.id}`;
  input.type = c.type === "switch" ? "checkbox" : "range";
  if (c.type === "switch") {
    input.checked = !!c.value;
    input.defaultChecked = !!c.value;
    wrap.append(input);
  } else {
    for (const key of ["min", "max", "step", "value"])
      input.setAttribute(key, c[key]);
    const out = el("output", "slider-value");
    out.htmlFor = input.id;
    const sync = () => {
      out.textContent = input.value;
      input.setAttribute("aria-valuetext", input.value);
    };
    input.addEventListener("input", sync);
    input.addEventListener("control-reset", sync);
    wrap.append(input, out);
    sync();
  }
  return wrap;
}
function section(s, index) {
  const root = el("section", "section");
  root.id = `section-${s.id}`;
  root.dataset.sectionId = s.id;
  root.dataset.sectionIndex = index;
  root.setAttribute("aria-labelledby", `title-${s.id}`);
  const text = el("div", "text-pane"),
    content = el("div", "text-content");
  content.append(el("p", "section-number", s.number));
  const h = el("h2", "section-title", s.title);
  h.id = `title-${s.id}`;
  content.append(h, el("p", "section-subtitle", s.subtitle));
  s.body.forEach((p) => content.append(el("p", "text-body", p)));
  text.append(content);
  const pane = el("div", "viz-pane");
  const hint = el("p", "viz-hint", s.vizHint);
  hint.id = `hint-${s.id}`;
  const stage = el("div", "viz-stage");
  const canvas = el("canvas");
  canvas.id = `canvas-${s.id}`;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-describedby", hint.id);
  stage.append(canvas);
  const controls = el("div", "viz-controls");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", `Controls for ${s.title}`);
  s.controls.forEach((c) => controls.append(control(c)));
  const transport = el("div", "experiment-transport");
  for (const [key, label] of [
    ["run", "Run"],
    ["step", "Step"],
    ["reset", "Reset"],
  ]) {
    const b = el("button", "transport-btn", label);
    b.type = "button";
    b.dataset[key] = "";
    b.setAttribute("aria-label", `${label}: ${s.title}`);
    transport.append(b);
  }
  const stats = el("p", "viz-stats");
  stats.id = `stats-${s.id}`;
  const announcement = el("p", "sr-only experiment-announcement");
  announcement.setAttribute("role", "status");
  pane.append(hint, stage, controls, transport, stats, announcement);
  const takeaway = el("div", "chapter-reflection");
  takeaway.append(el("aside", "insight", s.insight));
  if (s.evidence) {
    const details = el("details", "evidence");
    details.append(el("summary", "", "Why believe this?"));
    for (const [label, value] of Object.entries(s.evidence)) {
      const p = el("p");
      p.append(el("strong", "", `${label}: `), document.createTextNode(value));
      details.append(p);
    }
    const a = el("a", "", "Read the model and sources →");
    a.href = `methods.html#${s.id}`;
    details.append(a);
    takeaway.append(details);
  }
  root.append(text, pane, takeaway);
  return root;
}
function init() {
  const container = document.getElementById("scroll-container");
  const hero = container.querySelector(".hero");
  container.replaceChildren(hero);
  SECTIONS.forEach((s, i) => container.append(section(s, i)));
  const footer = el("footer", "footer");
  const methods = el("a", "", "Models, evidence, and limits");
  methods.href = "methods.html";
  const source = el("a", "", "Source on GitHub");
  source.href = "https://github.com/mariomarcolongo/emergent-humanity";
  footer.append(methods, document.createTextNode(" · "), source);
  container.append(footer);
  const nav = document.getElementById("chapter-nav"),
    list = el("ol", "chapter-list");
  SECTIONS.forEach((s) => {
    const li = el("li"),
      a = el("a", "", `${s.number}  ${s.title}`);
    a.href = `#section-${s.id}`;
    a.dataset.sectionLink = s.id;
    a.addEventListener(
      "click",
      () => (document.getElementById("chapter-menu").open = false),
    );
    li.append(a);
    list.append(li);
  });
  nav.replaceChildren(list);
  document
    .querySelector(".hero-secondary-action")
    ?.addEventListener("click", () => {
      document.getElementById("chapter-menu").open = true;
      document.querySelector("#chapter-menu summary").focus();
    });
  for (const s of SECTIONS) {
    const canvas = document.getElementById(`canvas-${s.id}`);
    try {
      instances.set(
        s.id,
        mountExperiment(canvas, createExperiment(s.id), describe),
      );
    } catch (error) {
      canvas.closest(".viz-pane").classList.add("viz-error");
      document.getElementById(`stats-${s.id}`).textContent =
        "Experiment unavailable. The chapter remains readable.";
      console.error(error);
    }
  }
  let scheduled = false;
  function track() {
    scheduled = false;
    const center = innerHeight * 0.45;
    let current = null;
    for (const s of SECTIONS) {
      const r = document
        .getElementById(`section-${s.id}`)
        .getBoundingClientRect();
      if (r.top <= center && r.bottom > center) {
        current = s;
        break;
      }
    }
    if (active !== current?.id) {
      instances.get(active)?.deactivate();
      active = current?.id ?? null;
      instances.get(active)?.activate();
    }
    document.getElementById("chapter-label").textContent =
      current?.title ?? "Introduction";
    document.getElementById("chapter-count").textContent =
      `${current?.number ?? "00"} / ${SECTIONS.length}`;
    document.querySelectorAll("[data-section-link]").forEach((a) => {
      if (a.dataset.sectionLink === active)
        a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
    const max = document.documentElement.scrollHeight - innerHeight;
    document.getElementById("reading-progress-bar").style.transform =
      `scaleX(${max ? scrollY / max : 0})`;
  }
  const request = () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(track);
    }
  };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request, { passive: true });
  track();
  const pause = el("button", "motion-toggle", "Pause motion");
  pause.type = "button";
  pause.setAttribute("aria-pressed", "false");
  pause.addEventListener("click", () => {
    const paused = pause.getAttribute("aria-pressed") !== "true";
    pause.setAttribute("aria-pressed", String(paused));
    pause.textContent = paused ? "Resume motion" : "Pause motion";
    pauseAll(paused);
  });
  document.querySelector(".header-actions").prepend(pause);
  window.__EXPERIMENTS__ = instances;
  document.documentElement.dataset.mobileLayout =
    innerWidth <= 900 ? "active" : "inactive";
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
