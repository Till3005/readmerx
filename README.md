# ReadmeRx — your README is mid and you know it

A free micro-tool that scores any README against 12 weighted heuristics and
roasts it mercilessly — built as a **real A/B experiment on Flagsmith
Experimentation** for Toggle Wars (Track 01).

**Live:** https://till3005.github.io/readmerx/

## The experiment

ReadmeRx has a genuine open question at its core: does a developer audience
click more on a professional call-to-action or a provocative one?

| | Control | Variant |
|---|---|---|
| Headline | "Is your README costing you stars?" | "Your README is mid and you know it." |
| CTA | "Score my README" | "Roast my README 🔥" |

- **Hypothesis**: the roast CTA produces a higher click-through rate because
  provocative copy creates stronger curiosity for developer audiences.
- **Primary metric**: `cta_click` (occurrence) — deliberately early-funnel so
  significance is reachable within the hackathon window.
- **Secondary metric**: `analysis_complete` — do roast-clickers follow through?

## How Flagsmith is used

Flagsmith is core to every layer of this project:

1. **Multivariate feature flag** `landing_cta` — control value vs variant
   `roast`, weighted 50/50.
2. **Experimentation (beta)** — metrics `cta_click` and `analysis_complete`
   defined as occurrence events; the experiment was created on the flag with
   hypothesis, primary metric and rollout, then started — all through the
   Flagsmith API.
3. **JavaScript SDK** — `@flagsmith/flagsmith` (v12, via esm.sh) in the
   browser: `init({ environmentID, identity, enableEvents: true })`. Every
   visitor gets a persistent anonymous identity in localStorage.
   `getExperimentFlag('landing_cta')` records the exposure and drives which
   copy renders; `trackEvent('cta_click')` / `trackEvent('analysis_complete')`
   record conversions. Events batch to the managed warehouse.
4. **Ship decision** — when the Bayesian results land, the winner rolls out
   through the same flag. No redeploy.

## Traffic

Per the rules, simulated traffic is explicitly fine ("you don't need real
users"). `botfleet.mjs` is a fleet of headless browsers with varied user
agents, viewports and locales, realistic scroll/dwell behavior and a day/night
cadence. **The fleet is behaviorally honest**: bots never read their assigned
variant — their click propensity depends only on the copy actually rendered,
exactly like human visitors. The assignment stays hidden behind the SDK, so
exposure→conversion attribution in Flagsmith is uncontaminated.

## Running it yourself

```bash
# the site is static — serve the folder or open the GitHub Pages URL
npx serve readmerx/

# traffic fleet
npm i playwright-core
RX_URL=https://till3005.github.io/readmerx/ node botfleet.mjs
```

## The bug that almost killed the experiment

Mid-experiment the page read `flag.variant` — which returns the variant
**key** (`Variant_1`), not the assigned **value** (`roast`) — so the roast arm
never rendered and every visitor silently saw control. Caught by probing the
identities API directly (`aaa` → roast) against what the page rendered,
diffing assignment vs render. Fixed by preferring `flag.value`. If you run
experiments: verify both arms end-to-end with known identities before you
trust a single data point.

## Repo layout

- `index.html` — the whole app (landing + analyzer lab, vanilla JS)
- `analyzer.js` — 12-heuristic README scorer + roast engine
- `../botfleet.mjs` — the traffic fleet
- `../skill/SKILL.md` — **ship-safely**, the Track 04 agent skill
- `video/demo.mp4` — demo video

## License

MIT
