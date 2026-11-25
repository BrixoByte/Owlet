import { test as base, expect, type ConsoleMessage, type Page, type Request } from '@playwright/test';

// Hosts the app is allowed to load from (CDN libs + Google fonts used by the
// landing/app). Anything else is reported as an UNEXPECTED external request.
export const ALLOWED_HOSTS = [
  '127.0.0.1', 'localhost',
  'cdnjs.cloudflare.com', 'cdn.jsdelivr.net',
  'fonts.googleapis.com', 'fonts.gstatic.com',
];

export type Finding = {
  kind: 'console-error' | 'console-warning' | 'pageerror' | 'requestfailed' | 'http-error' | 'unexpected-external-request';
  detail: string;
};

export type Collector = { findings: Finding[] };

// Attaches listeners before the test body runs and attaches the findings to the
// test report. Findings do not fail the test by themselves (brief rule 6); the
// test asserts outcomes and the QA summary counts findings.
export const test = base.extend<{ collector: Collector }>({
  collector: async ({ page, baseURL }, use, testInfo) => {
    const findings: Finding[] = [];
    const appHost = new URL(baseURL ?? 'http://127.0.0.1').host;

    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') findings.push({ kind: 'console-error', detail: msg.text() + ' @ ' + (msg.location().url || '') });
      if (msg.type() === 'warning') findings.push({ kind: 'console-warning', detail: msg.text() });
    });
    page.on('pageerror', (err) => {
      const frame = (err.stack || '').split('\n').find((l) => l.includes('/') || l.includes('\\')) || '';
      findings.push({ kind: 'pageerror', detail: err.message + (frame ? ' @ ' + frame.trim() : '') });
    });
    page.on('requestfailed', (req: Request) => findings.push({ kind: 'requestfailed', detail: req.method() + ' ' + req.url() + ' ' + (req.failure()?.errorText ?? '') }));
    page.on('response', (res) => {
      if (res.status() >= 400) findings.push({ kind: 'http-error', detail: res.status() + ' ' + res.url() });
    });
    page.on('request', (req) => {
      const host = new URL(req.url()).host;
      if (req.url().startsWith('file:') || req.url().startsWith('data:') || req.url().startsWith('blob:')) return;
      if (host !== appHost && !ALLOWED_HOSTS.includes(host.split(':')[0])) {
        findings.push({ kind: 'unexpected-external-request', detail: req.method() + ' ' + req.url() });
      }
    });

    await use({ findings });

    await testInfo.attach('collector-findings.json', {
      body: JSON.stringify(findings, null, 2),
      contentType: 'application/json',
    });
    for (const f of findings) {
      testInfo.annotations.push({ type: 'qa-finding', description: `${f.kind}: ${f.detail}`.slice(0, 500) });
    }
  },
});

export { expect };
export type { Page };
