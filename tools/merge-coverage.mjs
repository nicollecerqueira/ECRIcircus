#!/usr/bin/env node
// Merge backend V8 + frontend Istanbul coverage into one coverage/lcov.info for Sonar.
// Placeholder: concatenates any per-app lcov files found. Wire real remapping when
// the apps emit coverage (backend phase).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const sources = [
  'apps/api/coverage/lcov.info',
  'apps/web-staff/coverage/lcov.info',
  'apps/web-kds/coverage/lcov.info',
  'apps/web-order/coverage/lcov.info',
];

mkdirSync('coverage', { recursive: true });
const merged = sources
  .filter((p) => existsSync(p))
  .map((p) => readFileSync(p, 'utf8'))
  .join('\n');

writeFileSync('coverage/lcov.info', merged);
console.log(`Merged ${sources.filter(existsSync).length} lcov file(s) → coverage/lcov.info`);
