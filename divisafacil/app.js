// DV-4: Selector de moneda de origen (UI)
// Nota: La lista de monedas (DV-6) se mantiene simple aquí para habilitar el selector.

const CURRENCIES = [
  { code: "EUR", name: "Euro (EUR)" },
  { code: "USD", name: "Dólar USA (USD)" },
  { code: "GBP", name: "Libra esterlina (GBP)" },
];

const state = {
  from: "EUR",
};

const fromEl = document.getElementById("from");

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
  populateSelect(fromEl, state.from);

  fromEl.addEventListener("change", () => {
    state.from = fromEl.value;
    // Futuro (DV-8): actualizar estado global compartido con "to"
    console.log("Moneda origen:", state.from);
  });
}

init();
