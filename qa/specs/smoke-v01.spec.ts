import { test, expect } from '../fixtures/collector';
import { openEmptyProject } from '../fixtures/helpers';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// v0.1 smoke suite (lean launch scope). Runs in Chromium, Firefox and WebKit at 1440x900.
// Covers: import, export round-trip, single-group dirty state, console, XSS, storage/boot,
// file:// load, and internal link check.

const REPO = path.resolve(__dirname, '..', '..');
const EVIL = '<img src=x onerror=alert(1)>';

// Folder with nested files, more than 100 files in one directory, and ignored folders.
function makeFolder(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owlet-smoke-'));
  const project = path.join(root, 'site');
  fs.mkdirSync(path.join(project, 'assets', 'images'), { recursive: true });
  fs.mkdirSync(path.join(project, 'src', 'flat'), { recursive: true });
  for (let i = 0; i < 120; i++) fs.writeFileSync(path.join(project, 'src', 'flat', 'item-' + i + '.txt'), 'item ' + i + '\n');
  fs.writeFileSync(path.join(project, 'assets', 'images', 'note2.txt'), 'nested note\n');
  fs.writeFileSync(path.join(project, 'index.html'),
    '<!DOCTYPE html><html><head><link rel="stylesheet" href="style.css"></head>' +
    '<body><h1>Smoke page</h1><script src="script.js"></script></body></html>\n');
  fs.writeFileSync(path.join(project, 'style.css'), 'h1 { color: rgb(255, 0, 0); }\n');
  fs.writeFileSync(path.join(project, 'script.js'), "console.log('owlet-smoke-log');\n");
  fs.mkdirSync(path.join(project, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(project, 'node_modules', 'pkg', 'index.js'), 'module.exports = 1;\n');
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  fs.writeFileSync(path.join(project, '.git', 'config'), '[core]\n');
  return project;
}

async function listFiles(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => (window as any).Owlet.state.listFiles());
}

async function loadProject(page: import('@playwright/test').Page, files: Record<string, string>, name: string, open: string) {
  await page.evaluate(([f, n, o]: [Record<string, string>, string, string]) => {
    const s = (window as any).Owlet.state;
    s.loadFiles(f, n);
    s.openFile(o);
    (window as any).Owlet.preview.update();
  }, [files, name, open] as [Record<string, string>, string, string]);
}

test.describe('v0.1 smoke @smoke', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a. folder import keeps structure, ignores .git/node_modules, opens entry, preview is styled', async ({ page, collector }) => {
    await openEmptyProject(page);
    await page.locator('input[webkitdirectory]').setInputFiles(makeFolder());
    // The 'Open dropped files' choice appears only in some runs; answer it when it does.
    const chooseNew = page.getByRole('button', { name: 'Open as new project' });
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && (await listFiles(page)).length < 124) {
      if (await chooseNew.isVisible().catch(() => false)) await chooseNew.click();
      await page.waitForTimeout(300);
    }
    expect((await listFiles(page)).length).toBeGreaterThanOrEqual(124);
    const files = await listFiles(page);
    expect(files).toContain('src/flat/item-119.txt');
    expect(files).toContain('assets/images/note2.txt');
    expect(files.some((p) => p.indexOf('node_modules/') !== -1 || p.indexOf('.git/') !== -1)).toBe(false);
    expect(await page.evaluate(() => (window as any).Owlet.state.activeFile)).toBe('index.html');
    await expect(page.getByTestId('preview').contentFrame().locator('h1')).toHaveCSS('color', 'rgb(255, 0, 0)');
    expect(collector.findings.filter((f) => f.kind === 'console-error')).toEqual([]);
  });

  test('b. export ZIP round-trip matches project contents', async ({ page }) => {
    await openEmptyProject(page);
    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.evaluate(() => (window as any).Owlet.storage.exportZip());
    const download = await downloadPromise;
    const savePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'owlet-zipout-')), download.suggestedFilename());
    await download.saveAs(savePath);
    const b64 = fs.readFileSync(savePath).toString('base64');
    const exported = await page.evaluate(async (data: string) => {
      const bin = atob(data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const zip = await (window as any).JSZip.loadAsync(bytes);
      const out: Record<string, string> = {};
      for (const n of Object.keys(zip.files)) if (!zip.files[n].dir) out[n] = await zip.files[n].async('string');
      return out;
    }, b64);
    const state = await page.evaluate(() => (window as any).Owlet.state.files);
    expect(Object.keys(state).length).toBeGreaterThan(0);
    for (const name of Object.keys(state)) expect(exported[name], 'exported ' + name).toBe(state[name]);
  });

  test('c. one save clears the dirty dot on the open tab (single editor group)', async ({ page }) => {
    await openEmptyProject(page);
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.press('End');
    await page.keyboard.type('x');
    await expect(page.locator('[data-testid="tab"].active .dirty-dot')).toBeVisible();
    await page.keyboard.press('Control+s');
    await expect(page.locator('[data-testid="tab"].active .dirty-dot')).toHaveCount(0);
  });

  test('d. console: log and error appear once with file:line; double-click opens details; Esc returns focus', async ({ page }) => {
    await openEmptyProject(page);
    await loadProject(page, {
      'index.html': '<!DOCTYPE html><html><body><h1>Console</h1><script src="script.js"></script></body></html>\n',
      'script.js': "console.log('owlet-smoke-log');\nthrow new Error('owlet-smoke-boom');\n",
    }, 'console-smoke', 'index.html');
    // One user-style Refresh = one fresh run; the console is cleared at the start of it.
    await page.waitForTimeout(1000);
    await page.locator('#btn-refresh-preview').click();
    await page.waitForTimeout(1500);
    await expect.poll(async () => page.locator('#console-output .console-line', { hasText: 'owlet-smoke-log' }).count(), { timeout: 15_000 }).toBe(1);
    await expect.poll(async () => page.locator('#console-output .console-line', { hasText: 'owlet-smoke-boom' }).count(), { timeout: 15_000 }).toBe(1);
    const errorRow = page.locator('#console-output .console-line.error', { hasText: 'owlet-smoke-boom' });
    await expect(errorRow).toContainText('script.js:2');
    await errorRow.dblclick();
    await expect(page.locator('#error-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#error-dialog')).toBeHidden();
    await expect(errorRow).toBeFocused();
  });

  test('e. XSS: hostile project name, file name and console text render as text; no dialog fires', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
    await openEmptyProject(page);
    await loadProject(page, {
      'index.html': '<!DOCTYPE html><html><body><h1>XSS</h1><script src="script.js"></script></body></html>\n',
      'script.js': "console.log('" + EVIL + "');\n",
      [EVIL + '.txt']: 'hostile name\n',
    }, EVIL, 'index.html');
    await expect.poll(async () => page.locator('#console-output', { hasText: EVIL }).count(), { timeout: 15_000 }).toBeGreaterThan(0);
    const rail = page.locator('button.rail-btn[data-view="explorer"]');
    if ((await rail.getAttribute('aria-pressed')) !== 'true') await rail.click();
    await expect(page.getByTestId('tree-item').filter({ hasText: EVIL }).first()).toBeVisible({ timeout: 15_000 });
    expect(await page.locator('img[src="x"]').count(), 'injected img in app DOM').toBe(0);
    expect(await page.locator('#status-text').textContent()).not.toContain('<img');
    expect(dialogs, 'dialog events').toEqual([]);
  });

  test('f. storage blocked and corrupted session: app still boots', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('owlet:lastProject', '{not json');
      localStorage.setItem('owlet:project:broken', '%%%');
    });
    await page.goto('/playground/');
    await expect(page.locator('#topbar')).toBeVisible();
    await expect(page.getByTestId('status-bar')).toBeVisible();
    await expect(page.getByTestId('welcome')).toBeVisible();

    const blocked = await page.context().newPage();
    await blocked.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    const errors: string[] = [];
    blocked.on('pageerror', (e) => errors.push(e.message));
    await blocked.goto('/playground/');
    await expect(blocked.locator('#topbar')).toBeVisible();
    await expect(blocked.getByTestId('status-bar')).toBeVisible();
    expect(errors, 'uncaught errors with storage blocked').toEqual([]);
    await blocked.close();
  });

  test('g. file:// open loads with zero Owlet console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto('file:///' + path.join(REPO, 'site', 'playground', 'index.html').replace(/\\/g, '/'));
    await expect(page.locator('#topbar')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    expect(errors, 'console/page errors on file://').toEqual([]);
  });

  test('h. internal links resolve in README, landing and docs (repo files only)', async () => {
    const broken: string[] = [];
    const check = (fromFile: string, target: string) => {
      const clean = target.split('#')[0].split('?')[0];
      if (!clean || /^(https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(clean)) return;
      const abs = path.resolve(path.dirname(fromFile), decodeURIComponent(clean));
      // GitHub-relative links (e.g. ../../pulls) leave the repo; they are not repo files and are not checked here.
      if (abs.indexOf(REPO) !== 0) return;
      if (!fs.existsSync(abs)) broken.push(path.relative(REPO, fromFile) + ' -> ' + target);
    };
    const readme = fs.readFileSync(path.join(REPO, 'README.md'), 'utf8');
    for (const m of readme.matchAll(/\]\(([^)\s]+)\)/g)) check(path.join(REPO, 'README.md'), m[1]);
    for (const m of readme.matchAll(/(?:src|href)="([^"]+)"/g)) check(path.join(REPO, 'README.md'), m[1]);
    for (const page of ['site/index.html', 'site/docs/index.html', 'site/roadmap/index.html', 'site/playground/index.html']) {
      const full = path.join(REPO, page);
      const html = fs.readFileSync(full, 'utf8');
      for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) check(full, m[1]);
    }
    expect(broken, 'broken internal links').toEqual([]);
  });
});
