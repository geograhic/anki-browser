/**
 * i18n parity gate.
 *
 * The whole point of keeping EN and ZH in one shared dictionary is that the two
 * sites can never drift. This script makes that a build failure rather than a
 * hope: it runs before `vite build` and fails on any missing key, any extra key,
 * or any list whose length differs between languages.
 */
import { checkParity, checkArrayLengths, LANGS } from '../src/content/i18n.mjs';

const { missing, extra, flat } = checkParity();
const lengthProblems = checkArrayLengths();

const total = Object.keys(flat.en ?? {}).length;
console.log(`i18n: ${total} keys × ${LANGS.length} languages`);

let failed = false;

if (missing.length) {
  failed = true;
  console.error(`\n✖ zh is missing ${missing.length} key(s):`);
  for (const k of missing) console.error(`    - ${k}`);
}

if (extra.length) {
  failed = true;
  console.error(`\n✖ zh has ${extra.length} key(s) that en does not define:`);
  for (const k of extra) console.error(`    - ${k}`);
}

if (lengthProblems.length) {
  failed = true;
  console.error(`\n✖ list lengths differ between en and zh:`);
  for (const p of lengthProblems) console.error(`    - ${p}`);
}

if (failed) {
  console.error('\ni18n parity check FAILED — the two language versions would drift.');
  process.exit(1);
}

console.log('i18n parity OK.');
