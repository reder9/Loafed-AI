import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lambda = require('../custom_message_lambda/index.js');

test('Cognito CustomMessage Lambda - Loafed AI Sign-Up Email', async () => {
  const event = {
    triggerSource: 'CustomMessage_SignUp',
    callerContext: { clientId: '9qibinq77f26bat64unru8q77' },
    request: {
      codeParameter: '123456',
      clientMetadata: { app: 'loafed' }
    },
    response: {}
  };

  const result = await lambda.handler(event);
  assert.equal(result.response.emailSubject, 'Loafed AI -- Your Baker Verification Code');
  assert.match(result.response.emailMessage, /123456/);
  assert.match(result.response.emailMessage, /Feline Posture/);
  assert.match(result.response.emailMessage, /BAKER VERIFICATION/);
});

test('Cognito CustomMessage Lambda - Loafed AI Resend Code', async () => {
  const event = {
    triggerSource: 'CustomMessage_ResendCode',
    callerContext: { clientId: '9qibinq77f26bat64unru8q77' },
    request: {
      codeParameter: '654321',
      clientMetadata: { app: 'loafed' }
    },
    response: {}
  };

  const result = await lambda.handler(event);
  assert.equal(result.response.emailSubject, 'Loafed AI -- Your New Verification Code');
  assert.match(result.response.emailMessage, /654321/);
  assert.match(result.response.emailMessage, /CODE RESEND/);
});

test('Cognito CustomMessage Lambda - Loafed AI Forgot Password', async () => {
  const event = {
    triggerSource: 'CustomMessage_ForgotPassword',
    callerContext: { clientId: '9qibinq77f26bat64unru8q77' },
    request: {
      codeParameter: '999888',
      clientMetadata: { app: 'loafed' }
    },
    response: {}
  };

  const result = await lambda.handler(event);
  assert.equal(result.response.emailSubject, 'Loafed AI -- Password Reset Code');
  assert.match(result.response.emailMessage, /999888/);
  assert.match(result.response.emailMessage, /Reset Your Password/);
});

test('Cognito CustomMessage Lambda - Kalon Beauty Multi-Tenant Email', async () => {
  const event = {
    triggerSource: 'CustomMessage_SignUp',
    callerContext: { clientId: '5gkqhnchdcmd20oko23q9jkgca' },
    request: {
      codeParameter: '777111',
      clientMetadata: { app: 'kalon-beauty' }
    },
    response: {}
  };

  const result = await lambda.handler(event);
  assert.match(result.response.emailSubject, /Kalon Beauty/);
  assert.match(result.response.emailMessage, /777111/);
});

test('Cognito CustomMessage Lambda - Fallback for Unknown App', async () => {
  const event = {
    triggerSource: 'CustomMessage_SignUp',
    callerContext: { clientId: 'unknown_client_id_000' },
    request: {
      codeParameter: '000000',
      clientMetadata: {}
    },
    response: {}
  };

  const result = await lambda.handler(event);
  // Unmodified event returned
  assert.deepEqual(result.response, {});
});
