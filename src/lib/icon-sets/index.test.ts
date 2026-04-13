import { describe, expect, it } from 'vitest';
import { getIcon, getIconSetBySlug, iconSets, knownIconSetSlugs } from './index';

describe('icon set registry', () => {
  it('has at least one icon set', () => {
    expect(iconSets.length).toBeGreaterThan(0);
  });

  it('every icon set has a slug, name, and at least one icon', () => {
    for (const set of iconSets) {
      expect(set.slug).toBeTruthy();
      expect(set.name).toBeTruthy();
      expect(Object.keys(set.icons).length).toBeGreaterThan(0);
    }
  });

  it('every icon has a src path and alt text', () => {
    for (const set of iconSets) {
      for (const [value, icon] of Object.entries(set.icons)) {
        expect(icon.src, `${set.slug}/${value} missing src`).toBeTruthy();
        expect(icon.alt, `${set.slug}/${value} missing alt`).toBeTruthy();
        expect(icon.src).toMatch(/\.svg$/);
      }
    }
  });

  it('knownIconSetSlugs matches iconSets', () => {
    expect(knownIconSetSlugs.size).toBe(iconSets.length);
    for (const set of iconSets) {
      expect(knownIconSetSlugs.has(set.slug)).toBe(true);
    }
  });
});

describe('getIconSetBySlug', () => {
  it('returns the set for a known slug', () => {
    const set = getIconSetBySlug('gaming-platforms');
    expect(set).toBeDefined();
    expect(set!.name).toBe('Gaming Platforms');
  });

  it('returns undefined for an unknown slug', () => {
    expect(getIconSetBySlug('nonexistent')).toBeUndefined();
  });
});

describe('getIcon', () => {
  it('returns icon for a known set and value', () => {
    const icon = getIcon('gaming-platforms', 'PC');
    expect(icon).toBeDefined();
    expect(icon!.src).toBe('/icons/gaming-platforms/pc.svg');
    expect(icon!.alt).toBe('PC');
  });

  it('returns undefined for unknown value in known set', () => {
    expect(getIcon('gaming-platforms', 'Dreamcast')).toBeUndefined();
  });

  it('returns undefined for unknown set', () => {
    expect(getIcon('nonexistent', 'PC')).toBeUndefined();
  });
});
