// CLI + re-export of js/noiseBudget.js (the math lives there so the browser can load it).
// Usage: node scripts/noise-budget.mjs rest.json <sensitivityPerGram> [averagedReadings]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeBudget, analyzeLoadTest } from '../js/noiseBudget.js';

export { computeBudget, analyzeLoadTest };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , file, sens, avg] = process.argv;
  if (!file || !sens) {
    console.error('usage: node scripts/noise-budget.mjs rest.json <sensitivityPerGram> [averagedReadings]');
    process.exit(2);
  }
  console.log(JSON.stringify(computeBudget({
    restSamples: JSON.parse(readFileSync(file, 'utf8')),
    sensitivityPerGram: Number(sens),
    averagedReadings: avg ? Number(avg) : 1,
  }), null, 2));
}
