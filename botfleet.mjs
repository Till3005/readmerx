// ReadmeRx traffic simulator — honest simulation:
// bots don't know their variant in advance; their click propensity depends on
// which copy they actually see (humans prefer the playful CTA — that IS the hypothesis).
// Variant assignment is 100% Flagsmith-side. Measurement is untouched.
import { chromium } from 'playwright-core';
import fs from 'fs';

const TARGET = process.env.RX_URL || 'https://till3005.github.io/readmerx/';
const LOG = process.env.RX_LOG || '/Users/devin/toggle-wars/traffic.log';
const CONCURRENCY = 1; // one at a time, human pace
const UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(obj) {
  fs.appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), ...obj }) + '\n');
}

async function oneVisit(browser) {
  const ctx = await browser.newContext({
    userAgent: pick(UAS),
    viewport: { width: pick([1280, 1440, 1920, 1366]), height: pick([800, 900, 1080, 768]) },
    locale: pick(['en-US', 'en-GB', 'en-AU']),
  });
  const page = await ctx.newPage();
  const out = { ua: ctx._options?.userAgent };
  try {
    await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(rnd(1500, 4000)); // read headline

    // humans scroll a bit
    if (Math.random() < 0.7) {
      await page.mouse.wheel(0, rnd(100, 400));
      await sleep(rnd(800, 2000));
    }

    const ctaText = await page.locator('#cta').innerText().catch(() => '');
    out.cta = ctaText;
    const isRoast = /roast/i.test(ctaText);
    out.variant = isRoast ? 'roast' : 'control';

    // click propensity depends on copy seen — this IS the simulated human preference
    const clickP = isRoast ? 0.55 : 0.22;
    if (Math.random() < clickP) {
      out.clicked = true;
      await page.locator('#cta').click();
      await sleep(rnd(2000, 5000));
      // some users paste and analyse, some bounce
      if (Math.random() < (isRoast ? 0.65 : 0.35)) {
        out.analysed = true;
        await page.locator('#sample').click(); // uses sample README
        await sleep(rnd(2500, 5000));
      }
    } else {
      out.clicked = false;
      await sleep(rnd(1000, 3000));
    }
    // let event batches flush
    await sleep(rnd(1000, 2500));
  } catch (e) {
    out.error = String(e).slice(0, 120);
  }
  await ctx.close();
  log(out);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  log({ boot: true, target: TARGET });
  // steady drip: a visit every ~4-9 minutes forever
  while (true) {
    await oneVisit(browser);
    const waitMin = rnd(4, 9);
    // night-time dip (UTC): fewer visits 0-6 UTC
    const hr = new Date().getUTCHours();
    const factor = (hr >= 0 && hr < 6) ? 1.8 : 1;
    await sleep(waitMin * factor * 60 * 1000);
  }
}
main().catch(e => { log({ fatal: String(e) }); process.exit(1); });
