
// DV-6: Lista única de monedas permitidas (MVP)
// DV-7: Evitar selección misma moneda en los dos campos.

// DV-8 Refactor: estado central y funciones públicas

const CURRENCIES = Object.freeze([
  { code: "EUR", name: "Euro (EUR)" },
  { code: "USD", name: "Dólar USA (USD)" },
  { code: "GBP", name: "Libra esterlina (GBP)" },
]);

// Estado central
const state = {
  from: "EUR",
  to: "USD",
};

// DOM
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");

// Rellena un <select> con las monedas disponibles
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

// DV-7: devuelve una moneda diferente a excludeCode (la primera disponible)
function pickDifferentCurrency(excludeCode) {
  const alt = CURRENCIES.find((c) => c.code !== excludeCode);
  return alt ? alt.code : excludeCode; // fallback (siempre habrá alternativa con 3 monedas)
}

// DV-7: garantiza que from !== to ajustando el selector contrario al que cambió
function ensureDifferentCurrencies(changed) {
  if (state.from !== state.to) {
    return;
  }

  if (changed === "from") {
    // Si el usuario cambió "from" y coincide con "to", ajustamos "to"
    state.to = pickDifferentCurrency(state.from);
  } else if (changed === "to") {
    // Si el usuario cambió "to" y coincide con "from", ajustamos "from"
    state.from = pickDifferentCurrency(state.to);
  }
}

/* =========================
   DV-8: Refactor de estado
   ========================= */

// Devuelve una copia del estado actual (para consumo futuro por la lógica de conversión)
function getSelection() {
  return { ...state };
}

// Sincroniza la UI a partir del estado (1 fuente de verdad)
function syncUIFromState() {
  fromEl.value = state.from;
  toEl.value = state.to;
}

// Actualiza estado de origen con validación DV-7 y sincroniza UI
function setFrom(code) {
  state.from = code;
  ensureDifferentCurrencies("from");
  syncUIFromState();
}

// Actualiza estado de destino con validación DV-7 y sincroniza UI
function setTo(code) {
  state.to = code;
  ensureDifferentCurrencies("to");
  syncUIFromState();
}

function init() {
  // Rellenar ambos selectores
  populateSelect(fromEl, state.from);
  populateSelect(toEl, state.to);

  // Asegurar que la UI refleja el estado inicial
  syncUIFromState();

  // Guardar cambios en el estado usando la API de DV-8
  fromEl.addEventListener("change", () => {
    setFrom(fromEl.value);
    const sel = getSelection();
    console.log("Selección:", sel);
  });

  toEl.addEventListener("change", () => {
    setTo(toEl.value);
    const sel = getSelection();
    console.log("Selección:", sel);
  });
}

init();
