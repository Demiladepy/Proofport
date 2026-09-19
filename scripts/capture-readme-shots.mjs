/**
 * Regenerates docs/screenshots for the README.
 *
 *   npm install --no-save playwright
 *   npm run dev          # in another terminal
 *   node scripts/capture-readme-shots.mjs
 *
 * Uses the Chrome already installed on the machine (channel: "chrome").
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs", "screenshots");
mkdirSync(out, { recursive: true });

const BASE = process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000";

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
});

async function hideChrome(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-next-mark-loading],
      [data-nextjs-dev-overlay],
      [data-nextjs-toast],
      #__next-build-watcher {
        display: none !important;
      }
    `,
  });
}

async function shot(name, url, { width, height, wait, fullPage }) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
  await hideChrome(page);
  if (wait) await wait(page);
  await hideChrome(page);
  await delay(400);
  await page.screenshot({
    path: join(out, name),
    fullPage: Boolean(fullPage),
    animations: "disabled",
  });
  await page.close();
  console.log("wrote", name);
}

try {
  await shot("01-hero.png", `${BASE}/`, {
    width: 1440,
    height: 1100,
    fullPage: false,
  });

  await shot("02-agents.png", `${BASE}/`, {
    width: 1440,
    height: 900,
    fullPage: false,
    wait: async (page) => {
      const el = page.locator("#agents");
      await el.waitFor();
      await el.scrollIntoViewIfNeeded();
      await delay(350);
    },
  });

  await shot("03-proof-wall.png", `${BASE}/proof`, {
    width: 1280,
    height: 1600,
    fullPage: true,
    wait: async (page) => {
      await page.waitForSelector(".pw-verdict[data-phase='pass']", {
        timeout: 40_000,
      });
      await page.waitForFunction(
        () =>
          document.querySelectorAll(".pw-verdict[data-phase='pass']").length >=
          4,
        null,
        { timeout: 40_000 },
      );
      await delay(600);
    },
  });

  await shot(
    "04-lender.png",
    `${BASE}/lender?subject=0xd8b592c16915cd905fc500b049e293031a7d55b8b0df1af489a6844f5f86b648`,
    {
      width: 1280,
      height: 980,
      fullPage: true,
      wait: async (page) => {
        await delay(2500);
      },
    },
  );

  await shot("05-demo.png", `${BASE}/`, {
    width: 1440,
    height: 1100,
    fullPage: false,
    wait: async (page) => {
      await page.evaluate(() => {
        const el = document.getElementById("demo");
        if (!el) return;
        const y = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo(0, y);
      });
      await delay(400);
    },
  });
} finally {
  await browser.close();
}

console.log("done");
