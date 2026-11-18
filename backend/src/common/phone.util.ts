import { BadRequestException } from '@nestjs/common';

export interface NormalisedPhone {
  /** '+' (when the input started with one) followed by the digits */
  phoneNumber: string;
  /** Last 10 digits (or all of them when shorter). Two numbers match when their keys are equal. */
  phoneKey: string;
}

const MIN_DIGITS = 7;
const MAX_DIGITS = 15;
const KEY_DIGITS = 10;

export const INVALID_PHONE_MESSAGE = 'Enter a valid phone number (7 to 15 digits)';

/** Normalises a phone number typed by a person. Throws 400 when it is not 7 to 15 digits. */
export function normalisePhone(input: string): NormalisedPhone {
  const trimmed = (input ?? '').trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
    throw new BadRequestException(INVALID_PHONE_MESSAGE);
  }
  return {
    phoneNumber: (trimmed.startsWith('+') ? '+' : '') + digits,
    phoneKey: digits.slice(-KEY_DIGITS),
  };
}
