#!/usr/bin/env node
// Verifica desbordamiento horizontal de una ruta en 3 breakpoints con
// Playwright. Uso: node scripts/check-responsive.mjs /gestor-ambiental/dashboard
// Requiere el frontend corriendo (BASE_URL, default http://localhost:5174).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
// Opcional: para probar rutas protegidas por RutaProtegida sin pasar por
// /handoff. Mismas claves que auth.service.ts (gov_auth_token/gov_auth_user).
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const AUTH_USER_JSON = process.env.AUTH_USER_JSON;
const SCREENSHOTS_DIR = path.resolve(process.cwd(), '.screenshots');

const VIEWPORTS = [
  { name: '375x812', width: 375, height: 812 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
];

async function checkRoute(browser, route) {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  const safeName = route.replace(/[^a-zA-Z0-9]/g, '_') || 'root';
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    if (AUTH_TOKEN && AUTH_USER_JSON) {
      await page.addInitScript(
        ([token, userJson]) => {
          sessionStorage.setItem('gov_auth_token', token);
          sessionStorage.setItem('gov_auth_user', userJson);
        },
        [AUTH_TOKEN, AUTH_USER_JSON],
      );
    }
    const url = `${BASE_URL}${route}`;
    try {
      // 'networkidle' no dispara en vistas con mapas (tiles/polling
      // continuo) — 'load' + espera fija es mas confiable para esta app.
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1500);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      const overflowPx = scrollWidth - clientWidth;

      const screenshotPath = path.join(SCREENSHOTS_DIR, `${safeName}_${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({ route, viewport: vp.name, overflowPx, screenshotPath });

      if (overflowPx > 0) {
        console.log(`OVERFLOW ${route} @ ${vp.name}: ${overflowPx}px de sobrante (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`);
      } else {
        console.log(`OK       ${route} @ ${vp.name}: sin desbordamiento`);
      }
    } catch (err) {
      console.log(`ERROR    ${route} @ ${vp.name}: ${err.message}`);
      results.push({ route, viewport: vp.name, error: err.message });
    } finally {
      await context.close();
    }
  }
  return results;
}

async function main() {
  const routes = process.argv.slice(2);
  if (routes.length === 0) {
    console.error('Uso: node scripts/check-responsive.mjs <ruta> [<ruta> ...]');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const allResults = [];
  try {
    for (const route of routes) {
      const results = await checkRoute(browser, route);
      allResults.push(...results);
    }
  } finally {
    await browser.close();
  }

  const withOverflow = allResults.filter((r) => r.overflowPx > 0);
  const withErrors = allResults.filter((r) => r.error);
  console.log('');
  console.log(`Total: ${allResults.length} checks — ${withOverflow.length} con overflow, ${withErrors.length} con error.`);
  process.exit(withOverflow.length > 0 || withErrors.length > 0 ? 1 : 0);
}

main();
