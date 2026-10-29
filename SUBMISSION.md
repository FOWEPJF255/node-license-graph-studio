# Devpost submission draft

Hosted no-payment demo: https://fowepjf255.github.io/node-license-graph-studio/?lang=en

Public walkthrough: https://youtu.be/R6wUhs-EXnA

## About the project

### Inspiration

A 3D scene can look finished while one missing license prevents delivery. Shared materials and sounds make the problem harder: one asset can block several objects, and replacing objects one by one costs more than repairing a shared dependency.

### What it does

NODE visualizes objects, shared assets, and license evidence as a dependency graph. Select an asset to see every affected object. The app applies conservative, deterministic rules to identify blockers and finds an exact minimum-cost set of replacements for the built-in scene. A before/after view shows the repaired scene. The local demo unlock exports a ZIP with a repaired GLB, generated replacement assets, a manifest, and an asset license.

You can import a GLB or JSON scene manifest. Missing evidence stays unverified. Optional local Qwen extraction proposes rights and exact supporting excerpts from pasted license text; a human must review and confirm them before the graph changes.

### How we built it

The browser UI uses Three.js, Vite, and JavaScript. A deterministic dependency engine computes impact and solves the minimum-cost cover problem. A local Node.js server connects to Ollama for structured AI extraction and implements PayPal Sandbox Orders v2 for the first-party replacement bundle. Checkout binds each order to a quote and validates completed captures before granting an entitlement. The demo path is clearly marked and never claims a payment occurred.

### Challenges

The biggest design challenge was separating AI interpretation from license authorization. The model can point to relevant language, but it cannot silently grant rights. We also kept imported or edited content outside the fixed-price checkout so a purchase cannot imply rights to third-party assets.

### Accomplishments and learning

One shared repair can clear multiple blockers at once. The graph, exact optimizer, and export make that effect inspectable. We verified the full PayPal Sandbox flow with a test buyer, from order creation and approval to completed capture and unlock. We learned to make uncertainty visible and to bind payment state to a specific deliverable rather than a generic success message.

### What's next

Add project accounts and persistent storage, then expand evidence review and payment recovery for a hosted multi-user version.

## Suggested technologies

JavaScript, Node.js, Three.js, Vite, PayPal, Ollama, Qwen, GLB

## Video outline (under three minutes)

1. Show the 3D scene and license status. Select the shared material; highlight affected objects.
2. Inspect the dependency graph and blocked export state.
3. Preview the minimum-cost repair and compare before/after.
4. Show optional AI extraction with a sample license excerpt and the required human confirmation.
5. Demonstrate the local demo unlock and download/open the ZIP contents.
6. If verified, show a real PayPal Sandbox checkout and completed capture; never imply the local demo unlock is a payment.
