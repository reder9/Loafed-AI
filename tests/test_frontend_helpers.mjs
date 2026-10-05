import { test } from 'node:test';
import assert from 'node:assert/strict';

// Reference implementation of escapeHtml matching static/loaf.js & static/leaderboard.js
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Reference implementation of getLoafIdFromUrl matching static/loaf.js
function getLoafIdFromUrl(pathname, search) {
  const urlParams = new URLSearchParams(search);
  const idFromParam = urlParams.get('id');
  if (idFromParam) {
    return idFromParam.trim();
  }

  // Check path segments e.g. /loaf/entry_123 or /loaf/hof_buttercup
  const match = pathname.match(/\/loaf\/([a-zA-Z0-9_\-]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

test('Frontend Helper - escapeHtml', () => {
  assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml("Mochi & Sesame's Loaf"), 'Mochi &amp; Sesame&#039;s Loaf');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('Frontend Helper - getLoafIdFromUrl query param', () => {
  assert.equal(getLoafIdFromUrl('/loaf', '?id=hof_buttercup'), 'hof_buttercup');
  assert.equal(getLoafIdFromUrl('/loaf.html', '?id=loaf_xyz_123&ref=share'), 'loaf_xyz_123');
});

test('Frontend Helper - getLoafIdFromUrl path segment', () => {
  assert.equal(getLoafIdFromUrl('/loaf/hof_flash', ''), 'hof_flash');
  assert.equal(getLoafIdFromUrl('/loaf/loaf_user_999', ''), 'loaf_user_999');
  assert.equal(getLoafIdFromUrl('/leaderboard', ''), null);
});

test('Frontend Helper - Grade Token Expiration Validation', () => {
  // Fresh token (created now)
  const freshPayload = { cat_name: 'Mochi', ts: Math.floor(Date.now() / 1000) };
  const freshB64 = Buffer.from(JSON.stringify(freshPayload)).toString('base64url');
  const freshToken = `${freshB64}.mock_hmac_signature`;

  const parsedFresh = JSON.parse(Buffer.from(freshToken.split('.')[0], 'base64url').toString('utf8'));
  const ageSecondsFresh = (Date.now() / 1000) - parsedFresh.ts;
  assert.equal(ageSecondsFresh < 86400, true);

  // Expired token (created 25 hours ago)
  const expiredPayload = { cat_name: 'Mochi', ts: Math.floor(Date.now() / 1000) - (25 * 3600) };
  const expiredB64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
  const expiredToken = `${expiredB64}.mock_hmac_signature`;

  const parsedExpired = JSON.parse(Buffer.from(expiredToken.split('.')[0], 'base64url').toString('utf8'));
  const ageSecondsExpired = (Date.now() / 1000) - parsedExpired.ts;
  assert.equal(ageSecondsExpired > 86400, true);
});

test('Frontend Helper - Safe Perspective Angle Extraction', () => {
  function parseAngleMeta(angleItem, idx) {
    let angleText = '';
    let customLabel = '';

    if (typeof angleItem === 'string') {
      angleText = angleItem;
      customLabel = angleItem;
    } else if (angleItem && typeof angleItem === 'object') {
      angleText = `${angleItem.angle || ''} ${angleItem.label || ''} ${angleItem.name || ''}`;
      customLabel = angleItem.label || angleItem.name || angleItem.angle || '';
    }

    const rawAngle = angleText.toLowerCase();
    let label = customLabel || `Angle ${idx + 1}`;
    let icon = 'camera';
    if (rawAngle.includes('front') || rawAngle.includes('elevation')) {
      label = customLabel || 'Front View';
      icon = 'eye';
    } else if (rawAngle.includes('side') || rawAngle.includes('lateral') || rawAngle.includes('profile')) {
      label = customLabel || 'Side Profile';
      icon = 'move-horizontal';
    } else if (rawAngle.includes('top') || rawAngle.includes('dorsal') || rawAngle.includes('overhead')) {
      label = customLabel || 'Overhead (Top)';
      icon = 'compass';
    }

    return { label, icon };
  }

  // 1. Object from DynamoDB/presets
  const objAngle = { angle: 'front', label: 'Front Elevation', url: 'https://example.com/cat.jpg' };
  const res1 = parseAngleMeta(objAngle, 0);
  assert.equal(res1.label, 'Front Elevation');
  assert.equal(res1.icon, 'eye');

  // 2. String representation
  const strAngle = 'Lateral Profile';
  const res2 = parseAngleMeta(strAngle, 1);
  assert.equal(res2.label, 'Lateral Profile');
  assert.equal(res2.icon, 'move-horizontal');

  // 3. Fallback when undefined
  const res3 = parseAngleMeta(undefined, 2);
  assert.equal(res3.label, 'Angle 3');
  assert.equal(res3.icon, 'camera');
});
