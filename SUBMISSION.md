# Devpost submission record — 03 License Repair

Status checked on October 30, 2026: **SUBMITTED**, 5/5 steps complete, to the PayPal AI Hackathon. This file records the selected 03 license-repair entry; it does not describe the other unselected concepts.

Public Devpost project: https://devpost.com/software/node-license-graph-studio

Public source and MIT license: https://github.com/FOWEPJF255/node-license-graph-studio

Hosted no-payment demo: https://fowepjf255.github.io/node-license-graph-studio/?lang=en

Public walkthrough: https://youtu.be/R6wUhs-EXnA

The hosted GitHub Pages build supports the dependency graph, minimum-cost repair preview, local no-payment unlock, and repaired ZIP export. PayPal Sandbox checkout and Ollama extraction require the local Node.js server and are not enabled on the hosted static build.

## About the project

### Inspiration

A 3D scene can look finished while one missing license prevents delivery. Shared materials and sounds make the problem harder: one asset can block several objects, and replacing objects one by one costs more than repairing a shared dependency.

### What it does

NODE visualizes objects, shared assets, and license evidence as a dependency graph. Select an asset to see every affected object. The app applies conservative, deterministic rules to identify blockers and finds an exact minimum-cost set of replacements for the built-in scene. A before/after view shows the repaired scene. The local demo unlock exports a ZIP with a repaired GLB, generated replacement assets, a manifest, and an asset license.

You can import a GLB or JSON scene manifest. Missing evidence stays unverified. Optional local Qwen extraction proposes rights and exact supporting excerpts from pasted license text; a human must review and confirm them before the graph changes.

### How we built it

The browser UI uses Three.js, Vite, and JavaScript. A deterministic dependency engine computes impact and solves the minimum-cost cover problem. A local Node.js server connects to Ollama for structured AI extraction and implements PayPal Sandbox Orders v2 for the first-party replacement bundle. Checkout binds each order to a quote and validates the completed capture, amount, and currency before granting an entitlement. The demo path is clearly marked and never claims a payment occurred.

### Challenges

The biggest design challenge was separating AI interpretation from license authorization. The model can point to relevant language, but it cannot silently grant rights. We also kept imported or edited content outside the fixed-price checkout so a purchase cannot imply rights to third-party assets.

### Accomplishments and learning

One shared repair can clear multiple blockers at once. The graph, exact optimizer, and export make that effect inspectable. We verified the full PayPal Sandbox flow with a test buyer, from order creation and approval to completed capture and unlock. We learned to make uncertainty visible and to bind payment state to a specific deliverable rather than a generic success message.

### What's next

Add project accounts and persistent storage, then expand evidence review, webhook validation, and payment recovery for a hosted multi-user version.

## Suggested technologies

JavaScript, Node.js, Three.js, Vite, PayPal, Ollama, Qwen, GLB

## Published media and verification

The public 58-second YouTube video shows the dependency graph, shared-node repair preview, local no-payment unlock, and ZIP export. It does **not** show a live PayPal Sandbox checkout or live Qwen extraction. The Devpost story describes both integrations, and the repository provides their code and local setup instructions. Two screenshots are embedded in the Devpost story from `docs/screenshots/`; the optional Devpost gallery and file attachment are empty.

On October 30, 2026, `npm test` passed all seven tests and `npm run build` passed. The public repository and hosted demo returned HTTP 200, the public YouTube watch page played the 58-second video, and Devpost still showed **SUBMITTED / 5/5**. A local Ollama `qwen2.5:7b` call extracted a verbatim license excerpt, returned commercial-use and redistribution booleans, and kept `reviewed: false`. The local Sandbox ledger retained one completed test order from the October 29 end-to-end checkout; no real funds were used. `.env` remains Git-ignored.
