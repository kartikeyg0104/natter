import { Transform } from 'class-transformer';

/** Trims string values before validation; leaves other values untouched. */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
