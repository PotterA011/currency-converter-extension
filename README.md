# Currency Converter (Chrome Extension)

A tiny Manifest V3 Chrome extension. Click the toolbar icon to open a popup
and convert any amount between two supported currencies, using the free
[Frankfurter](https://www.frankfurter.dev/) API (ECB daily reference rates,
no API key required).

Website: <https://pottera011.github.io/currency-converter-extension/>

Privacy policy: <https://pottera011.github.io/currency-converter-extension/privacy.html>

## Features

- Toolbar popup (~340px wide), no content scripts
- All ECB-supported currencies, fetched from `/v1/currencies` at open
- Live conversion as you type (debounced) via `/v1/latest`
- Swap button to reverse the pair
- Remembers your last pair + amount across openings
  (`chrome.storage.local`)
- Graceful loading / error states
- Light + dark theme via `prefers-color-scheme`

## Privacy

Currency Converter does not collect, sell, share, or transmit personal
information. It stores only your last selected amount and currency pair locally
with `chrome.storage.local`, so the popup can restore your previous settings.
Conversion requests are sent directly to the Frankfurter API for exchange
rates; no account, API key, analytics, cookies, identity services, browsing
history access, or page content access are used.

For Chrome Web Store submission, use this hosted privacy policy URL:
<https://pottera011.github.io/currency-converter-extension/privacy.html>

The repository copy is in [PRIVACY.md](PRIVACY.md).

## Install (Load Unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select this folder
   (`currency-converter-extension/`).
4. Optional: pin the extension via the puzzle-piece menu so the icon sits
   on the toolbar.
5. Click the icon to open the popup.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest, declares the popup and host permission for the Frankfurter API |
| `popup.html` | Popup markup (amount input, from/to selects, swap, result) |
| `popup.css` | Popup styling (light/dark) |
| `popup.js` | Fetches currencies and conversions, handles events + persistence |
| `PRIVACY.md` | Privacy statement for users and Chrome Web Store review |
| `icons/icon{16,32,48,128}.png` | Toolbar + store icons (placeholder) |

## API notes

- Base URL: `https://api.frankfurter.dev/v1`
- Endpoints used:
  - `GET /currencies` → `{ "USD": "US Dollar", ... }`
  - `GET /latest?from=USD&to=EUR&amount=100` →
    `{ "amount": 100, "base": "USD", "date": "YYYY-MM-DD", "rates": { "EUR": 84.77 } }`

Only ECB-listed currencies are available. Rates are daily, not real-time.

## Manual smoke test

Open the popup and verify:

- The **From/To** dropdowns fill in (you should see `USD — US Dollar`,
  `EUR — Euro`, etc.).
- Typing an amount updates the result after a brief pause.
- Swap flips the pair and reconverts.
- The footer line under the title shows `ECB rate · YYYY-MM-DD`.
- Closing and reopening the popup restores your last selection.
- Offline: you should see a friendly error instead of a silent failure.

## Troubleshooting

- **"Couldn't reach the rates service."** — Your network (or a VPN /
  corporate proxy) is blocking `api.frankfurter.dev`. Retry or connect
  to a different network.
- **A currency you want is missing.** — Frankfurter only covers
  ECB-published currencies. For broader coverage you'd swap the provider
  in `popup.js` (`API_BASE`) for one like exchangerate-api.com (requires
  an API key) and update `host_permissions` in `manifest.json`.
