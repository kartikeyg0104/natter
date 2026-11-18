/**
 * Phone numbers, the same rules as the server: digits only (a leading +
 * is kept), 7 to 15 digits. Two numbers are the same person when their
 * last 10 digits match, so "+91 98100 00002" and "9810000002" agree.
 */

/** @param {string} input */
export function phoneDigits(input) {
  return String(input ?? '').replace(/\D/g, '');
}

/** @param {string} input @returns {string} an error sentence, or '' when fine */
export function phoneProblem(input) {
  const digits = phoneDigits(input);
  if (!digits) return 'Enter a phone number.';
  if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number (7 to 15 digits).';
  return '';
}

/** @param {string} input */
export function phoneKey(input) {
  const digits = phoneDigits(input);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** @param {string} a @param {string} b */
export function samePhone(a, b) {
  return Boolean(phoneDigits(a)) && phoneKey(a) === phoneKey(b);
}

/**
 * Readable form of a stored number: "+919810000002" -> "+91 98100 00002",
 * "9810000002" -> "98100 00002". Other lengths are grouped in threes.
 * @param {string} input
 */
export function formatPhone(input) {
  const raw = String(input ?? '').trim();
  const digits = phoneDigits(raw);
  if (!digits) return raw;
  const plus = raw.startsWith('+') ? '+' : '';
  if (digits.length >= 10) {
    const local = digits.slice(-10);
    const country = digits.slice(0, -10);
    const head = country ? `${plus}${country} ` : plus;
    return `${head}${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return plus + digits.replace(/(\d{3})(?=\d)/g, '$1 ');
}
