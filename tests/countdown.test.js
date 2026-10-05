import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { LAUNCH_MS, getCountdown, formatZagreb, formatDeadline } from '../js/countdown.js';

test('launch instant is 23:00 UTC on 4 Nov 2026', () => {
  assert.equal(new Date(LAUNCH_MS).toISOString(), '2026-11-04T23:00:00.000Z');
});

test('counts down in days, hours, minutes and seconds', () => {
  const now = LAUNCH_MS - (26 * 3600 + 3 * 60 + 4) * 1000; // 1d 2h 3m 4s before
  assert.deepEqual(getCountdown(now), { live: false, days: 1, hours: 2, minutes: 3, seconds: 4 });
});

test('a partial second rounds up so it never reads zero before launch', () => {
  assert.deepEqual(getCountdown(LAUNCH_MS - 500), { live: false, days: 0, hours: 0, minutes: 0, seconds: 1 });
});

test('is live at the launch instant', () => {
  assert.deepEqual(getCountdown(LAUNCH_MS), { live: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('counts elapsed time after launch', () => {
  const now = LAUNCH_MS + (2 * 86400 + 5 * 3600 + 6 * 60 + 7) * 1000 + 900;
  assert.deepEqual(getCountdown(now), { live: true, days: 2, hours: 5, minutes: 6, seconds: 7 });
});

test('Zagreb label for the launch is midnight on Thursday 5 Nov', () => {
  assert.equal(formatZagreb(LAUNCH_MS), 'Thu 5 Nov 2026, 00:00 Zagreb time');
});

test('Zagreb label uses summer time before 25 Oct', () => {
  assert.equal(formatZagreb(Date.parse('2026-10-20T10:30:00Z')), 'Tue 20 Oct 2026, 12:30 Zagreb time');
});

test('formatDeadline formats an ISO string with an offset', () => {
  assert.equal(formatDeadline('2026-10-27T00:00:00+01:00'), 'Tue 27 Oct 2026, 00:00 Zagreb time');
});

test('the label does not depend on the viewer timezone', () => {
  const code =
    "import { formatZagreb, LAUNCH_MS } from './js/countdown.js'; process.stdout.write(formatZagreb(LAUNCH_MS));";
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, TZ: 'Pacific/Auckland' },
    encoding: 'utf8',
  });
  assert.equal(out, 'Thu 5 Nov 2026, 00:00 Zagreb time');
});
