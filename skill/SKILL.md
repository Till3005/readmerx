---
name: ship-safely
description: Ship any feature behind a Flagsmith flag with a safe rollout and rollback path. Use when asked to add feature flags, gate a release, run a canary/percentage rollout, set up a kill switch, or A/B test a change. Covers the full lifecycle - create the flag, wire the SDK, roll out gradually, measure with experimentation, and clean up after.
---

# Ship Safely with Flagsmith

Feature flags turn deployments into non-events. This skill walks through the
complete lifecycle: gate the change, ship it dark, roll out gradually, measure,
and clean up. The cardinal rule: **never deploy a user-facing change you cannot
turn off in seconds without a redeploy.**

## When to use

- Adding feature flags or a kill switch to an app
- Releasing a risky change gradually (canary / percentage rollout)
- Running an A/B test or experiment on real traffic
- Turning something OFF fast in production

## Core concepts (30 seconds)

- **Flag** = named on/off switch (optionally with a value or variants), evaluated per-user or per-request.
- **Environment** = dev / staging / prod each have independent flag states but share the flag definition.
- **Identity** = a user or request you evaluate flags for. Always identify users (`flagsmith.init({identity})` or server SDK `getIdentityFlags`) — anonymous evaluations can't be segmented or experimented on.
- **Segment** = a rule group ("beta testers", "country=AU") you can override flags for.
- **Experiment** = a multivariate flag + a primary metric + measured events, with statistical analysis done for you.

## Step 1 - Create the flag

Dashboard: Features → Create Feature. Name it for the *capability*, not the
release (`new_checkout`, not `sprint_42_work`).

Or the API (`Authorization: Token <org-token>` or SDK key for server-side):

```bash
curl -X POST https://api.flagsmith.com/api/v1/projects/<PROJECT_ID>/features/ \
  -H "Authorization: Token <TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"new_checkout","default_enabled":false,"initial_value":"control","type":"MULTIVARIATE"}'
```

Rules of thumb:
- Default OFF in every environment. The flag existing should change nothing.
- For experiments make it MULTIVARIATE: control value + one or more named
  variants, each with a weight (they must sum to 100 with the control).

## Step 2 - Wire the SDK

JavaScript/TypeScript web:

```js
import flagsmith from '@flagsmith/flagsmith';

await flagsmith.init({
  environmentID: '<CLIENT_ENV_KEY>',
  identity: userId,            // ALWAYS identify — required for segments + experiments
  enableEvents: true,          // required for experimentation metrics
});

if (flagsmith.hasFeature('new_checkout')) { /* new path */ } else { /* old path */ }
```

Python server-side:

```python
from flagsmith import Flagsmith
flagsmith = Flagsmith(environment_key="<SERVER_ENV_KEY>")
flags = flagsmith.get_identity_flags(identifier=user_id)
if flags.is_feature_enabled("new_checkout"): ...
```

- Use the **client** key in browsers, the **server** key in backends. Server
  keys can evaluate locally (no per-request network call).
- Always keep the old code path behind the `else`. The flag IS the rollback.

## Step 3 - Roll out gradually

Never flip 0% → 100%. The ladder:

1. **Internal**: segment override for your team only. Verify in prod while
   nobody else sees it.
2. **Canary**: segment override or percentage rollout to 1–5% of users.
   Watch errors and metrics for at least one usage cycle.
3. **Ramping**: 25% → 50% → 100%, holding at each step long enough to trust it.
4. **Cleanup**: once at 100% and stable for days, remove the flag and the old
   code path. Flags are debt with interest.

If anything looks wrong at any step: flip the flag off. That's the whole point —
the rollback takes seconds, not a deploy.

## Step 4 - Run an experiment (A/B test)

Experimentation is a beta feature using a managed warehouse + Bayesian stats.

1. Create a multivariate flag (control + variants with weights).
2. Define metrics: Experimentation → Metrics. Pick the event name your app
   sends, aggregation (`occurrence` = conversion-style, `count`/`sum`/`mean`
   for volume), and direction (higher/lower is better).
3. Create the experiment on the flag: hypothesis, primary metric (the ONE
   you'll decide on — pick something that fires early in the funnel, like a
   click, not a late conversion), secondary metrics for context.
4. In code: `flagsmith.getExperimentFlag('flag_name')` records the exposure;
   `flagsmith.trackEvent('event_name')` records the conversion. Users must be
   identified. Events batch every ~10s client-side.
5. Start the experiment and DON'T peek-and-stop. Decide the sample size or
   duration up front; Bayesian results update continuously but early noise
   flips back and forth.
6. When significance is reached: ship the winner via the rollout decision,
   or kill it and iterate.

API quick reference (experimentation beta):

```
POST /api/v1/environments/{env_key}/experiment-metrics/   create metric
POST /api/v1/environments/{env_key}/experiments/          create experiment
POST /api/v1/environments/{env_key}/experiments/{id}/start/
GET  /api/v1/environments/{env_key}/experiments/{id}/results/
```

Metric definition format: `{"event": "<event_name>", "version": 1}`.
Experiment needs `experiment_rollout` with `feature_state_value` control and
`multivariate_feature_state_values` weights matching the flag.

## Anti-patterns — don't do these

- Deploying flagged code where the new path is the default when the SDK fails
  to initialize. Default must be the OLD behavior.
- Evaluating flags without an identity, then wondering why segments don't work.
- Flipping a flag for everyone at once because "it's been fine in staging".
- Leaving flags in the codebase after full rollout — every stale flag is a
  future incident when someone misreads which path is live.
- Peeking at experiment results daily and stopping the first time the variant
  leads. That's how you ship noise.
- Server-side only flags you forget exist on the client (or vice versa) —
  decide where evaluation happens per flag and document it in the description.

## Debugging checklist

- Flag always default? → check environment key matches the env you're editing;
  check identity is passed consistently (same user, same string).
- Override not applying? → segment operators are case-sensitive; identity
  traits must be set before evaluation.
- No experiment data? → `enableEvents: true` in init, users identified,
  metric event name matches `trackEvent` exactly, warehouse connection exists
  (Environment Settings → Experimentation).
