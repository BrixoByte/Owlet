import { test, expect } from '../fixtures/collector';
import { openEmptyProject } from '../fixtures/helpers';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Group 1: folder import (webkitdirectory input), ignore list, ZIP import, cancel, export.
// Real files are written to a temp folder and passed to the real hidden picker inputs.

// letters-only names avoid QA-017 (digits in path segments are rejected) where a test needs that isolation
function word(n: number, digits: boolean): string {
  if (digits) return String(n);
  let s = '';
  let x = n;
  do { s = 'abcdefghijklmnopqrstuvwxyz'[x % 26] + s; x = Math.floor(x / 26); } while (x > 0);
  return s;
}

function makeFolder(count: number, digits = true): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owlet-import-'));
  const project = path.join(root, 'sample-project');
  for (let i = 0; i < count; i++) {
    const dir = path.join(project, 'src', 'part-' + word(i % 10, digits), 'deep-' + word(i % 4, digits));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'file-' + word(i, digits) + '.txt'), 'content ' + i + '\n');
  }
  fs.mkdirSync(path.join(project, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(project, 'node_modules', 'pkg', 'index.js'), 'module.exports = 1;\n');
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  fs.writeFileSync(path.join(project, '.git', 'config'), '[core]\n');
  fs.writeFileSync(path.join(project, '.DS_Store'), 'x');
  fs.writeFileSync(path.join(project, 'index.html'), '<!DOCTYPE html><html><body><h1>Imported</h1></body></html>\n');
  return project;
}

// A starter project already has files, so committing an import asks what to do.
// These tests choose 'Open as new project'.
async function chooseOpenAsNew(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Open as new project' }).click({ timeout: 15_000 });
}

async function listFiles(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => (window as any).Owlet.state.listFiles());
}

test.describe('group 1: folder and file import @import', () => {
  test('150-file folder imports through the folder picker; ignored folders are skipped', async ({ page, collector }) => {
    await openEmptyProject(page);
    const folder = makeFolder(150);
    await page.locator('input[webkitdirectory]').setInputFiles(folder);
    await chooseOpenAsNew(page);
    await expect.poll(async () => (await listFiles(page)).filter((p) => p.indexOf('src/') === 0).length, { timeout: 30_000 }).toBe(150);
    const files = await listFiles(page);
    expect(files.some((p) => p.indexOf('node_modules/') !== -1), 'node_modules imported').toBe(false);
    expect(files.some((p) => p.indexOf('.git/') !== -1), '.git imported').toBe(false);
    expect(files.some((p) => p.endsWith('.DS_Store')), '.DS_Store imported').toBe(false);
    expect(files.some((p) => p === 'index.html')).toBe(true);
    expect(collector.findings.filter((f) => f.kind === 'console-error')).toEqual([]);
  });

  test('imported text content matches the source file byte for byte', async ({ page }) => {
    await openEmptyProject(page);
    const folder = makeFolder(20);
    await page.locator('input[webkitdirectory]').setInputFiles(folder);
    await chooseOpenAsNew(page);
    await expect.poll(async () => (await listFiles(page)).length, { timeout: 30_000 }).toBeGreaterThan(20);
    const sample = await page.evaluate(() => (window as any).Owlet.state.getFile('src/part-3/deep-3/file-3.txt'));
    expect(sample).toBe('content 3\n');
  });

  test('a ZIP file is imported through the importer and its files open in the project', async ({ page }) => {
    await openEmptyProject(page);
    const hasJsZip = await page.evaluate(() => typeof (window as any).JSZip !== 'undefined');
    test.skip(!hasJsZip, 'JSZip not loaded (CDN unavailable in this run)');
    const zipB64 = await page.evaluate(async () => {
      const zip = new (window as any).JSZip();
      zip.file('zipped/hello.txt', 'from zip\n');
      zip.file('zipped/page.html', '<h1>zip page</h1>\n');
      const bytes = await zip.generateAsync({ type: 'uint8array' });
      let bin = '';
      bytes.forEach((b: number) => { bin += String.fromCharCode(b); });
      return btoa(bin);
    });
    const zipPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'owlet-zip-')), 'sample.zip');
    fs.writeFileSync(zipPath, Buffer.from(zipB64, 'base64'));
    await page.locator('input[type=file]:not([webkitdirectory])').first().setInputFiles(zipPath);
    await chooseOpenAsNew(page);
    await expect.poll(async () => (await listFiles(page)).some((p) => p.endsWith('hello.txt')), { timeout: 30_000 }).toBe(true);
    const text = await page.evaluate(() => (window as any).Owlet.state.getFile((window as any).Owlet.state.listFiles().find((p: string) => p.endsWith('hello.txt'))));
    expect(text).toBe('from zip\n');
  });

  test('cancel during a large import stops it and keeps the project unchanged', async ({ page }) => {
    await openEmptyProject(page);
    const before = (await listFiles(page)).length;
    const folder = makeFolder(1500, false);
    await page.locator('input[webkitdirectory]').setInputFiles(folder);
    const cancel = page.locator('.toast-action', { hasText: 'Cancel' });
    await expect(cancel).toBeVisible({ timeout: 15_000 });
    await cancel.click();
    await expect(page.locator('.toast', { hasText: 'Import cancelled' })).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    expect((await listFiles(page)).length, 'files after cancel').toBe(before);
  });

  test('exported ZIP contains every project file with identical content', async ({ page }) => {
    await openEmptyProject(page);
    const hasJsZip = await page.evaluate(() => typeof (window as any).JSZip !== 'undefined');
    test.skip(!hasJsZip, 'JSZip not loaded (CDN unavailable in this run)');
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await page.evaluate(() => (window as any).Owlet.storage.exportZip());
    const download = await downloadPromise;
    const savePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'owlet-export-')), download.suggestedFilename());
    await download.saveAs(savePath);
    const b64 = fs.readFileSync(savePath).toString('base64');
    const result = await page.evaluate(async (data: string) => {
      const bin = atob(data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const zip = await (window as any).JSZip.loadAsync(bytes);
      const out: Record<string, string> = {};
      const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
      for (const n of names) out[n] = await zip.files[n].async('string');
      return out;
    }, b64);
    const state = await page.evaluate(() => (window as any).Owlet.state.files);
    for (const name of Object.keys(state)) {
      expect(result[name], 'exported ' + name).toBe(state[name]);
    }
  });
});
