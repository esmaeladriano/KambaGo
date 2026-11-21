import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidAngolanPhone,
  normalizeAngolanPhone,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  emailVerificationSchema,
  deleteAccountSchema,
} from './validation';
import {
  canAccountAccessTrips,
  resolveStatusAfterEmailVerification,
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

test('registerSchema requires email, legal consent, and matching password without requiring phone', () => {
  const emailOnlyValid = registerSchema.safeParse({
    fullName: 'Manuel Domingos',
    email: '  Manuel@KambaGo.ao ',
    password: 'segredo123',
    confirmPassword: 'segredo123',
    role: 'passenger',
    acceptedLegalTerms: true,
  });
  assert.equal(emailOnlyValid.success, true);
  if (emailOnlyValid.success) {
    assert.equal(emailOnlyValid.data.email, 'manuel@kambago.ao');
    assert.equal(emailOnlyValid.data.phone, undefined);
  }

  const withPhoneValid = registerSchema.safeParse({
    fullName: 'Manuel Domingos',
    phone: '923456789',
    email: '  Manuel@KambaGo.ao ',
    password: 'segredo123',
    confirmPassword: 'segredo123',
    role: 'passenger',
    acceptedLegalTerms: true,
  });
  assert.equal(withPhoneValid.success, true);
  if (withPhoneValid.success) {
    assert.equal(withPhoneValid.data.phone, '+244923456789');
    assert.equal(withPhoneValid.data.email, 'manuel@kambago.ao');
  }

  const missingEmail = registerSchema.safeParse({
    fullName: 'Manuel Domingos',
    phone: '923456789',
    email: '',
    password: 'segredo123',
    confirmPassword: 'segredo123',
    role: 'passenger',
    acceptedLegalTerms: true,
  });
  assert.equal(missingEmail.success, false);

  const missingConsent = registerSchema.safeParse({
    fullName: 'Manuel Domingos',
    phone: '923456789',
    email: 'manuel@kambago.ao',
    password: 'segredo123',
    confirmPassword: 'segredo123',
    role: 'passenger',
    acceptedLegalTerms: false,
  });
  assert.equal(missingConsent.success, false);

  const mismatch = registerSchema.safeParse({
    fullName: 'Manuel Domingos',
    phone: '923456789',
    email: 'manuel@kambago.ao',
    password: 'segredo123',
    confirmPassword: 'outra',
    role: 'driver',
    acceptedLegalTerms: true,
  });
  assert.equal(mismatch.success, false);
});

test('loginSchema requires valid email and password', () => {
  const valid = loginSchema.safeParse({
    email: 'Ana@Exemplo.ao',
    password: 'password1',
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.email, 'ana@exemplo.ao');
  }

  assert.equal(
    loginSchema.safeParse({ email: '+244923111222', password: 'password1' }).success,
    false
  );
  assert.equal(
    loginSchema.safeParse({ email: 'invalido', password: 'password1' }).success,
    false
  );
});

test('emailVerificationSchema requires valid email and exactly 6 numeric digits', () => {
  const valid = emailVerificationSchema.safeParse({
    email: 'Ana@KambaGo.ao',
    code: '123456',
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.email, 'ana@kambago.ao');
  }

  assert.equal(
    emailVerificationSchema.safeParse({ email: 'ana@kambago.ao', code: '12ab56' }).success,
    false
  );
  assert.equal(
    emailVerificationSchema.safeParse({ email: 'ana@kambago.ao', code: '12345' }).success,
    false
  );
  assert.equal(
    emailVerificationSchema.safeParse({ email: 'sem-arroba', code: '123456' }).success,
    false
  );
});

test('forgotPasswordSchema accepts valid email and rejects non-email inputs', () => {
  assert.equal(
    forgotPasswordSchema.safeParse({ email: 'ana@kambago.ao' }).success,
    true
  );
  assert.equal(
    forgotPasswordSchema.safeParse({ email: '+244923111222' }).success,
    false
  );
  assert.equal(
    forgotPasswordSchema.safeParse({ email: '' }).success,
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

test('account state rules gate trips and driver approval properly after email verification', () => {
  assert.equal(canAccountAccessTrips('ativa', true), true);
  assert.equal(canAccountAccessTrips('pendente', true), false);
  assert.equal(canAccountAccessTrips('ativa', false), false);
  assert.equal(canAccountAccessTrips('suspensa', true), false);

  assert.equal(resolveStatusAfterEmailVerification('pendente', 'passenger'), 'ativa');
  assert.equal(resolveStatusAfterEmailVerification('pendente', 'driver'), 'pendente');
  assert.equal(resolveStatusAfterEmailVerification('suspensa', 'passenger'), 'suspensa');
});

test('Angolan formatting helpers format Kz and phone cleanly', () => {
  assert.equal(formatAngolanPhoneDisplay('+244923456789'), '+244 923 456 789');
  assert.ok(formatKz(1500).endsWith('Kz'));
});
