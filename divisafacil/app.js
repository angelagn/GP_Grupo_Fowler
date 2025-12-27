// DV-7: Evitar selección misma moneda en los dos campos.


const CURRENCIES = Object.freeze([
  { code: "EUR", name: "Euro (EUR)" },
  { code: "USD", name: "Dólar USA (USD)" },
  { code: "GBP", name: "Libra esterlina (GBP)" },
]);

const state = {
  from: "EUR",
  to: "USD",
};

const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");

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
    toEl.value = state.to;
  } else if (changed === "to") {
    // Si el usuario cambió "to" y coincide con "from", ajustamos "from"
    state.from = pickDifferentCurrency(state.to);
    fromEl.value = state.from;
  }
}

function init() {
  // Rellenar ambos selectores
  populateSelect(fromEl, state.from);
  populateSelect(toEl, state.to);

  // Guardar cambios en el estado + DV-7: evitar iguales
  fromEl.addEventListener("change", () => {
    state.from = fromEl.value;
    ensureDifferentCurrencies("from");
    console.log("Moneda origen:", state.from, "| Moneda destino:", state.to);
  });

  toEl.addEventListener("change", () => {
    state.to = toEl.value;
    ensureDifferentCurrencies("to");
    console.log("Moneda origen:", state.from, "| Moneda destino:", state.to);
  });
}

init();
