import { PASSWORD_RULES, emailSchema, fieldErrors, passwordSchema } from './password-policy';
import { z } from 'zod';

describe('password policy', () => {
  const passes = (id: string, value: string) => PASSWORD_RULES.find(rule => rule.id === id)!.test(value);

  it('checks each rule independently', () => {
    expect(passes('length', 'abcde')).toBeFalse();
    expect(passes('length', 'abcdef')).toBeTrue();
    expect(passes('case', 'abcdef')).toBeFalse();
    expect(passes('case', 'Abcdef')).toBeTrue();
    expect(passes('digit', 'Abcdef')).toBeFalse();
    expect(passes('digit', 'Abcde1')).toBeTrue();
  });

  it('accepts exactly the passwords that satisfy every checklist rule', () => {
    for (const value of ['', 'a', 'abcdef', 'ABCDEF1', 'abcdef1', 'Abcdefg', 'Ab1', 'Ctar1234']) {
      const allRules = PASSWORD_RULES.every(rule => rule.test(value));
      expect(passwordSchema.safeParse(value).success).withContext(value).toBe(allRules);
    }
  });

  it('reports the first failing rule, or required when empty', () => {
    const message = (value: string) => passwordSchema.safeParse(value).error?.issues[0].message;
    expect(message('')).toBe('register.error.passwordRequired');
    expect(message('abc')).toBe('register.error.passwordLength');
    expect(message('abcdef')).toBe('register.error.passwordComplexity');
  });

  it('validates email format', () => {
    expect(emailSchema.safeParse('').error?.issues[0].message).toBe('register.error.email');
    expect(emailSchema.safeParse('somchai').error?.issues[0].message).toBe('auth.error.emailInvalid');
    expect(emailSchema.safeParse(' a@b.co ').data).toBe('a@b.co');
  });

  it('keeps the first error per field', () => {
    const schema = z.object({ a: z.string().min(1, 'a1').min(2, 'a2'), b: z.string().min(1, 'b1') });
    expect(fieldErrors(schema.safeParse({ a: '', b: '' }).error!)).toEqual({ a: 'a1', b: 'b1' });
  });
});
