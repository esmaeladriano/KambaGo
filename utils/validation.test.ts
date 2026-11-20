import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidAngolanPhone,
  normalizeAngolanPhone,
  registerSchema,
  loginSchema,
  otpSchema,
  deleteAccountSchema,
} from './validation';
import {
  canAccountAccessTrips,
  resolveStatusAfterPhoneVerification,
  formatKz,
  formatAngolanPhoneDisplay,
} from './accountState';

test('normalizes Angolan mobile numbers to +244 format', () => {
  assert.equal(normalizeAngolanPhone('923 456 789'), '+244923456789');
  assert.equal(normalizeAngolanPhone('244923456789'), '+244923456789');
  assert.equal(normalizeAngolanPhone('+244 923-456-789'), '+244923456789');
  assert.equal(isValidAngolanPhone('+244 912 345 678'), true);
  assert.equal(isValidAngolanPhone('812345678'), false);
  assert.equal(isValidAngolanPhone('12345'), false);
});

test('registerSchema enforces legal consent and matching password', () => {
  const valid = registerSchema.safeParse({
    fullName: 'Manuel Domingos',
    phone: '923456789',
    email: 'manuel@kambago.ao',
    password: 'segredo123',
    confirmPassword: 'segredo123',
    role: 'passenger',
    acceptedLegalTerms: true,
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.phone, '+244923456789');
  }

  const missingConsent = registerSchema.safeParse({
    fullName: 'Manuel Domingos',
    phone: '923456789',
    password: 'segredo123',
    confirmPassword: 'segredo123',
    role: 'passenger',
    acceptedLegalTerms: false,
  });
  assert.equal(missingConsent.success, false);

  const mismatch = registerSchema.safeParse({
    fullName: 'Manuel Domingos',
    phone: '923456789',
    password: 'segredo123',
    confirmPassword: 'outra',
    role: 'driver',
    acceptedLegalTerms: true,
  });
  assert.equal(mismatch.success, false);
});

test('loginSchema accepts Angolan phone or email', () => {
  assert.equal(
    loginSchema.safeParse({ identifier: '+244 923 111 222', password: 'password1' }).success,
    true
  );
  assert.equal(
    loginSchema.safeParse({ identifier: 'ana@exemplo.ao', password: 'password1' }).success,
    true
  );
  assert.equal(
    loginSchema.safeParse({ identifier: 'invalido', password: 'password1' }).success,
    false
  );
});

test('otpSchema requires exactly 6 digits and valid Angolan phone', () => {
  assert.equal(
    otpSchema.safeParse({ phone: '923000111', code: '123456' }).success,
    true
  );
  assert.equal(
    otpSchema.safeParse({ phone: '923000111', code: '12ab56' }).success,
    false
  );
});

test('deleteAccountSchema requires exact ELIMINAR keyword', () => {
  assert.equal(
    deleteAccountSchema.safeParse({ confirmationText: 'ELIMINAR' }).success,
    true
  );
  assert.equal(
    deleteAccountSchema.safeParse({ confirmationText: 'eliminar' }).success,
    false
  );
});

test('account state rules gate trips and driver approval properly', () => {
  assert.equal(canAccountAccessTrips('ativa', true), true);
  assert.equal(canAccountAccessTrips('pendente', true), false);
  assert.equal(canAccountAccessTrips('ativa', false), false);
  assert.equal(canAccountAccessTrips('suspensa', true), false);

  assert.equal(resolveStatusAfterPhoneVerification('pendente', 'passenger'), 'ativa');
  assert.equal(resolveStatusAfterPhoneVerification('pendente', 'driver'), 'pendente');
  assert.equal(resolveStatusAfterPhoneVerification('suspensa', 'passenger'), 'suspensa');
});

test('Angolan formatting helpers format Kz and phone cleanly', () => {
  assert.equal(formatAngolanPhoneDisplay('+244923456789'), '+244 923 456 789');
  assert.ok(formatKz(1500).endsWith('Kz'));
});
