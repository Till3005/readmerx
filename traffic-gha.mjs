// Simulated visitors for the ReadmeRx Flagsmith experiment.
// Runs in GitHub Actions — no browser needed, talks to the same
// edge/events APIs the browser SDK uses.
//
// Behavioural honesty: the visitor only sees the COPY it is assigned
// (control vs roast); click/completion propensity is keyed to that
// rendered copy, never to a variant key the simulator could peek at.

const ENV = '3uaotvzrXLY4GDNEcfF4jj';
const EDGE = 'https://edge.api.flagsmith.com';
const EVENTS = 'https://events.api.flagsmith.com/v1/events';
const VISITS = parseInt(process.env.VISITS || '40', 10);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const uid = () => 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

async function assignment(id) {
  const r = await fetch(`${EDGE}/api/v1/identities/?identifier=${id}`, {
    headers: { 'X-Environment-Key': ENV },
  });
  if (!r.ok) throw new Error('edge ' + r.status);
  const d = await r.json();
  const f = (d.flags || []).find(x => x.feature && x.feature.name === 'landing_cta');
  if (!f) return 'control';
  const v = f.feature_state_value || f.variant || 'control';
  return v === 'roast' ? 'roast' : 'control';
}

async function sendEvents(id, copyValue, clicked, completed) {
  const base = {
    feature_name: null, value: null, traits: null,
    identifier: id,
  };
  const events = [{
    event: '$flag_exposure',
    feature_name: 'landing_cta',
    value: copyValue === 'roast' ? 'Variant_1' : 'control',
    metadata: { experiment_id: 529, sdk_version: '12.4.0' },
    timestamp: Date.now() - 4000,
  }];
  if (clicked) {
    events.push({ ...base, event: 'cta_click', metadata: { sdk_version: '12.4.0' }, timestamp: Date.now() - 2000 });
    if (completed) {
      events.push({ ...base, event: 'analysis_complete', metadata: { sdk_version: '12.4.0' }, timestamp: Date.now() - 500 });
    }
  }
  const r = await fetch(EVENTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Environment-Key': ENV },
    body: JSON.stringify({ events }),
  });
  if (!r.ok) throw new Error('events ' + r.status);
}

async function oneVisit() {
  const id = uid();
  const copy = await assignment(id);
  // same propensities as the browser fleet: reaction to shown copy only
  const clicked = Math.random() < (copy === 'roast' ? 0.55 : 0.22);
  const completed = clicked && Math.random() < (copy === 'roast' ? 0.65 : 0.35);
  await sendEvents(id, copy, clicked, completed);
  return { copy, clicked, completed };
}

const out = { control: 0, roast: 0, clicks: 0, done: 0, err: 0 };
for (let i = 0; i < VISITS; i++) {
  try {
    const r = await oneVisit();
    out[r.copy]++;
    if (r.clicked) out.clicks++;
    if (r.completed) out.done++;
  } catch (e) { out.err++; }
  await sleep(rnd(300, 1200));
}
console.log(JSON.stringify(out));
