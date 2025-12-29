// app.js (DV-17) — FINAL
// - Conversión con Frankfurter (.app)
// - Auto-update con debounce
// - Swap / Refresh / Reset
// - Estados (loading/error/ok)
// - Gráfico histórico (últimos 30 días) con Chart.js
// - Formatos a 2 decimales (corrección pedida)

const API_BASE = "https://api.frankfurter.app";

const CURRENCIES = Object.freeze([
  { code: "EUR", name: "Euro (EUR)" },
  { code: "USD", name: "Dólar USA (USD)" },
  { code: "GBP", name: "Libra esterlina (GBP)" },
]);

const DEFAULTS = Object.freeze({
  from: "EUR",
  to: "USD",
  amount: "",
});

const state = {
  from: DEFAULTS.from,
  to: DEFAULTS.to,
  amount: DEFAULTS.amount, // string normalizado (con punto)
};

// ===== DOM =====
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const amountEl = document.getElementById("amount");
const swapBtn = document.getElementById("swap");
const resetBtn = document.getElementById("reset");
const refreshBtn = document.getElementById("refresh");

const resultEl = document.getElementById("result");
const metaEl = document.getElementById("meta");
const chartCanvas = document.getElementById("chart");
const chartNoteEl = document.getElementById("chartNote");

// Status UI
const statusEl = document.getElementById("status");
const statusTextEl = statusEl ? statusEl.querySelector(".status-text") : null;
const statusDotEl = statusEl ? statusEl.querySelector(".dot") : null;

function setStatus(type, text) {
  if (statusTextEl) statusTextEl.textContent = text;

  if (statusDotEl) {
    if (type === "ok") statusDotEl.style.background = "#22c55e";
    if (type === "loading") statusDotEl.style.background = "#f59e0b";
    if (type === "error") statusDotEl.style.background = "#ef4444";
  }
}

// ===== Selectores =====
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

function pickDifferentCurrency(excludeCode) {
  const alt = CURRENCIES.find(c => c.code !== excludeCode);
  return alt ? alt.code : excludeCode;
}

function ensureDifferentCurrencies(changed) {
  if (state.from !== state.to) return;

  if (changed === "from") {
    state.to = pickDifferentCurrency(state.from);
    toEl.value = state.to;
  } else if (changed === "to") {
    state.from = pickDifferentCurrency(state.to);
    fromEl.value = state.from;
  }
}

function syncUIFromState() {
  fromEl.value = state.from;
  toEl.value = state.to;
  amountEl.value = state.amount;
}

function setFrom(code) {
  state.from = code;
  ensureDifferentCurrencies("from");
  syncUIFromState();
}

function setTo(code) {
  state.to = code;
  ensureDifferentCurrencies("to");
  syncUIFromState();
}

// ===== Importe (DV-10 + DV-11) =====
function normalizeAmountInput(raw) {
  // aceptar coma y normalizar internamente a punto
  let s = String(raw || "").replace(/,/g, ".");
  // no negativos: elimina '-'; deja solo dígitos y punto
  s = s.replace(/[^\d.]/g, "");

  // solo un punto
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    const before = s.slice(0, firstDot + 1);
    const after = s.slice(firstDot + 1).replace(/\./g, "");
    s = before + after;
  }

  // max 2 decimales
  const dotPos = s.indexOf(".");
  if (dotPos !== -1) {
    const intPart = s.slice(0, dotPos);
    const decPart = s.slice(dotPos + 1).slice(0, 2);
    s = intPart + "." + decPart;
  }

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

function resetAmountOnly() {
  state.amount = DEFAULTS.amount;
  amountEl.value = state.amount;
}

// ===== API (DV-13) =====
async function fetchLatestRate(from, to) {
  const url = `${API_BASE}/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error API latest: ${res.status}`);
  const data = await res.json();

  const rate = data?.rates?.[to];
  if (typeof rate !== "number") throw new Error("Respuesta API sin tasa esperada.");
  return { rate, date: data.date };
}

async function fetchTimeSeries(from, to, start, end) {
  const url = `${API_BASE}/${start}..${end}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error API timeseries: ${res.status}`);
  const data = await res.json();

  const ratesObj = data.rates || {};
  const dates = Object.keys(ratesObj).sort();
  const filtered = dates
    .map(d => ({ d, v: ratesObj[d]?.[to] }))
    .filter(x => typeof x.v === "number");

  return { labels: filtered.map(x => x.d), values: filtered.map(x => x.v) };
}

// ===== Cálculo (DV-14) =====
function parseAmountToNumber(amountStr) {
  const n = Number(amountStr);
  return Number.isFinite(n) ? n : NaN;
}

async function computeConversion() {
  const amountNum = parseAmountToNumber(state.amount);
  if (!Number.isFinite(amountNum)) return { converted: NaN, rate: NaN, date: null };

  const { rate, date } = await fetchLatestRate(state.from, state.to);
  const converted = amountNum * rate;
  return { converted, rate, date };
}

// ===== Formato resultado (DV-16 con 2 decimales) =====
function formatMoney(value, currency) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} ${currency}`;
}

function formatRateLine(from, to, rate, date) {
  if (!Number.isFinite(rate)) return "Introduce un importe válido.";
  const dateTxt = date ? ` · Fecha referencia: ${date}` : "";
  return `Tipo: 1 ${from} = ${rate.toFixed(2)} ${to}${dateTxt}`;
}

// ===== Chart.js (DV-17) =====
let chart = null;

function ensureChart() {
  if (chart) return chart;
  if (!chartCanvas || typeof Chart === "undefined") return null;

  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Tipo de cambio",
        data: [],
        tension: 0.25,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 6 } },
        y: { ticks: { maxTicksLimit: 6 } },
      },
    },
  });

  return chart;
}

function setChartData(labels, values) {
  const c = ensureChart();
  if (!c) return;
  c.data.labels = labels;
  c.data.datasets[0].data = values;
  c.update();
}

function dateISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function updateChart() {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    const startISO = dateISO(start);
    const endISO = dateISO(end);

    const { labels, values } = await fetchTimeSeries(state.from, state.to, startISO, endISO);
    setChartData(labels, values);

    if (chartNoteEl) chartNoteEl.textContent = `${state.from} → ${state.to} · Últimos 30 días`;
  } catch (err) {
    console.error(err);
    if (chartNoteEl) chartNoteEl.textContent = "No se pudo cargar el histórico.";
  }
}

// ===== DV-15: auto update + debounce =====
function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function updateAllNow() {
  try {
    ensureDifferentCurrencies("from");

    const amountNum = parseAmountToNumber(state.amount);
    if (!Number.isFinite(amountNum)) {
      if (resultEl) resultEl.textContent = "—";
      if (metaEl) metaEl.textContent = "Introduce un importe válido.";
      setStatus("ok", "Listo");
      // Aun así podemos refrescar el gráfico (depende de si queréis); aquí sí:
      await updateChart();
      return;
    }

    setStatus("loading", "Actualizando…");

    const { converted, rate, date } = await computeConversion();
    if (resultEl) resultEl.textContent = formatMoney(converted, state.to);
    if (metaEl) metaEl.textContent = formatRateLine(state.from, state.to, rate, date);

    await updateChart();

    setStatus("ok", "Actualizado");
  } catch (err) {
    console.error(err);
    setStatus("error", "Error al cargar datos");
    if (metaEl) metaEl.textContent = "No se pudieron obtener las cotizaciones.";
    if (resultEl) resultEl.textContent = "—";
    if (chartNoteEl) chartNoteEl.textContent = "No se pudo cargar el histórico.";
  }
}

const updateAllDebounced = debounce(updateAllNow, 250);

// ===== Init =====
function init() {
  populateSelect(fromEl, state.from);
  populateSelect(toEl, state.to);
  syncUIFromState();
  setStatus("ok", "Listo");

  // Tamaño fijo del canvas para que Chart.js se vea bien con nuestro CSS
  // (si chart-wrap ya define tamaño, esto no molesta)
  if (chartCanvas) {
    chartCanvas.style.width = "100%";
    chartCanvas.style.height = "240px";
  }

  // Primera carga
  updateAllNow();

  fromEl.addEventListener("change", () => {
    setFrom(fromEl.value);
    updateAllDebounced();
  });

  toEl.addEventListener("change", () => {
    setTo(toEl.value);
    updateAllDebounced();
  });

  amountEl.addEventListener("input", () => {
    setAmount(amountEl.value, { formatOnBlur: false });
    updateAllDebounced();
  });

  amountEl.addEventListener("blur", () => {
    setAmount(amountEl.value, { formatOnBlur: true });
    updateAllDebounced();
  });

  swapBtn.addEventListener("click", () => {
    const a = state.from;
    state.from = state.to;
    state.to = a;
    ensureDifferentCurrencies("from");
    syncUIFromState();
    updateAllDebounced();
  });

  resetBtn.addEventListener("click", () => {
    resetAmountOnly();
    updateAllDebounced();
  });

  refreshBtn.addEventListener("click", () => {
    updateAllNow();
  });
}

init();
