import { z } from 'zod';

export interface PasswordRule {
  id: 'length' | 'case' | 'digit';
  /** i18n key for the checklist label. */
  label: string;
  /** i18n key for the validation error. */
  error: string;
  test: (value: string) => boolean;
}

// Single source of truth for password strength. The live checklist and the
// zod schema both read from here so they can never disagree.
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', label: 'auth.rule.length', error: 'register.error.passwordLength', test: v => v.length >= 6 },
  { id: 'case', label: 'auth.rule.case', error: 'register.error.passwordComplexity', test: v => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: 'digit', label: 'auth.rule.digit', error: 'register.error.passwordComplexity', test: v => /[0-9]/.test(v) },
];

export const passwordSchema = z.string()
  .min(1, 'register.error.passwordRequired')
  .superRefine((value, ctx) => {
    const failed = PASSWORD_RULES.find(rule => !rule.test(value));
    if (failed) ctx.addIssue({ code: z.ZodIssueCode.custom, message: failed.error });
  });

export const emailSchema = z.string()
  .trim()
  .min(1, 'register.error.email')
  .email('auth.error.emailInvalid');

/** Maps zod issues to `{ field: i18nKey }`, keeping the first issue per field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
