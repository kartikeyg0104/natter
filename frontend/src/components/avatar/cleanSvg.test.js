import { createAvatar } from '@dicebear/core';
import * as shapes from '@dicebear/shapes';
import * as thumbs from '@dicebear/thumbs';
import { cleanAvatarSvg } from './cleanSvg';

const STYLES = { shapes, thumbs };

function countPaths(svg) {
  return (svg.match(/<path/g) ?? []).length;
}

describe('cleanAvatarSvg', () => {
  it.each(Object.keys(STYLES))('removes the viewbox mask and metadata from %s avatars', (id) => {
    const raw = createAvatar(STYLES[id], { seed: 'zara' }).toString();
    const clean = cleanAvatarSvg(raw);
    expect(clean).not.toMatch(/<metadata|rdf:|id="viewboxMask"/);
    expect(clean.length).toBeLessThanOrEqual(raw.length);
  });

  it.each(Object.keys(STYLES))('keeps every drawn path in %s avatars', (id) => {
    const raw = createAvatar(STYLES[id], { seed: 'ishaan' }).toString();
    expect(countPaths(cleanAvatarSvg(raw))).toBe(countPaths(raw));
  });

  it('keeps the tags balanced, so the SVG still parses', () => {
    const clean = cleanAvatarSvg(createAvatar(thumbs, { seed: 'noor' }).toString());
    const opened = (clean.match(/<g[\s>]/g) ?? []).length;
    const closed = (clean.match(/<\/g>/g) ?? []).length;
    expect(opened).toBe(closed);
    expect(clean).toMatch(/^<svg[\s\S]*<\/svg>$/);
  });

  it('is idempotent and leaves other SVGs alone', () => {
    const plain = '<svg viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>';
    expect(cleanAvatarSvg(plain)).toBe(plain);
    const once = cleanAvatarSvg(createAvatar(shapes, { seed: 'vikram' }).toString());
    expect(cleanAvatarSvg(once)).toBe(once);
  });
});
