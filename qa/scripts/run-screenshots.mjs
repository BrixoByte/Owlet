// run-screenshots.mjs — regenerate the README screenshot and the landing og-image.
// Sets SCREENSHOTS=1 (the spec is skipped otherwise) and runs Chromium only,
// so the output is the same on every machine that has the Chromium build.
//
// Run:  npm run screenshots

import { spawn } from 'node:child_process';

const child = spawn('npx', ['playwright', 'test', 'specs/screenshots.spec.ts', '--project=chromium', '--retries=0', '--workers=1'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, SCREENSHOTS: '1' },
});
child.on('exit', (code) => process.exit(code ?? 1));
