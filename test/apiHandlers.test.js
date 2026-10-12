import { describe, it, expect, vi, afterEach } from 'vitest';
import statsHandler from '../api/stats.js';
import errorsHandler from '../api/errors.js';
import telemetryHandler from '../api/telemetry.js';

/* These endpoints are Vercel edge functions: (Request) → Response.
   Tests exercise them directly in Node with fetch/Response globals,
   mocking globalThis.fetch for the Blob-store calls. */

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ERROR_VIEWER_KEY;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

function req(url, opts = {}) {
  return new Request(url, opts);
}

/* ── /api/stats ──────────────────────────────────────────── */

describe('api/stats', () => {
  it('OPTIONS → 204 with CORS', async () => {
    const res = await statsHandler(req('https://x/api/stats', { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('non-GET → 405', async () => {
    const res = await statsHandler(req('https://x/api/stats', { method: 'POST' }));
    expect(res.status).toBe(405);
  });

  it('blob unreachable → hardcoded defaults, source=default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const res = await statsHandler(req('https://x/api/stats?class=ios'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deviceClass).toBe('ios');
    expect(body.source).toBe('default');
    expect(body.meanError).toBe(11.2);
    expect(body.sensMap.excellent).toBe(220);
    expect(body.verifyCount).toBe(0);
  });

  it('blob live → merged values, source=live', async () => {
    const live = {
      verifyCount: 40, passCount: 34, calibrations: 12,
      sensMap: { excellent: 300 }, meanError: 6.1,
      sensorErrors: { accel: 3 },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(live), { status: 200 })
    ));
    const res = await statsHandler(req('https://x/api/stats?class=android'));
    const body = await res.json();
    expect(body.source).toBe('live');
    expect(body.passRate).toBeCloseTo(34 / 40, 5);
    expect(body.meanError).toBe(6.1);
  });

  it('unknown class sanitised → falls back to android defaults', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const res = await statsHandler(req('https://x/api/stats?class=iPHONE!!42'));
    const body = await res.json();
    expect(body.deviceClass).toBe('iphone'); // digits stripped by [^a-z] sanitiser
    expect(body.meanError).toBe(8.5);        // android defaults
  });

  it('class param with zero verifies → default passRate, not NaN', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ verifyCount: 0 }), { status: 200 })
    ));
    const res = await statsHandler(req('https://x/api/stats'));
    const body = await res.json();
    expect(Number.isFinite(body.passRate)).toBe(true);
    expect(body.passRate).toBe(0.71);
  });
});

/* ── /api/errors ─────────────────────────────────────────── */

describe('api/errors', () => {
  it('missing key → 401', async () => {
    process.env.ERROR_VIEWER_KEY = 'sekrit';
    const res = await errorsHandler(req('https://x/api/errors'));
    expect(res.status).toBe(401);
  });

  it('wrong key → 401', async () => {
    process.env.ERROR_VIEWER_KEY = 'sekrit';
    const res = await errorsHandler(req('https://x/api/errors?key=nope'));
    expect(res.status).toBe(401);
  });

  it('no secret configured at all → 401 (fail closed)', async () => {
    const res = await errorsHandler(req('https://x/api/errors?key=anything'));
    expect(res.status).toBe(401);
  });

  it('correct key + json=1 → JSON payload', async () => {
    process.env.ERROR_VIEWER_KEY = 'sekrit';
    const blob = {
      errors: [
        { msg: 'Sensor fail', src: 'simpleScale.js', line: 12, count: 3, browsers: { android: 3 } },
      ],
      total: 3,
      lastUpdated: Date.now(),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(blob), { status: 200 })
    ));
    const res = await errorsHandler(req('https://x/api/errors?key=sekrit&json=1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = await res.json();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].msg).toBe('Sensor fail');
  });

  it('OPTIONS → 204', async () => {
    process.env.ERROR_VIEWER_KEY = 'sekrit';
    const res = await errorsHandler(req('https://x/api/errors', { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
  });
});

/* ── /api/telemetry ──────────────────────────────────────── */

describe('api/telemetry', () => {
  it('OPTIONS → 204', async () => {
    const res = await telemetryHandler(req('https://x/api/telemetry', { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
  });

  it('GET → 405', async () => {
    const res = await telemetryHandler(req('https://x/api/telemetry', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('invalid JSON body → 400', async () => {
    const res = await telemetryHandler(req('https://x/api/telemetry', {
      method: 'POST',
      body: '{oops',
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(res.status).toBe(400);
  });

  it('empty events array → received, count 0', async () => {
    const res = await telemetryHandler(req('https://x/api/telemetry', {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
    }));
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.count).toBe(0);
  });

  it('events accepted without blob token (blobEnabled=false)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const events = [
      { type: 'verify', data: { errorPct: 3.2, grade: 'PASS', accuracyGrade: '±0.2g' } },
      { type: 'calibration', data: { surfaceQuality: 'good', sensitivity: 150 } },
      { type: 'sensor_error', data: { sensor: 'gyro' } },
    ];
    const res = await telemetryHandler(req('https://x/api/telemetry', {
      method: 'POST',
      body: JSON.stringify({ events, deviceClass: 'Android' }),
    }));
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.count).toBe(3);
    expect(body.blobEnabled).toBe(false);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('phoneway_telemetry'));
    logSpy.mockRestore();
  });

  it('batches > 50 events are capped', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const events = Array.from({ length: 80 }, (_, i) => ({ type: 'verify', data: { errorPct: i } }));
    const res = await telemetryHandler(req('https://x/api/telemetry', {
      method: 'POST',
      body: JSON.stringify({ events }),
    }));
    const body = await res.json();
    expect(body.count).toBe(50);
    logSpy.mockRestore();
  });

  it('deviceClass is lowercased and sanitised', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await telemetryHandler(req('https://x/api/telemetry', {
      method: 'POST',
      body: JSON.stringify({ events: [{ type: 'verify' }], deviceClass: 'IOS!!' }),
    }));
    const logged = JSON.parse(logSpy.mock.calls[0][0]);
    expect(logged.deviceClass).toBe('ios');
    logSpy.mockRestore();
  });
});
