import { writeFileSync } from 'node:fs';

const SITE = 'https://phoneway.vercel.app';
const DEVICE_CLASSES = ['android', 'ios', 'desktop'];

async function fetchStats(deviceClass) {
  const res = await fetch(`${SITE}/api/stats?class=${encodeURIComponent(deviceClass)}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch stats for ${deviceClass}: ${res.status}`);
  }

  return res.json();
}

function formatPct(value, digits = 1) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(digits)}%`;
}

function buildRecommendations(statsByClass) {
  const items = [];

  for (const [deviceClass, stats] of Object.entries(statsByClass)) {
    if (!stats) continue;

    const label = deviceClass.toUpperCase();

    if (stats.source === 'default') {
      items.push(`- [ ] ${label}: live crowd stats unavailable, verify Vercel Blob sync for this class.`);
    }

    if (typeof stats.passRate === 'number' && stats.passRate < 0.6) {
      items.push(`- [ ] ${label}: pass rate is low at ${formatPct(stats.passRate * 100)}; review calibration prompts and reference-weight guidance.`);
    }

    if (typeof stats.meanError === 'number' && Math.abs(stats.meanError) > 10) {
      items.push(`- [ ] ${label}: mean error is ${stats.meanError.toFixed(2)}g; inspect calibration bias and surface guidance.`);
    }

    if ((stats.verifyCount || 0) < 10) {
      items.push(`- [ ] ${label}: only ${stats.verifyCount || 0} verifications recorded; encourage more verification runs before drawing conclusions.`);
    }

    const sensorErrors = stats.sensorErrors || {};
    const topSensor = Object.entries(sensorErrors).sort((a, b) => b[1] - a[1])[0];
    if (topSensor && topSensor[1] >= 5) {
      items.push(`- [ ] ${label}: ${topSensor[0]} is the most common sensor error source (${topSensor[1]} events); consider a targeted fallback or hint.`);
    }
  }

  if (items.length === 0) {
    items.push('- [ ] No high-priority issues detected in the current live stats snapshot.');
  }

  return items;
}

async function main() {
  const statsByClass = {};
  for (const cls of DEVICE_CLASSES) {
    try {
      statsByClass[cls] = await fetchStats(cls);
    } catch (error) {
      statsByClass[cls] = { source: 'error', error: String(error?.message || error) };
    }
  }

  const lines = [];
  lines.push('# Phoneway Scheduled Health Review');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Live Stats');
  lines.push('');

  for (const cls of DEVICE_CLASSES) {
    const stats = statsByClass[cls] || {};
    lines.push(`### ${cls.toUpperCase()}`);
    if (stats.error) {
      lines.push(`- Error: ${stats.error}`);
      lines.push('');
      continue;
    }
    lines.push(`- Source: ${stats.source || 'unknown'}`);
    lines.push(`- Verify count: ${stats.verifyCount || 0}`);
    lines.push(`- Calibrations: ${stats.calibrations || 0}`);
    lines.push(`- Mean error: ${typeof stats.meanError === 'number' ? `${stats.meanError.toFixed(2)}g` : 'n/a'}`);
    lines.push(`- Pass rate: ${formatPct((stats.passRate || 0) * 100)}`);
    lines.push('');
  }

  lines.push('## Action Items');
  lines.push('');
  lines.push(...buildRecommendations(statsByClass));
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This review is generated from the live production stats endpoint.');
  lines.push('- It is intended to guide maintenance work, not to auto-edit source code.');

  const report = `${lines.join('\n')}\n`;
  writeFileSync(process.env.REPORT_PATH || 'health-review.md', report);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
