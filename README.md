# Cart & Cook

A meal planner for your iPhone. Tell it how many people are eating, how many days to plan,
which meals, and your grocery budget. It finds grocery stores near you, then **Gemma 4,
running on your phone**, writes the meal plan, the recipes and a priced shopping list.

- **On-device AI.** Uses Google's Gemma 4 E2B model through the
  [LiteRT-LM](https://ai.google.dev/edge/litert-lm) web runtime and your phone's GPU (WebGPU).
  The model downloads once (2.0 GB) and is stored privately on the phone. After that, plans and
  recipes work offline, and nothing you type is sent anywhere.
- **Stores by ZIP code.** Type your ZIP code (no location access needed) and it lists the
  supermarkets and grocery stores around it from OpenStreetMap, with distance, address, hours,
  a rough price level, the chain's own brands and directions in Apple Maps. The closest store is
  picked for you; tap another to switch.
- **Brand names and real prices.** Gemma writes the shopping list with the store's own brands
  (Great Value at Walmart, Kirkland Signature at Costco, Goldhen and Happy Farms at ALDI, and so
  on). Its prices are estimates, so every item has a link to that store's own website (or its
  Instacart page) to see the real local price. No free public source gives live shelf prices
  for most US chains, so the app doesn't pretend to have them.
- **Budget-aware.** Shows cost per serving as you type, the estimated cart against your budget,
  what each meal costs, and a "Make it cheaper" button when the list runs over.
- **Shopping list.** Grouped by aisle, tick items off as you shop, and share it to Notes,
  Messages or Reminders.

## Put it on your iPhone

The app is a set of static files, so any HTTPS host works. With GitHub Pages:

1. The repository must be **public** for GitHub Pages on a free plan
   (Settings → General → Danger Zone → Change visibility).
2. Settings → Pages → Build and deployment → Source: **Deploy from a branch**, pick the branch
   with these files and the `/ (root)` folder, then Save.
3. After a minute, open `https://<your-username>.github.io/<repo-name>/` in **Safari** on the iPhone.
4. Tap **Share → Add to Home Screen**. Open it from the Home Screen icon from then on: it runs
   full screen, and iOS keeps the downloaded model for Home Screen apps.
5. In the app, tap **Download Gemma 4** on Wi-Fi and keep the app open until it finishes
   (a few minutes). If it stops, it resumes where it left off.

Requirements: iOS 26 or later (Safari with WebGPU) and about 2.5 GB of free space. On first use
it also needs internet once to fetch the Gemma runtime, which is then cached for offline use.

## Files

| File | What it does |
| --- | --- |
| `index.html`, `styles.css` | Layout and look |
| `app.js` | Tabs, form, prompts, meal plan, recipes, shopping list |
| `gemma.js` | Loads Gemma 4 with LiteRT-LM and streams answers |
| `download-worker.js` | Downloads the model into private storage, resumable |
| `stores.js` | ZIP lookup, OpenStreetMap store search, chain brands and price links |
| `sw.js`, `manifest.webmanifest`, `icons/` | Home Screen app and offline support |

## Notes

- Prices are Gemma's estimates, not live store prices.
- Gemma 4 E2B is a small model. Plans are good starting points; check recipes for allergens.
- Store data © OpenStreetMap contributors. Gemma is provided under the Apache 2.0 license by
  Google via the `litert-community/gemma-4-E2B-it-litert-lm` model on Hugging Face.
