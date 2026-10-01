const state = {
  faculty: [],
  darkTiles: false,
  orientation: "vertical",
  size: 300,
  visible: { name: true, title: true, number: true, office: true, hours: true },
};

const grid = document.querySelector("#facultyGrid");
const loadingState = document.querySelector("#loadingState");
const sizeSlider = document.querySelector("#sizeSlider");
const sizeValue = document.querySelector("#sizeValue");
const orientationValue = document.querySelector("#orientationValue");
const themeToggle = document.querySelector("#themeToggle");
const facultyCount = document.querySelector("#facultyCount");
const modalBackdrop = document.querySelector("#modalBackdrop");
const modalClose = document.querySelector("#modalClose");
const websiteFrame = document.querySelector("#websiteFrame");
const iframeLoading = document.querySelector("#iframeLoading");
const modalTitle = document.querySelector("#modalTitle");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanValue(value, fallback = "Not listed") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function getHours(person) {
  const hours = person["Office Hours"] || {};
  const entries = Array.isArray(hours.Entries)
    ? hours.Entries
    : [];

  return {
    note: String(hours["Appointment Note"] ?? "").trim(),
    entries: entries
      .map((entry) => ({
        identifier: String(entry?.Identifier ?? "").trim(),
        time: String(entry?.Time ?? "").trim(),
      }))
      .filter((entry) => entry.identifier || entry.time)
      .slice(0, 8),
  };
}

function getSizeLabel(size) {
  if (size < 275) return "Compact";
  if (size > 350) return "Spacious";
  return "Medium";
}

function getProfileUrl(name) {
  const localFilename = window.FACULTY_PROFILES?.[name];
  return localFilename ? `Fac_Website/${localFilename}` : "about:blank";
}

function renderCard(name, person, index) {
  const title = cleanValue(person["Job Title"]);
  const phone = cleanValue(person["Phone Number"]);
  const office = cleanValue(person["Office Room"]);
  const hours = getHours(person);
  const image = cleanValue(person["Link to Picture"], "https://placehold.co/600x760/e5eaec/71808d?text=Faculty");
  const visible = state.visible;
  const fields = [];

  if (visible.number) fields.push(`<div class="meta-line"><span class="meta-label">Phone</span><span>${escapeHtml(phone)}</span></div>`);
  if (visible.office) fields.push(`<div class="meta-line"><span class="meta-label">Office</span><span>${escapeHtml(office)}</span></div>`);

  const hoursMarkup = visible.hours && hours.entries.length
    ? `<div class="hours-block"><div class="hours-heading"><span>Office hours</span>${hours.note ? `<span>${escapeHtml(hours.note)}</span>` : ""}</div><div class="hours-list"><div class="hours-row hours-header"><strong>Identifier</strong><strong>Time</strong></div>${hours.entries.map(({ identifier, time }) => `<div class="hours-row"><span>${escapeHtml(identifier)}</span><span>${escapeHtml(time)}</span></div>`).join("")}</div></div>`
    : "";

  return `<article class="faculty-card" tabindex="0" role="button" data-index="${index}" aria-label="Open website for ${escapeHtml(name)}">
    <div class="faculty-card-inner">
      <img class="portrait" src="${escapeHtml(image)}" alt="Portrait of ${escapeHtml(name)}" loading="lazy" />
      <div class="faculty-info">
        ${visible.name ? `<h3 class="faculty-name">${escapeHtml(name)}</h3>` : ""}
        ${visible.title ? `<p class="faculty-title">${escapeHtml(title)}</p>` : ""}
        ${fields.length ? `<div class="faculty-meta">${fields.join("")}</div>` : ""}
        ${hoursMarkup}
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  grid.classList.toggle("is-dark", state.darkTiles);
  grid.classList.toggle("is-horizontal", state.orientation === "horizontal");
  grid.style.setProperty("--tile-size", `${state.size}px`);
  grid.innerHTML = state.faculty.map(([name, person], index) => renderCard(name, person, index)).join("");
  facultyCount.textContent = state.faculty.length;
}

function updateSize(value) {
  state.size = Number(value);
  sizeValue.textContent = getSizeLabel(state.size);
  renderGrid();
}

function openModal(index) {
  const [name, person] = state.faculty[index] || [];
  if (!person) return;
  const profileUrl = getProfileUrl(name);
  modalTitle.textContent = name;
  websiteFrame.title = `${name} faculty website`;
  iframeLoading.classList.remove("is-hidden");
  websiteFrame.src = profileUrl;
  modalBackdrop.hidden = false;
  document.body.classList.add("modal-open");
  modalClose.focus();
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.classList.remove("modal-open");
  websiteFrame.src = "about:blank";
}

async function loadFaculty() {
  try {
    const response = await fetch("faculty.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`faculty.json returned ${response.status}`);
    const data = await response.json();
    state.faculty = Object.entries(data);
    loadingState.hidden = true;
    renderGrid();
  } catch (error) {
    loadingState.innerHTML = `<div><p><strong>Could not load faculty.json.</strong></p><p>Run this folder through a local web server, for example:<br /><code>python3 -m http.server</code></p></div>`;
    console.error(error);
  }
}

themeToggle.addEventListener("click", () => {
  state.darkTiles = !state.darkTiles;
  themeToggle.setAttribute("aria-pressed", String(state.darkTiles));
  themeToggle.setAttribute("aria-label", state.darkTiles ? "Switch to light tiles" : "Switch to dark tiles");
  renderGrid();
});

document.querySelectorAll("[data-orientation]").forEach((button) => {
  button.addEventListener("click", () => {
    state.orientation = button.dataset.orientation;
    document.querySelectorAll("[data-orientation]").forEach((item) => item.classList.toggle("is-active", item === button));
    orientationValue.textContent = state.orientation[0].toUpperCase() + state.orientation.slice(1);
    renderGrid();
  });
});

sizeSlider.addEventListener("input", (event) => updateSize(event.target.value));

document.querySelectorAll(".visibility-toggle").forEach((input) => {
  input.addEventListener("change", () => {
    state.visible[input.dataset.field] = input.checked;
    renderGrid();
  });
});

grid.addEventListener("click", (event) => {
  const card = event.target.closest(".faculty-card");
  if (card) openModal(Number(card.dataset.index));
});

grid.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.closest(".faculty-card")) {
    event.preventDefault();
    openModal(Number(event.target.closest(".faculty-card").dataset.index));
  }
});

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});
websiteFrame.addEventListener("load", () => iframeLoading.classList.add("is-hidden"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalBackdrop.hidden) closeModal();
});

loadFaculty();
