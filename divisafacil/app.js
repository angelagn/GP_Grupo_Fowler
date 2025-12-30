// DV-5: Selector de moneda de destino (UI)
// Mantiene DV-4 (selector origen) y añade selector destino.
// Nota: La validación para evitar from == to se hará en DV-7.

const CURRENCIES = [
  { code: "EUR", name: "Euro (EUR)" },
  { code: "USD", name: "Dólar USA (USD)" },
  { code: "GBP", name: "Libra esterlina (GBP)" },
];

const state = {
  from: "EUR",
  to: "USD",
};

const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const resultEl = document.getElementById("result");
const metaEl = document.getElementById("meta");
const swapBtn = document.getElementById("swap");
const refreshBtn = document.getElementById("refresh");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");
const statusTextEl = statusEl.querySelector(".status-text");
const statusDotEl = statusEl.querySelector(".dot");

let chart; // Chart.js instance

function setStatus(type, text) {
  statusTextEl.textContent = text;

  // Color del dot según estado
  if (type === "ok") statusDotEl.style.background = "#22c55e";
  if (type === "loading") statusDotEl.style.background = "#f59e0b";
  if (type === "error") statusDotEl.style.background = "#ef4444";
}

function populateSelect(selectEl, defaultCode) {
  selectEl.innerHTML = "";
  for (const c of CURRENCIES) {
    const opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = c.name;
    selectEl.appendChild(opt);
  }
  selectEl.value = defaultCode;
}

function init() {
  // Rellenar ambos selectores
  populateSelect(fromEl, state.from);
  populateSelect(toEl, state.to);

  // Guardar cambios en el estado
  fromEl.addEventListener("change", () => {
    state.from = fromEl.value;
    console.log("Moneda origen:", state.from);
  });

  toEl.addEventListener("change", () => {
    state.to = toEl.value;
    console.log("Moneda destino:", state.to);
  });
}

init();
