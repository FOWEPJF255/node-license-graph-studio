# NODE — License Graph Studio

NODE helps 3D creators find and repair licensing blockers before delivering a scene. One shared material or sound can affect several objects; the dependency graph shows that impact and computes the least-cost set of replacements that clears every blocker.

This is a local, single-user MVP for the PayPal AI Hackathon. The included scene and replacement assets are generated in code. Inspection and local demo export work without a PayPal account or AI model.

## Run

Requires Node.js 24 or later.

```bash
npm install
npm test
npm run build
npm run server
```

Open `http://127.0.0.1:4174/?lang=en` for the English interface (or use the language switch in the header). Select a shared asset to highlight every object using it. Preview the repair, then use **Local demo unlock** to export a ZIP without a transaction. The ZIP contains the repaired GLB, generated material PNG, alert WAV, replacement manifest, and asset license.

The app accepts `.glb` and project JSON manifests. Imported meshes and shared materials become graph nodes. Missing license evidence remains unverified and blocks delivery. Imported or edited scenes cannot be purchased as the included asset bundle. See `src/demo-data.js` for the JSON structure.

## AI-assisted license review

Optional local Ollama `qwen2.5:7b` extracts commercial-use and redistribution terms, supporting excerpts, and an explanation from pasted license text. Every excerpt must match the source text. AI output is always a draft; a person must confirm it before deterministic license rules update the graph. Unknown and unverified rights continue to block export. This is not legal advice.

To enable it, install [Ollama](https://ollama.com/), run its local service, and execute `ollama pull qwen2.5:7b`. The graph, optimizer, and demo export work without Ollama.

## PayPal Sandbox checkout

The server implements Sandbox OAuth and Orders v2 creation, approval return, order lookup, capture, amount/currency/quote checks, and stable idempotency keys. Set credentials locally:

```bash
cp .env.example .env
# Edit PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env
npm run server
```

Do not commit `.env`. The unchanged built-in scene offers a $6.49 bundle of first-party, code-generated replacement assets. The server grants a purchase unlock only after a matching `COMPLETED` capture. On October 29, 2026, the complete Sandbox flow was verified with a test buyer: order creation, buyer approval, capture, amount validation, return to the app, and purchase unlock. No real funds were used. Local demo unlocks remain visibly separate from purchase entitlements.

For Vite development, use `npm run dev` and set `PUBLIC_ORIGIN=http://127.0.0.1:5173` in `.env` for the return URL. The built app uses port 4174.

## Implementation

- `src/engine.js`: license rules, impact traversal, exact minimum-cost repair, and replacement mapping.
- `src/main.js`: Three.js scene, graph UI, imports, comparison, human AI review, and ZIP export.
- `server/ai.js`: structured local Qwen extraction.
- `server/paypal.js`: Sandbox requests and capture verification.
- `server/index.js`: local API, order records, and static hosting.
- `DESIGN.md`: Work Buddy visual concepts and implementation decisions.

The demo geometry and assets are generated in code. The GLB importer extracts mesh/material dependencies, but a project owner must verify the geometry's rights and external license evidence. Orders are stored in a local `.data/orders.json` file. A public deployment would require accounts, a database, webhook validation, refund state synchronization, and more payment-failure tests.

Source code is licensed under MIT; generated replacement assets exported by the demo carry the license bundled in their ZIP.
