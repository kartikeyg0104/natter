import { buildAuthHeader, usernameError } from './authHeader';

describe('buildAuthHeader', () => {
  it('is the raw "Basic name:password" text', () => {
    expect(buildAuthHeader('zara', 'natter123')).toBe('Basic zara:natter123');
  });

  it('is never base64', () => {
    expect(buildAuthHeader('zara', 'natter123')).not.toContain('YWFyYXY6ZGVtbzEyMw==');
  });
});

describe('usernameError', () => {
  it('accepts a plain name', () => {
    expect(usernameError('zara')).toBeNull();
  });

  it('rejects empty, padded and colon names', () => {
    expect(usernameError('')).toMatch(/enter/i);
    expect(usernameError('   ')).toMatch(/enter/i);
    expect(usernameError(' zara')).toMatch(/spaces/i);
    expect(usernameError('a:b')).toMatch(/":"/);
  });
});
