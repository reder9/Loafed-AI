const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
const appSource = read('static', 'app.js');
const apiSource = read('app.py');
const leaderboardSource = read('static', 'leaderboard.js');
const amplifyHeaders = read('customHttp.yml');

test('grading no longer depends on the age prompt or an age form flag', () => {
  assert.doesNotMatch(appSource, /requestLoafedAgeConfirmation|isAgeConfirmationInProgress|age_confirmed/i);
  assert.doesNotMatch(apiSource, /age_confirmed|18\+ declaration missing/i);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'static', 'age-gate.js')), false);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'static', 'age-gate.css')), false);
});

test('bootstrap keeps non-age setup and removes the obsolete local acknowledgement', () => {
  const bootstrapSource = read('static', 'site-bootstrap.js');
  assert.match(bootstrapSource, /user-logged-in/);
  assert.match(bootstrapSource, /data-async-fonts/);
  assert.match(bootstrapSource, /removeItem\('loafed_age_confirmed_v1'\)/);

  for (const page of ['index.html', 'leaderboard.html', 'loaf.html']) {
    const html = read('static', page);
    assert.match(html, /\/static\/site-bootstrap\.js/);
    assert.doesNotMatch(html, /age-gate\.(?:js|css)/i);
  }
});

test('leaderboard handlers comply with strict script CSP and Cognito origin is valid', () => {
  assert.doesNotMatch(leaderboardSource, /\bon(?:click|error|load|change|input|submit)\s*=\s*["']/i);
  assert.match(leaderboardSource, /\.addEventListener\('click'/);
  assert.doesNotMatch(amplifyHeaders, /cognito-idp\.\*\.amazonaws\.com/);
  assert.match(amplifyHeaders, /connect-src 'self' https:\/\/cognito-idp\.us-east-1\.amazonaws\.com/);
  assert.doesNotMatch(apiSource, /cognito-idp\.\*\.amazonaws\.com/);
  assert.match(apiSource, /connect-src 'self' https:\/\/cognito-idp\.us-east-1\.amazonaws\.com/);
});
