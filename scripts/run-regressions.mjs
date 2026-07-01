import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const regressionScripts = [
  'regression-replacement-limit.mjs',
  'regression-dom-translation-policy.mjs',
  'regression-processing-state.mjs',
  'regression-dynamic-dom-budget.mjs',
  'regression-replacement-planner.mjs',
  'regression-range-replacement-writer.mjs',
];

const viteNodeBin = join('node_modules', 'vite-node', 'vite-node.mjs');

if (!existsSync(viteNodeBin)) {
  console.error(`Cannot find ${viteNodeBin}. Run npm install first.`);
  process.exit(1);
}

for (const script of regressionScripts) {
  const result = spawnSync(process.execPath, [viteNodeBin, `scripts/${script}`], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`regression suite passed: ${regressionScripts.length} scripts`);
