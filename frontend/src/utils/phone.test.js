import { phoneDigits, phoneKey, phoneProblem, samePhone } from './phone';

describe('phone', () => {
  it('keeps digits only', () => {
    expect(phoneDigits('+91 (981) 000-0002')).toBe('919810000002');
  });
  it('validates length', () => {
    expect(phoneProblem('')).toBe('Enter a phone number.');
    expect(phoneProblem('12345')).toMatch(/valid/);
    expect(phoneProblem('+91 98100 00002')).toBe('');
  });
  it('matches on the last 10 digits', () => {
    expect(phoneKey('+919810000002')).toBe('9810000002');
    expect(samePhone('+91 98100 00002', '9810000002')).toBe(true);
    expect(samePhone('9810000002', '9810000003')).toBe(false);
    expect(samePhone('', '')).toBe(false);
  });
});

describe('formatPhone', () => {
  const { formatPhone } = jest.requireActual('./phone');
  it('groups numbers for reading', () => {
    expect(formatPhone('+919810000002')).toBe('+91 98100 00002');
    expect(formatPhone('9810000002')).toBe('98100 00002');
    expect(formatPhone('+15551234567')).toBe('+1 55512 34567');
    expect(formatPhone('1234567')).toBe('123 456 7');
    expect(formatPhone('')).toBe('');
  });
});
