(() => {
  "use strict";

  const API_BASE = "https://api.frankfurter.dev/v1";
  const STORAGE_KEY = "ccx.website.state.v1";
  const DEBOUNCE_MS = 250;
  const DEFAULTS = { from: "USD", to: "EUR", amount: "1" };

  const els = {
    app: document.querySelector(".converter"),
    amount: document.getElementById("amount"),
    from: document.getElementById("from"),
    to: document.getElementById("to"),
    swap: document.getElementById("swap"),
    resultValue: document.getElementById("resultValue"),
    resultRate: document.getElementById("resultRate"),
    rateMeta: document.getElementById("rateMeta"),
    error: document.getElementById("error"),
  };

  let currencies = {};
  let convertToken = 0;

  const storage = {
    get(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : undefined;
      } catch {
        return undefined;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
  };

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function setBusy(busy) {
    els.app.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function showError(message) {
    if (!message) {
      els.error.hidden = true;
      els.error.textContent = "";
      return;
    }
    els.error.hidden = false;
    els.error.textContent = message;
  }

  function formatAmount(value, code) {
    if (!Number.isFinite(value)) return "-";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        maximumFractionDigits: value >= 1 ? 2 : 6,
      }).format(value);
    } catch {
      const digits = value >= 1 ? 2 : 6;
      return `${value.toFixed(digits)} ${code}`;
    }
  }

  function formatRate(rate, from, to) {
    if (!Number.isFinite(rate)) return "";
    const digits = rate >= 1 ? 4 : 6;
    return `1 ${from} = ${rate.toFixed(digits)} ${to}`;
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function populateSelect(select, selectedCode) {
    const entries = Object.entries(currencies).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    select.innerHTML = "";
    for (const [code, name] of entries) {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${code} - ${name}`;
      if (code === selectedCode) opt.selected = true;
      select.appendChild(opt);
    }
    select.disabled = false;
  }

  async function loadCurrencies() {
    els.rateMeta.textContent = "Loading currencies...";
    const data = await fetchJSON(`${API_BASE}/currencies`);
    currencies = data && typeof data === "object" ? data : {};
    if (!Object.keys(currencies).length) {
      throw new Error("No currencies returned");
    }
  }

  async function convert() {
    const token = ++convertToken;
    showError("");

    const raw = els.amount.value.trim();
    const from = els.from.value;
    const to = els.to.value;

    if (!from || !to) return;

    if (raw === "") {
      els.resultValue.textContent = "-";
      els.resultRate.textContent = "";
      return;
    }

    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      els.resultValue.textContent = "-";
      els.resultRate.textContent = "";
      showError("Enter a non-negative number.");
      return;
    }

    if (from === to) {
      els.resultValue.textContent = formatAmount(amount, to);
      els.resultRate.textContent = `1 ${from} = 1.0000 ${to}`;
      els.rateMeta.textContent = "Same currency";
      persist();
      return;
    }

    setBusy(true);
    try {
      const url = `${API_BASE}/latest?from=${encodeURIComponent(
        from,
      )}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`;
      const data = await fetchJSON(url);
      if (token !== convertToken) return;

      const converted = data?.rates?.[to];
      if (!Number.isFinite(converted)) {
        throw new Error("Unexpected API response");
      }

      const rate = amount > 0 ? converted / amount : 0;
      els.resultValue.textContent = formatAmount(converted, to);
      els.resultRate.textContent = formatRate(rate, from, to);
      els.rateMeta.textContent = data?.date ? `ECB rate · ${data.date}` : "ECB rate";
      persist();
    } catch (err) {
      if (token !== convertToken) return;
      console.error("convert error", err);
      els.resultValue.textContent = "-";
      els.resultRate.textContent = "";
      showError(
        err?.message?.includes("HTTP 4")
          ? "That currency pair isn't supported."
          : "Couldn't reach the rates service. Check your connection.",
      );
    } finally {
      if (token === convertToken) setBusy(false);
    }
  }

  const convertDebounced = debounce(convert, DEBOUNCE_MS);

  function persist() {
    storage.set(STORAGE_KEY, {
      from: els.from.value,
      to: els.to.value,
      amount: els.amount.value,
    });
  }

  function wireEvents() {
    els.amount.addEventListener("input", convertDebounced);
    els.from.addEventListener("change", convert);
    els.to.addEventListener("change", convert);
    els.swap.addEventListener("click", () => {
      const f = els.from.value;
      els.from.value = els.to.value;
      els.to.value = f;
      convert();
    });
    els.amount.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        convert();
      }
    });
  }

  async function init() {
    try {
      const saved = storage.get(STORAGE_KEY) || {};
      await loadCurrencies();

      const fromCode =
        currencies[saved.from] ? saved.from :
        currencies[DEFAULTS.from] ? DEFAULTS.from :
        Object.keys(currencies)[0];

      let toCode =
        currencies[saved.to] ? saved.to :
        currencies[DEFAULTS.to] ? DEFAULTS.to :
        Object.keys(currencies)[1] || fromCode;

      if (toCode === fromCode) {
        toCode = Object.keys(currencies).find((c) => c !== fromCode) || toCode;
      }

      populateSelect(els.from, fromCode);
      populateSelect(els.to, toCode);

      els.amount.value =
        typeof saved.amount === "string" && saved.amount !== ""
          ? saved.amount
          : DEFAULTS.amount;

      els.swap.disabled = false;
      wireEvents();
      els.amount.select();

      await convert();
    } catch (err) {
      console.error("init error", err);
      els.rateMeta.textContent = "";
      showError("Couldn't load currencies. Please check your connection and retry.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
