import { z } from 'zod';
import { ptAO } from '../locales/pt-AO';

/**
 * Normaliza números de telefone angolanos para o formato E.164 (+2449XXXXXXXX).
 */
export function normalizeAngolanPhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+244')) {
    return `+244${digits.slice(4).replace(/\D/g, '')}`;
  }
  if (digits.startsWith('244') && digits.length === 12) {
    return `+${digits}`;
  }
  const cleanDigits = digits.replace(/\D/g, '');
  if (cleanDigits.length === 9 && cleanDigits.startsWith('9')) {
    return `+244${cleanDigits}`;
  }
  return digits;
}

export function isValidAngolanPhone(input: string): boolean {
  const normalized = normalizeAngolanPhone(input);
  return /^\+2449\d{8}$/.test(normalized);
}

export const angolanPhoneSchema = z
  .string()
  .trim()
  .min(1, ptAO.validation.required)
  .transform((val) => normalizeAngolanPhone(val))
  .refine((val) => /^\+2449\d{8}$/.test(val), {
    message: ptAO.validation.phoneInvalid,
  });

export const emailSchema = z
  .string()
  .trim()
  .min(1, ptAO.validation.required)
  .email(ptAO.validation.emailInvalid)
  .transform((val) => val.toLowerCase());

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, ptAO.validation.fullNameMin)
      .max(100),
    phone: z
      .string()
      .trim()
      .transform((val) => (val ? normalizeAngolanPhone(val) : undefined))
      .refine((val) => !val || /^\+2449\d{8}$/.test(val), {
        message: ptAO.validation.phoneInvalid,
      })
      .optional(),
    email: emailSchema,
    password: z.string().min(8, ptAO.validation.passwordMin),
    confirmPassword: z.string().min(1, ptAO.validation.required),
    role: z.enum(['passenger', 'driver']),
    acceptedLegalTerms: z.boolean().refine((v) => v === true, {
      message: ptAO.validation.consentRequired,
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: ptAO.validation.passwordsMismatch,
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, ptAO.validation.passwordMin),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const emailVerificationSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, ptAO.validation.emailCodeInvalid),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(3, ptAO.validation.fullNameMin).max(100),
  email: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: ptAO.validation.emailInvalid,
    }),
  dataSaverEnabled: z.boolean(),
  inttRegistrationNumber: z.string().trim().max(40).optional(),
});

export const deleteAccountSchema = z.object({
  confirmationText: z
    .string()
    .trim()
    .refine(
      (val): boolean => val === ptAO.profile.deleteAccount.confirmKeyword,
      {
        message: ptAO.validation.deleteKeywordMismatch,
      }
    ),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type EmailVerificationFormValues = z.infer<typeof emailVerificationSchema>;
export type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;
export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;
