#!/usr/bin/env node
// Dev orchestrator: ensures infra is up, then runs the four apps native with hot reload.
// Usage: node tools/dev.mjs [api|staff|kds|order ...]   (no args = all)
import { spawn } from 'node:child_process';

const APPS = {
  api: { cwd: 'apps/api', cmd: 'pnpm', args: ['dev'], color: '\x1b[36m' },
  staff: { cwd: 'apps/web-staff', cmd: 'pnpm', args: ['dev'], color: '\x1b[32m' },
  kds: { cwd: 'apps/web-kds', cmd: 'pnpm', args: ['dev'], color: '\x1b[33m' },
  order: { cwd: 'apps/web-order', cmd: 'pnpm', args: ['dev'], color: '\x1b[35m' },
};

const RESET = '\x1b[0m';
const selected = process.argv.slice(2).filter((a) => a in APPS);
const toRun = selected.length ? selected : Object.keys(APPS);

console.log('▶ Ensuring dev infra (postgres + redis) is up…');
const up = spawn('docker', ['compose', '-f', 'docker-compose.dev.yml', 'up', '-d'], {
  stdio: 'inherit',
  shell: true,
});

up.on('exit', () => {
  for (const name of toRun) {
    const { cwd, cmd, args, color } = APPS[name];
    const child = spawn(cmd, args, { cwd, shell: true });
    const tag = `${color}[${name}]${RESET} `;
    child.stdout.on('data', (d) => process.stdout.write(prefix(tag, d)));
    child.stderr.on('data', (d) => process.stderr.write(prefix(tag, d)));
    child.on('exit', (code) => console.log(`${tag}exited (${code})`));
  }
});

function prefix(tag, buf) {
  return buf
    .toString()
    .split('\n')
    .map((l) => (l ? tag + l : l))
    .join('\n');
}
