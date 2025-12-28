// app.js (DV-9)
// DV-9: se añade el manejo básico del campo "amount" (sin restricciones aún).

const CURRENCIES = Object.freeze([
  { code: "EUR", name: "Euro (EUR)" },
  { code: "USD", name: "Dólar USA (USD)" },
  { code: "GBP", name: "Libra esterlina (GBP)" },
]);

const state = {
  from: "EUR",
  to: "USD",
  amount: "", // DV-9: guardar lo que escribe el usuario
};

const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const amountEl = document.getElementById("amount");
const swapBtn = document.getElementById("swap");

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

// DV-7 helpers
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

// DV-8 API estado
function getSelection() {
  return { ...state };
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

// DV-9: setter simple (sin validar todavía)
function setAmount(rawValue) {
  state.amount = String(rawValue ?? "");
  amountEl.value = state.amount;
}

function init() {
  populateSelect(fromEl, state.from);
  populateSelect(toEl, state.to);
  syncUIFromState();

  fromEl.addEventListener("change", () => {
    setFrom(fromEl.value);
    console.log("Selección:", getSelection());
  });

  toEl.addEventListener("change", () => {
    setTo(toEl.value);
    console.log("Selección:", getSelection());
  });

  // DV-9: capturar lo que el usuario escribe
  amountEl.addEventListener("input", () => {
    setAmount(amountEl.value);
    console.log("Selección:", getSelection());
  });

  // Swap (solo UI/estado)
  swapBtn.addEventListener("click", () => {
    const a = state.from;
    state.from = state.to;
    state.to = a;
    ensureDifferentCurrencies("from");
    syncUIFromState();
    console.log("Selección:", getSelection());
  });
}

init();
