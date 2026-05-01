import { gamingPlatforms } from './gaming-platforms';

export type IconSetIcon = { src: string; alt: string };

export type IconSet = {
  slug: string;
  name: string;
  icons: Record<string, IconSetIcon>;
};

export const iconSets: IconSet[] = [gamingPlatforms];

const iconSetMap = new Map(iconSets.map((s) => [s.slug, s]));

const iconLookupMap = new Map(
  iconSets.map((s) => [
    s.slug,
    new Map(Object.entries(s.icons).map(([k, v]) => [k.toLowerCase(), v])),
  ]),
);

export function getIconSetBySlug(slug: string): IconSet | undefined {
  return iconSetMap.get(slug);
}

export function getIcon(setSlug: string, value: string): IconSetIcon | undefined {
  return iconLookupMap.get(setSlug)?.get(value.toLowerCase());
}

export const knownIconSetSlugs = new Set(iconSets.map((s) => s.slug));
