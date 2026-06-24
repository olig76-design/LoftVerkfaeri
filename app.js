const storeKey = "loftverkfaeri.projects.v1";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const state = {
  flowShape: "round",
  velocityShape: "round",
  pressureShape: "round",
  activeProjectId: null,
  lastCalculations: [],
  projects: loadProjects(),
};

const components = [
  { key: "bend90", label: "90° beygja", k: 0.9 },
  { key: "bend45", label: "45° beygja", k: 0.4 },
  { key: "tee", label: "T-stykki", k: 1.2 },
  { key: "attenuator", label: "Hljóðdeyfi", k: 0.8 },
  { key: "grille", label: "Rist", k: 1.5 },
  { key: "damper", label: "Spjaldloka", k: 0.7 },
];

const converters = [
  { title: "m³/h ↔ l/s", a: "m³/h", b: "l/s", toB: (v) => v / 3.6, toA: (v) => v * 3.6 },
  { title: "m/s ↔ fpm", a: "m/s", b: "fpm", toB: (v) => v * 196.8504, toA: (v) => v / 196.8504 },
  { title: "Pa ↔ mmWC", a: "Pa", b: "mmWC", toB: (v) => v / 9.80665, toA: (v) => v * 9.80665 },
  { title: "Pa ↔ kPa", a: "Pa", b: "kPa", toB: (v) => v / 1000, toA: (v) => v * 1000 },
  { title: "mm ↔ cm", a: "mm", b: "cm", toB: (v) => v / 10, toA: (v) => v * 10 },
  { title: "mm ↔ m", a: "mm", b: "m", toB: (v) => v / 1000, toA: (v) => v * 1000 },
];

const rectSizes = [
  [150, 150], [200, 150], [200, 200], [250, 150], [250, 200], [300, 150],
  [300, 200], [300, 250], [400, 200], [400, 250], [400, 300], [500, 250],
  [500, 300], [600, 300], [600, 400], [800, 400], [1000, 500],
];

const roundSizes = [80, 100, 125, 160, 200, 250, 315, 355, 400, 500, 630, 710, 800, 1000];

function value(id) {
  const parsed = Number($(id).value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(value, decimals = 0) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("is-IS", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

function areaRound(diameterMm) {
  const d = diameterMm / 1000;
  return Math.PI * d * d / 4;
}

function areaRect(widthMm, heightMm) {
  return (widthMm / 1000) * (heightMm / 1000);
}

function hydraulicDiameter(widthMm, heightMm) {
  const width = widthMm / 1000;
  const height = heightMm / 1000;
  return (2 * width * height) / (width + height);
}

function flowFromArea(area, velocity) {
  const m3h = area * velocity * 3600;
  return { m3h, ls: m3h / 3.6 };
}

function velocityFromArea(flowM3h, area) {
  return area > 0 ? (flowM3h / 3600) / area : 0;
}

function activeSection(id) {
  $$("[data-section]").forEach((section) => section.classList.toggle("active", section.id === id));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.sectionTarget === id));
  $("[data-nav]").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setShape(group, shape) {
  const prefix = group === "velocity" ? "vel" : group;
  state[`${group}Shape`] = shape;
  $$(`[data-${prefix}-shape]`).forEach((button) => button.classList.toggle("active", button.dataset[`${prefix}Shape`] === shape));
  $$(`[data-${prefix}-round]`).forEach((el) => el.classList.toggle("hidden", shape !== "round"));
  $$(`[data-${prefix}-rect]`).forEach((el) => el.classList.toggle("hidden", shape !== "rect"));
  recalcAll();
}

function currentArea(group) {
  if (state[`${group}Shape`] === "round") return areaRound(value(`#${group === "flow" ? "flowDiameter" : group === "velocity" ? "velDiameter" : "pressureDiameter"}`));
  if (group === "flow") return areaRect(value("#flowWidth"), value("#flowHeight"));
  if (group === "velocity") return areaRect(value("#velWidth"), value("#velHeight"));
  return areaRect(value("#pressureWidth"), value("#pressureHeight"));
}

function calculateFlow() {
  const ductArea = currentArea("flow");
  const result = flowFromArea(ductArea, value("#flowVelocity"));
  $("#flowM3h").textContent = `${fmt(result.m3h)} m³/h`;
  $("#flowLs").textContent = `${fmt(result.ls, 1)} l/s`;
  rememberCalc("Loftmagn úr stokkastærð", `${fmt(result.m3h)} m³/h, ${fmt(result.ls, 1)} l/s`);

  const fromArea = flowFromArea(value("#areaInput"), value("#areaVelocity"));
  $("#areaM3h").textContent = `${fmt(fromArea.m3h)} m³/h`;
  $("#areaLs").textContent = `${fmt(fromArea.ls, 1)} l/s`;
  rememberCalc("Loftmagn úr flatarmáli", `${fmt(fromArea.m3h)} m³/h, ${fmt(fromArea.ls, 1)} l/s`);
}

function calculateVelocity() {
  const velocity = velocityFromArea(value("#velFlow"), currentArea("velocity"));
  const resultCard = $("#velocityResult").closest(".result-card");
  $("#velocityResult").textContent = `${fmt(velocity, 2)} m/s`;
  resultCard.classList.toggle("warn", velocity > 5 && velocity <= 7);
  resultCard.classList.toggle("danger", velocity > 7);
  $("#velocityNote").textContent = velocity > 7
    ? "Yfir algengum viðmiðum fyrir aðalstokka."
    : velocity > 5
      ? "Hátt fyrir greinistokka, yfirfara hljóð og þrýstifall."
      : velocity > 0
        ? "Innan algengra leiðbeinandi marka."
        : "Sláðu inn gildi";
  rememberCalc("Lofthraði", `${fmt(velocity, 2)} m/s`);
}

function calculateDuct() {
  const flow = value("#ductFlow");
  const desiredVelocity = value("#ductVelocity");
  const requiredArea = desiredVelocity > 0 ? (flow / 3600) / desiredVelocity : 0;
  const rawDiameter = Math.sqrt((4 * requiredArea) / Math.PI) * 1000;
  const standardDiameter = roundSizes.find((size) => size >= rawDiameter) || Math.ceil(rawDiameter / 50) * 50;
  $("#ductRound").textContent = `${fmt(standardDiameter)} mm`;
  $("#ductArea").textContent = `Flatarmál ${fmt(requiredArea, 3)} m²`;

  const suggestions = rectSizes
    .map(([w, h]) => {
      const area = areaRect(w, h);
      const velocity = velocityFromArea(flow, area);
      return { w, h, area, velocity, diff: Math.abs(velocity - desiredVelocity) };
    })
    .filter((item) => item.velocity <= desiredVelocity * 1.12 || item.area >= requiredArea)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 7);

  $("#rectSuggestions").innerHTML = suggestions.map((item) => `
    <div class="suggestion">
      <div>
        <strong>${item.w}×${item.h} mm</strong>
        <small>${fmt(item.area, 3)} m²</small>
      </div>
      <strong>${fmt(item.velocity, 2)} m/s</strong>
    </div>
  `).join("");

  rememberCalc("Stokkastærð", `Hringstokkur ${fmt(standardDiameter)} mm, flatarmál ${fmt(requiredArea, 3)} m²`);
}

function calculatePressure() {
  const area = currentArea("pressure");
  const velocity = velocityFromArea(value("#pressureFlow"), area);
  const dynamicPressure = 0.6 * velocity * velocity;
  const length = value("#pressureLength");
  const diameter = state.pressureShape === "round"
    ? value("#pressureDiameter") / 1000
    : hydraulicDiameter(value("#pressureWidth"), value("#pressureHeight"));
  const straight = diameter > 0 ? 0.025 * (length / diameter) * dynamicPressure : 0;
  const componentLoss = components.reduce((sum, item) => {
    const qty = value(`#component-${item.key}`);
    return sum + qty * item.k * dynamicPressure;
  }, 0);
  const total = straight + componentLoss;
  $("#pressureTotal").textContent = `${fmt(total, 1)} Pa`;
  $("#pressureBreakdown").textContent = `Beinn stokkur ${fmt(straight, 1)} Pa, íhlutir ${fmt(componentLoss, 1)} Pa, hraði ${fmt(velocity, 2)} m/s`;
  rememberCalc("Þrýstifall", `${fmt(total, 1)} Pa`);
}

function renderComponents() {
  $("#componentList").innerHTML = components.map((item) => `
    <label class="component-row">
      <span>${item.label}</span>
      <input inputmode="numeric" type="number" min="0" step="1" value="0" id="component-${item.key}" aria-label="${item.label}">
    </label>
  `).join("");
}

function renderConverters() {
  $("#converterGrid").innerHTML = converters.map((item, index) => `
    <article class="converter-card" data-converter="${index}">
      <h3>${item.title}</h3>
      <div class="form-grid">
        <label>${item.a}<input inputmode="decimal" type="number" step="0.01" data-converter-a value="${index === 0 ? 360 : 0}"></label>
        <label>${item.b}<input inputmode="decimal" type="number" step="0.01" data-converter-b value="${index === 0 ? 100 : 0}"></label>
      </div>
    </article>
  `).join("");
}

function wireConverters() {
  $$(".converter-card").forEach((card) => {
    const converter = converters[Number(card.dataset.converter)];
    const a = $("[data-converter-a]", card);
    const b = $("[data-converter-b]", card);
    a.addEventListener("input", () => {
      b.value = trimNumber(converter.toB(Number(a.value)));
    });
    b.addEventListener("input", () => {
      a.value = trimNumber(converter.toA(Number(b.value)));
    });
  });
}

function trimNumber(value) {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 1000) / 1000);
}

function rememberCalc(title, result) {
  state.lastCalculations = state.lastCalculations.filter((item) => item.title !== title);
  state.lastCalculations.unshift({ title, result, date: new Date().toISOString() });
  state.lastCalculations = state.lastCalculations.slice(0, 8);
}

function saveCurrentCalculation(kind) {
  const map = {
    flow: "Loftmagn úr stokkastærð",
    area: "Loftmagn úr flatarmáli",
    velocity: "Lofthraði",
    duct: "Stokkastærð",
    pressure: "Þrýstifall",
  };
  const calc = state.lastCalculations.find((item) => item.title === map[kind]);
  if (!calc) return showToast("Enginn útreikningur til að vista.");
  const notes = $("#projectNotes").value.trim();
  $("#projectNotes").value = [notes, `${calc.title}: ${calc.result}`].filter(Boolean).join("\n");
  showToast("Útreikningur settur í athugasemdir verkefnis.");
  activeSection("projects");
}

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(storeKey)) || [];
  } catch {
    return [];
  }
}

function persistProjects() {
  localStorage.setItem(storeKey, JSON.stringify(state.projects));
}

function saveProject() {
  const name = $("#projectName").value.trim() || "Ónefnt verkefni";
  const system = $("#projectSystem").value.trim();
  const notes = $("#projectNotes").value.trim();
  const payload = {
    id: state.activeProjectId || crypto.randomUUID(),
    name,
    system,
    notes,
    calculations: state.lastCalculations.slice(0, 6),
    updatedAt: new Date().toISOString(),
  };
  state.projects = [payload, ...state.projects.filter((item) => item.id !== payload.id)];
  state.activeProjectId = payload.id;
  persistProjects();
  renderProjects();
  showToast("Verkefni vistað.");
}

function renderProjects() {
  $("#projectList").innerHTML = state.projects.length
    ? state.projects.map((project) => `
      <div class="project-item">
        <div>
          <strong>${escapeHtml(project.name)}</strong>
          <small>${escapeHtml(project.system || "Kerfi ekki skráð")} · ${formatDate(project.updatedAt)}</small>
        </div>
        <div class="action-row">
          <button type="button" data-load-project="${project.id}">Opna</button>
          <button type="button" data-delete-project="${project.id}">Eyða</button>
        </div>
      </div>
    `).join("")
    : "<p>Engin verkefni vistuð enn.</p>";
}

function loadProject(id) {
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;
  state.activeProjectId = id;
  $("#projectName").value = project.name;
  $("#projectSystem").value = project.system || "";
  $("#projectNotes").value = project.notes || "";
  state.lastCalculations = project.calculations || [];
  showToast("Verkefni opnað.");
}

function deleteProject(id) {
  state.projects = state.projects.filter((item) => item.id !== id);
  if (state.activeProjectId === id) clearProjectForm();
  persistProjects();
  renderProjects();
  showToast("Verkefni eytt.");
}

function clearProjectForm() {
  state.activeProjectId = null;
  $("#projectName").value = "";
  $("#projectSystem").value = "";
  $("#projectNotes").value = "";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("is-IS", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}

function showToast(message) {
  const toast = $("[data-toast]");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function printProject() {
  const projectName = $("#projectName").value.trim() || "Verkefni";
  document.title = `LoftVerkfaeri - ${projectName}`;
  window.print();
}

function recalcAll() {
  calculateFlow();
  calculateVelocity();
  calculateDuct();
  calculatePressure();
}

function wireEvents() {
  $$("[data-section-target]").forEach((button) => {
    button.addEventListener("click", () => activeSection(button.dataset.sectionTarget));
  });

  $("[data-menu-toggle]").addEventListener("click", () => $("[data-nav]").classList.toggle("open"));
  $("[data-print-current]").addEventListener("click", printProject);

  $$("[data-flow-shape]").forEach((button) => button.addEventListener("click", () => setShape("flow", button.dataset.flowShape)));
  $$("[data-vel-shape]").forEach((button) => button.addEventListener("click", () => setShape("velocity", button.dataset.velShape)));
  $$("[data-pressure-shape]").forEach((button) => button.addEventListener("click", () => setShape("pressure", button.dataset.pressureShape)));

  $$("input, textarea").forEach((input) => {
    input.addEventListener("input", recalcAll);
  });

  $$("[data-save-calc]").forEach((button) => {
    button.addEventListener("click", () => saveCurrentCalculation(button.dataset.saveCalc));
  });

  $("#saveProject").addEventListener("click", saveProject);
  $("#printProject").addEventListener("click", printProject);
  $("#clearProjectForm").addEventListener("click", clearProjectForm);
  $("#projectList").addEventListener("click", (event) => {
    const loadButton = event.target.closest("[data-load-project]");
    const deleteButton = event.target.closest("[data-delete-project]");
    if (loadButton) loadProject(loadButton.dataset.loadProject);
    if (deleteButton) deleteProject(deleteButton.dataset.deleteProject);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

renderComponents();
renderConverters();
wireEvents();
wireConverters();
renderProjects();
recalcAll();
registerServiceWorker();
