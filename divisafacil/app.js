
// DV-6: Lista única de monedas permitidas (MVP)
// DV-7: Evitar selección misma moneda en los dos campos.

// DV-8 Refactor: estado central y funciones públicas

const API_BASE = "https://api.frankfurter.app";

const CURRENCIES = Object.freeze([
  { code: "EUR", name: "Euro (EUR)" },
  { code: "USD", name: "Dólar USA (USD)" },
  { code: "GBP", name: "Libra esterlina (GBP)" },
]);

// Estado central
const state = {
  from: "EUR",
  to: "USD",
  amount: "", //DV-9: guardar todo lo que escribe el usuario
};

// DOM
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const amountEl = document.getElementById("amount");
const swapBtn = document.getElementById("swap");

// DV-9: setter simple (sin validar todavía)
function setAmount(rawValue) {
  state.amount = String(rawValue ?? "");
  amountEl.value = state.amount;
}

// DV-10: normalización en tiempo real + formateo al salir del campo
  amountEl.addEventListener("input", () => {
    setAmount(amountEl.value, { formatOnBlur: false });
    console.log("Selección:", getSelection());
  });

  amountEl.addEventListener("blur", () => {
    setAmount(amountEl.value, { formatOnBlur: true });
    console.log("Selección:", getSelection());
  });

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

// ===== DV-10: restricciones de importe =====

function normalizeAmountInput(raw) {
  // 1) eliminar cualquier cosa que no sea dígito o punto (no permite '-' => no negativos)
  let s = String(raw || "").replace(/[^\d.]/g, "");

  // 2) permitir solo un punto
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    const before = s.slice(0, firstDot + 1);
    const after = s.slice(firstDot + 1).replace(/\./g, "");
    s = before + after;
  }

  // 3) limitar a 2 decimales
  const dotPos = s.indexOf(".");
  if (dotPos !== -1) {
    const intPart = s.slice(0, dotPos);
    const decPart = s.slice(dotPos + 1).slice(0, 2);
    s = intPart + "." + decPart;
  }

  // 4) casos como "." -> "0."
  if (s === ".") s = "0.";

  return s;
}

function formatAmountOnBlur(value) {
  if (value === "" || value === "0." || value === ".") return "";
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "";
  return n.toFixed(2);
}

function setAmount(rawValue, { formatOnBlur = false } = {}) {
  const normalized = normalizeAmountInput(rawValue);
  state.amount = formatOnBlur ? formatAmountOnBlur(normalized) : normalized;
  amountEl.value = state.amount;
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

/* =========================
   DV-16: Formato (2 decimales)
   ========================= */

function formatMoney(value, currency) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} ${currency}`;
}

function formatRateLine(from, to, rate, date) {
  if (!Number.isFinite(rate)) return "Introduce un importe válido.";
  const dateTxt = date ? ` · Fecha: ${date}` : "";
  return `Tipo: 1 ${from} = ${rate.toFixed(2)} ${to}${dateTxt}`;
}

function paintConversion({ converted, rate, date }) {
  if (!Number.isFinite(converted) || !Number.isFinite(rate)) {
    if (resultEl) resultEl.textContent = "—";
    if (metaEl) metaEl.textContent = "Introduce un importe válido.";
    return;
  }

  if (resultEl) resultEl.textContent = formatMoney(converted, state.to);
  if (metaEl) metaEl.textContent = formatRateLine(state.from, state.to, rate, date);
}

async function refreshComputeOnly() {
  try {
    const data = await computeConversion();
    paintConversion(data);
  } catch (err) {
    console.error("Error DV-14:", err);
    if (resultEl) resultEl.textContent = "—";
    if (metaEl) metaEl.textContent = "No se pudo obtener la cotización.";
  }
}
/* =========================
   DV-15: Auto-update / recalcula el resultado
   ========================= */

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

const refreshComputeDebounced = debounce(() => {
  refreshComputeOnly();
}, 250);


/* =========================
   Init + eventos
   ========================= */
   
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
