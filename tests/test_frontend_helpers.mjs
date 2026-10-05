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
